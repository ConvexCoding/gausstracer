<script lang="ts">
	import { OrbitControls } from '@threlte/extras';
	import { T } from '@threlte/core';
	import { Text } from '@threlte/extras';
	import { BufferGeometry, DoubleSide, LatheGeometry, LineDashedMaterial, Vector3 } from 'three';
	import {
		genLineSegment,
		genSolidLens,
		setAxisLimits,
		toGrid,
		points2ArrayX,
		genGridLines2
	} from '$lib/mathUtils';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

	import { type Complex, Matrix2DxComplex, waistSize, beamProps } from '../lib/gcomplex';
	import Source from '../lib/source';
	import GaussOp from '../lib/gaussop';

	const w0 = 1;
	const λ = 1.07;
	const msq = 3;
	const n = 1;
	const zstart = 0;
	const zend = 2000;
	const zinc = 1;

	let titletext = 'Gaussian Beam Tracer';

	const source: Source = new Source(w0, λ, 0, msq);
	// define slider values for input waist, wavelength, lens focal length, and lens position
	let waistvalue = w0;
	let wavelvalue = λ;

	// displayed chart in pixels
	const gridWidth = 250; // total grid width = 2 * gridWidth
	const gridHeight = 75; // total grid height = 2 * gridHeight

	const zScale = [
		[zstart, zend],
		[-gridWidth, gridWidth]
	];

	// Calculate start values for maxY and scales and ratios
	let zrtemp = source.rayleighDistance();
	let maxY = w0 * Math.sqrt(1 + (zend / zrtemp) * (zend / zrtemp)); // max waist size needed for scale chart
	maxY = setAxisLimits(0, maxY, zinc)[1]; // round up to nearest logical chart scale
	maxY = 3; // override for now

	// set scale constants for w and z
	const scaleZ = (2 * gridWidth) / (zend - zstart); // scale about -gridWith
	const scaleY = gridHeight / maxY; // scale about center of plot 0 in Y axis

	const xoffset = -2;

	interface WaistPosi {
		waist: number;
		yscaled: number;
		zscaled: number;
	}

	// define Gaussian beam operations
	let gp: GaussOp[] = [];
	gp.push(new GaussOp('distance', 300));
	gp.push(new GaussOp('lens', 150, 1));
	gp.push(new GaussOp('distance', 150));
	gp.push(new GaussOp('distance', 350));
	//gp.push(new GaussOp('distance', 500));
	gp.push(new GaussOp('lens', 350, 1));
	gp.push(new GaussOp('distance', 800));
	gp.push(new GaussOp('lens', 400, 1));
	gp.push(new GaussOp('distance', 400));
	gp.push(new GaussOp('distance', 20));

	// main function for computing lens segs
	function genLineSegs(waist: number, wavelength: number): [Float32Array, Float32Array] {
		let tsource = source.clone();
		tsource.wavelength = wavelength;
		tsource.waist = waist;

		let zrj = tsource.rayleighDistance();
		let p: Complex = { real: 0, imag: zrj };

		const z: number[] = [];
		const w: number[] = [];

		let zbase = 0; // local beam path used to find waist
		let ztrack = 0; // this tracks the beam path in world z

		gp.forEach((op) => {
			switch (op.type) {
				case 'distance':
					for (let d = 0; d <= op.value; d += zinc) {
						p.real += zinc;
						ztrack = zbase + d;
						let wsize = waistSize(p, tsource, n);
						z.push(toGrid(ztrack, zScale));
						w.push(wsize * scaleY);
					}
					break;
				case 'lens':
					p = Matrix2DxComplex(op.toMatrix2D(), p);
					break;
			}
			zbase = ztrack;
		});

		const [plussegs, negsegs] = points2ArrayX(xoffset, w, z);
		return [plussegs, negsegs];
	}

	// main function for computing lens segs
	function findMinWaists(waist: number, wavelength: number): WaistPosi[] {
		let tsource = source.clone();
		tsource.wavelength = wavelength;
		tsource.waist = waist;

		let zrj = tsource.rayleighDistance();
		let p: Complex = { real: 0, imag: zrj };

		let zbase = 0;
		let ztrack = 0;

		let wps: WaistPosi[] = [];

		gp.forEach((op) => {
			switch (op.type) {
				case 'distance':
					p.real += op.value;
					ztrack = zbase + op.value;
					break;
				case 'lens':
					//  return [znew, minwaist, roc, wz];
					p = Matrix2DxComplex(op.toMatrix2D(), p);
					const [znew, waist, roc, radius] = beamProps(p, tsource, n);
					const zreal = ztrack - znew;
					if (Math.abs(roc) < 500 && zreal > 0 && zreal < 2020) {
						let w: WaistPosi = {
							waist: waist,
							yscaled: waist * scaleY,
							zscaled: toGrid(zreal, zScale)
						};
						wps.push(w);
					}
					break;
			}
			zbase = ztrack;
		});
		return wps;
	}

	// generate lens items needed to plot
	function generateLensData(
		gp: GaussOp[],
		waist: number,
		wavelength: number
	): [number[][], LatheGeometry[], number[], number[][]] {
		let tsource = source.clone();
		tsource.wavelength = wavelength;
		tsource.waist = waist;

		let zrj = tsource.rayleighDistance();
		let p: Complex = { real: 0, imag: zrj };

		let zbase = 0;
		let ztrack = 0;

		let lenss: LatheGeometry[] = [];
		let lensposi: number[][] = [];
		let efls: number[] = [];
		let eflposi: number[][] = [];

		gp.forEach((op) => {
			switch (op.type) {
				case 'distance':
					p.real += op.value;
					ztrack = zbase + op.value;
					break;
				case 'lens':
					p = Matrix2DxComplex(op.toMatrix2D(), p);
					const radius = waistSize(p, tsource, n);

					// this looks a little funny but due to unusual scaling
					// make the thickness be half the diameter
					// arbitrarily use 4 as radii, but this needs to be a
					// parametric calculation in future
					// genSolidLens(half_diameter, R1, R2, ct, scaleZ, scaleY)

					lenss.push(genSolidLens(radius * 1.15, 4, -4, 1.5 * radius, scaleZ, scaleY));
					lensposi.push([0, 0, toGrid(ztrack, zScale) - (1.5 * radius) / scaleZ / 2]);
					efls.push(op.value);
					eflposi.push([xoffset, 1.2 * radius * scaleY, toGrid(ztrack, zScale)]);
					break;
			}
			zbase = ztrack;
		});

		return [lensposi, lenss, efls, eflposi];
	}

	// line data to plot beam trajectory + some data for final waist marker
	$: data = genLineSegs(waistvalue, wavelvalue);

	// find min waists for labeling
	$: wps = findMinWaists(waistvalue, wavelvalue);

	// generate lens for plot
	// This needs help on how to make this code
	// a little tighter
	$: lensdata = generateLensData(gp, waistvalue, wavelvalue);
	$: lensposi = lensdata[0];
	$: lenses = lensdata[1];
	$: efls = lensdata[2];
	$: eflposi = lensdata[3];

	// generate grid lines
	let gridLines = genGridLines2(xoffset, gridWidth, 6, gridHeight, 5);

	// location of waist on grid in gridunits
	$: zWaistGridUnits = toGrid(0, zScale);

	const showefls = true;
	const showwaists = true;
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
{#if lenses.length > 0}
	{#each { length: lenses.length } as _, index}
		<T.Mesh
			geometry={lenses[index]}
			position={[lensposi[index][0], lensposi[index][1], lensposi[index][2]]}
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
		{#if showefls}
			<T.Mesh
				position={[eflposi[index][0], eflposi[index][1], eflposi[index][2]]}
				rotation.y={-Math.PI / 2}
			>
				<Text
					text={'f = ' + efls[index].toFixed(0) + ' mm'}
					color={0x000000}
					fontSize={8}
					anchorX={'center'}
					anchorY={'bottom'}
				/>
			</T.Mesh>
		{/if}
	{/each}
{/if}

<!-- waist position and size -->
{#if wps.length > 0 && showwaists}
	{#each wps as wp}
		<T.Group visible={true}>
			<T.Mesh>
				<T.Line
					geometry={new BufferGeometry().setFromPoints([
						new Vector3(xoffset, -35, wp.zscaled),
						new Vector3(xoffset, -wp.yscaled, wp.zscaled)
					])}
					material={new LineDashedMaterial({ color: 'red' })}
				/>
			</T.Mesh>

			<T.Mesh position={[xoffset, -wp.waist - 10, wp.zscaled]} rotation.x={0}>
				<T.ConeGeometry args={[3, 12]} />
				<T.MeshStandardMaterial color={'red'} />
			</T.Mesh>

			<!-- Label mid Line -->
			<T.Mesh position={[xoffset, -35, wp.zscaled]} rotation.y={-Math.PI / 2} visible={true}>
				<Text
					text={'Waist: ' + wp.waist.toFixed(3) + ' mm'}
					color={'black'}
					fontSize={10}
					anchorX={'center'}
					anchorY={'top'}
				/>
			</T.Mesh>
		</T.Group>
	{/each}
{/if}

<!-- background plane - in this case along Y-Z aaxis -->
<T.Mesh position={[0, 0, 0]} rotation={[0, 0, 0]} visible={true}>
	<T.BoxGeometry args={[1, 2 * gridHeight + 50, 2 * gridWidth + 50]} />
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
	<T.Mesh position={[xoffset, w0 * scaleY, zWaistGridUnits]} rotation.y={-Math.PI / 2}>
		<Text
			text={waistvalue.toFixed(2) + ' mm'}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'top'}
		/>
	</T.Mesh>

	<!-- add axis label for (-)Ymin at X0 -->
	<T.Mesh position={[xoffset, -w0 * scaleY, zWaistGridUnits]} rotation.y={-Math.PI / 2}>
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
