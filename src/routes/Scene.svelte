<script lang="ts">
	import { OrbitControls } from '@threlte/extras';
	import { Canvas, T, useFrame } from '@threlte/core';
	import { Text } from '@threlte/extras';
	import { BufferGeometry, DoubleSide, LatheGeometry, LineDashedMaterial, Vector3 } from 'three';
	import {
		genGridLines,
		genLineSegment,
		genSolidLens,
		setAxisLimits,
		toGrid,
		toWorld
	} from '$lib/mathUtils';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

	import { type Complex, Matrix2DxComplex, waistSize, beamProps } from '../lib/gcomplex';

	const w0 = 1;
	const λ = 1;
	const msq = 3;
	const n = 1;
	const zstart = 0;
	const zend = 2000;
	const zinc = 20;

	// define slider values for input waist, wavelength, lens focal length, and lens position
	let waistvalue = w0;
	let wavelvalue = λ;
	let lensf = 150;
	let lensz = 300;

	// displayed chart in pixels
	const gridWidth = 250; // total grid width = 2 * gridWidth
	const gridHeight = 75; // total grid height = 2 * gridHeight

	const zScale = [
		[zstart, zend],
		[-gridWidth, gridWidth]
	];

	// Calculate start values for maxY and scales and ratios
	let zrtemp = (Math.PI * waistvalue * waistvalue) / wavelvalue;
	let maxY = w0 * Math.sqrt(1 + (zend / zrtemp) * (zend / zrtemp)); // max waist size needed for scale chart
	maxY = setAxisLimits(0, maxY, zinc)[1]; // round up to nearest logical chart scale
	maxY = 3; // override for now

	// set scale constants for w and z
	let scaleZ = 2 * gridWidth;
	let ratioZ = (zend - zstart) / scaleZ;
	let scaleY = 2 * gridHeight;
	let ratioY = gridHeight / maxY;
	let scaleY0 = (w0 * scaleY) / maxY / 2;

	const xoffset = -2;

	interface tracesegs {
		begin: number;
		end: number;
		inc: number;
		efl: number;
		isLens: boolean;
	}

	// build up lens and trace arrays
	const maininc = 1;
	let traces: tracesegs[] = [];
	let lenses: LatheGeometry[] = [];
	let lenspositions: number[][] = [];

	let lens1posi = 300;
	traces.push({ begin: 0, end: lens1posi, inc: maininc, efl: 0, isLens: false });
	traces.push({ begin: traces[0].end, end: 800, inc: maininc, efl: 150, isLens: true });
	traces.push({ begin: traces[1].end, end: 1550, inc: maininc, efl: 350, isLens: true });
	traces.push({ begin: traces[2].end, end: 2000, inc: maininc, efl: 400, isLens: true });

	lenses.push(genSolidLens(1.2, 4, -4, 2, ratioZ, ratioY));
	lenses.push(genSolidLens(2.5, 4, -4, 3.4, ratioZ, ratioY));
	lenses.push(genSolidLens(2.5, 4, -4, 3.4, ratioZ, ratioY));

	lenspositions.push([0, 0, toGrid(traces[1].begin, zScale) - (2 / 2) * ratioZ]);
	lenspositions.push([0, 0, toGrid(traces[2].begin, zScale) - (3.4 / 2) * ratioZ]);
	lenspositions.push([0, 0, toGrid(traces[3].begin, zScale) - (3.4 / 2) * ratioZ]);

	let titletext = 'Gaussian Beam TRacer';
	let numlens = 4;
	let inclens = 1;
	let framecounter = 0;

	// main function for computing lens segs
	function genLineSegs(
		waist: number,
		wavelength: number,
		eflin: number,
		lp: number
	): [Float32Array, Float32Array, number, number, number] {
		const z: number[] = [];
		const w: number[] = [];
		const wp: number[] = [];

		traces[1].efl = lensf;
		traces[0].end = lensz;
		traces[1].begin = lensz;

		lenspositions[0] = [0, 0, toGrid(lensz, zScale) - (2 / 2) * ratioZ];

		let zrj = (Math.PI * waist * waist * n) / ((wavelength * msq) / 1000);
		let p2: Complex = { real: 0, imag: zrj };
		let zoffset = 0;
		let waistlast = 0;
		let waistlastposition = 0;

		//console.log('numlens', numlens)
		let lastz = 0;
		for (let index = 0; index < numlens; index++) {
			const trace = traces[index];
			if (index > 0) {
				const mlens = { A: 1, B: 0, C: -1 / trace.efl, D: 1 };
				p2 = Matrix2DxComplex(mlens, p2);
				const [znew, minwaist, roc, wzsize] = beamProps(p2, wavelength, msq, n);
				waistlast = minwaist;
				waistlastposition = trace.begin - znew;
				zrj = (Math.PI * minwaist * minwaist * n) / ((wavelength * msq) / 1000);
				zoffset = traces[index - 1].end - znew;
			}
			for (let i = trace.begin; i <= trace.end; i += trace.inc) {
				lastz = i;
				z.push((i * scaleZ) / (zend - zstart) - scaleZ / 2);
				p2 = { real: i - zoffset, imag: zrj };
				let wposi = waistSize(p2, wavelength, msq, n);
				wp.push((wposi * scaleY) / 2 / maxY);
				w.push((wposi * scaleY) / 2 / maxY);
			}
		}
		if (lastz < 1950) {
			for (let i = lastz; i <= 2000; i += zinc) {
				lastz = i;
				z.push((i * scaleZ) / (zend - zstart) - scaleZ / 2);
				p2 = { real: i - zoffset, imag: zrj };
				let wposi = waistSize(p2, wavelength, msq, n);
				wp.push((wposi * scaleY) / 2 / maxY);
				w.push((wposi * scaleY) / 2 / maxY);
			}
		}

		const numPoints = w.length;
		let pluslinesegs = new Float32Array(w.length * 3);
		let neglinesegs = new Float32Array(w.length * 3);
		for (let i = 0; i < numPoints; i++) {
			pluslinesegs[i * 3] = xoffset; // set x-coordinate to 0
			pluslinesegs[i * 3 + 1] = wp[i]; // set y-coordinate to w[i]
			pluslinesegs[i * 3 + 2] = z[i]; // set z-coordinate to z[i]
			neglinesegs[i * 3] = xoffset; // set x-coordinate to 0
			neglinesegs[i * 3 + 1] = -w[i]; // set y-coordinate to w[i]
			neglinesegs[i * 3 + 2] = z[i]; // set z-coordinate to z[i]
		}
		return [
			pluslinesegs,
			neglinesegs,
			waistlast,
			toGrid(waistlastposition, zScale),
			(waistlast * gridHeight) / maxY
		];
	}

	// line data to plot beam trajectory + some data for final waist marker
	$: data = genLineSegs(waistvalue, wavelvalue, lensf, lensz);

	// generate grid lines
	let gridLines = genGridLines(xoffset, gridWidth, gridHeight, 5);

	// location of waist on grid in gridunits
	$: zWaistGridUnits = toGrid(0, zScale);
</script>

<!-- Add Camera -->
<T.OrthographicCamera
	makeDefault
	position={[-100, 0, 0]}
	scale={1}
	on:create={({ ref }) => {
		ref.lookAt(0, 0, 0);
	}}
>
	<OrbitControls enableZoom enableRotate={true} enablePan={true} />
</T.OrthographicCamera>

<!-- Add Lights -->
<T.DirectionalLight position={[-100, 0, 0]} intensity={0.75} />
<T.DirectionalLight position={[0, 100, 0]} intensity={0.2} />
<T.DirectionalLight position={[0, -100, 0]} intensity={0.2} />
<T.AmbientLight intensity={0.5} />

<!-- plus & negative waist profile lines -->
<T.Mesh>
	<T
		is={Line2}
		geometry={genLineSegment(data[0])}
		material={new LineMaterial({ color: 0x0000ff, linewidth: 0.005 })}
	/>
	<T
		is={Line2}
		geometry={genLineSegment(data[1])}
		material={new LineMaterial({ color: 0x0000ff, linewidth: 0.005 })}
	/>
</T.Mesh>

<!-- lenses -->

{#if numlens > 0}
	{#each { length: numlens - 1 } as _, index}
		<T.Mesh
			geometry={lenses[index]}
			position={[lenspositions[index][0], lenspositions[index][1], lenspositions[index][2]]}
			rotation={[Math.PI / 2, 0, 0]}
			let:ref
		>
			<T.MeshPhongMaterial
				color={'red'}
				opacity={0.4}
				transparent
				side={DoubleSide}
				shininess={100}
			/>
		</T.Mesh>
	{/each}
{/if}

<!-- background plane - in this case along Y-Z aaxis -->
<T.Mesh position={[0, 0, 0]} rotation={[0, 0, 0]} visible={true}>
	<T.BoxGeometry args={[1, scaleY + 50, scaleZ + 50]} />
	<T.MeshStandardMaterial side={DoubleSide} color={'white'} transparent opacity={1} />
</T.Mesh>

<!-- add background grid lines -->
<T.Mesh visible={true}>
	{#each gridLines as line}
		<T
			is={Line2}
			geometry={genLineSegment(line)}
			material={new LineMaterial({ color: 0x00aaaa, linewidth: 0.001 })}
		/>
	{/each}
	<T
		is={Line2}
		geometry={genLineSegment(gridLines[0])}
		material={new LineMaterial({ color: 0x000000, linewidth: 0.002 })}
	/>
</T.Mesh>

<!-- add various axis labels -->
<T.Group visible={true}>
	<!-- add axis label for Ymax at Xmax -->
	<T.Mesh position={[xoffset, gridHeight, gridWidth]} rotation={[0, -Math.PI / 2, 0]}>
		<Text
			text={maxY.toFixed(2) + ' mm'}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'bottom'}
		/>
	</T.Mesh>

	<!-- add axis label for (-)Ymin at Xmax -->
	<T.Mesh position={[xoffset, -gridHeight, gridWidth]} rotation.y={-Math.PI / 2}>
		<Text
			text={'-' + maxY.toFixed(2) + ' mm'}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'top'}
		/>
	</T.Mesh>

	<!-- add axis label for Ymax at X0 -->
	<T.Mesh position={[xoffset, scaleY0, zWaistGridUnits]} rotation.y={-Math.PI / 2}>
		<Text
			text={waistvalue.toFixed(2) + ' mm'}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'top'}
		/>
	</T.Mesh>

	<!-- add axis label for (-)Ymin at X0 -->
	<T.Mesh position={[xoffset, -scaleY0, zWaistGridUnits]} rotation.y={-Math.PI / 2}>
		<Text
			text={'-' + waistvalue.toFixed(2) + ' mm'}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'bottom'}
		/>
	</T.Mesh>

	<!-- z0 Distance Label -->

	<T.Mesh position={[xoffset, 0, -gridWidth]} rotation.y={-Math.PI / 2} visible={false}>
		<Text
			text={'z = ' + zstart.toFixed(0) + ' mm -->'}
			color={0x000000}
			fontSize={8}
			anchorX={'left'}
			anchorY={'bottom'}
		/>
	</T.Mesh>

	<!-- Max z Distance Label -->
	<T.Mesh position={[xoffset, 0, gridWidth]} rotation.y={-Math.PI / 2} visible={true}>
		<Text
			text={'z = ' + zend.toFixed(0) + ' mm -->'}
			color={0x000000}
			fontSize={8}
			anchorX={'right'}
			anchorY={'bottom'}
		/>
	</T.Mesh>
</T.Group>

<!-- Title -->
<T.Mesh position={[xoffset, gridHeight, -gridWidth]} rotation.y={-Math.PI / 2} visible={true}>
	<Text text={titletext} color={'black'} fontSize={12} anchorX={'left'} anchorY={'bottom'} />
</T.Mesh>

<!-- Add label and arrow to last waist position and size -->
{#if numlens === 2 || numlens === 4}
	<T.Group visible={true}>
		<T.Mesh>
			<T.Line
				geometry={new BufferGeometry().setFromPoints([
					new Vector3(xoffset, -35, data[3]),
					new Vector3(xoffset, -data[4], data[3])
				])}
				material={new LineDashedMaterial({ color: 'red' })}
			/>
		</T.Mesh>

		<T.Mesh position={[xoffset, -data[4] - 6, data[3]]} rotation.x={0}>
			<T.ConeGeometry args={[3, 12]} />
			<T.MeshStandardMaterial color={'red'} />
		</T.Mesh>

		<!-- Label mid Line -->
		<T.Mesh position={[xoffset, -35, data[3]]} rotation.y={-Math.PI / 2} visible={true}>
			<Text
				text={'Waist: ' + data[2].toFixed(3) + ' mm'}
				color={'black'}
				fontSize={10}
				anchorX={'center'}
				anchorY={'top'}
			/>
		</T.Mesh>
	</T.Group>
{/if}
