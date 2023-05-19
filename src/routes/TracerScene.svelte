<script lang="ts">
	import { OrbitControls, Text, interactivity } from '@threlte/extras';
	import { T } from '@threlte/core';
	import { BufferGeometry, DoubleSide, LatheGeometry, LineDashedMaterial, Vector3 } from 'three';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
	import { Editable } from '@threlte/theatre';

	import {
		genLineSegment,
		genLensLathe,
		setAxisLimits,
		toGrid,
		points2ArrayX,
		genGridLines2
	} from '$lib/mathUtils';
	import { type Complex, Matrix2DxComplex, waistSize, beamProps } from '$lib/gcomplex';
	import Source from '$lib/source';
	import GaussOp from '$lib/gaussop';
	import Lens from './Lens.svelte';

	import { forwardEventHandlers } from '@threlte/core';
	import { useCursor } from '@threlte/extras';
	import { spring } from 'svelte/motion';
	const component = forwardEventHandlers();

	const { target } = interactivity();
	target.set(document.getElementById('int-target') ?? undefined);

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
	console.log('🚀 ~ gridWidth:', gridWidth);
	console.log('🚀 ~ scaleZ main:', scaleZ);
	const scaleY = gridHeight / maxY; // scale about center of plot 0 in Y axis
	console.log('🚀 ~ gridHeight:', gridHeight);
	console.log('🚀 ~ scaleY main:', scaleY);

	const xoffset = -2;

	interface WaistPosi {
		waist: number;
		yscaled: number;
		zscaled: number;
	}

	// define Gaussian beam operations
	let gp: GaussOp[] = [];
	gp.push(new GaussOp('distance', 300));
	gp.push(new GaussOp('lens', 150, 1, 'green')); // index 1
	//
	gp.push(new GaussOp('distance', 150));
	gp.push(new GaussOp('distance', 350));
	// OR
	//gp.push(new GaussOp('distance', 500));
	//
	gp.push(new GaussOp('lens', 350, 1, 'yellow')); // index 4
	gp.push(new GaussOp('distance', 800));
	gp.push(new GaussOp('lens', 400, 1, 'red')); // index 6
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
	): [number[][], LatheGeometry[], number[], number[][], string[], number[]] {
		let tsource = source.clone();
		tsource.wavelength = wavelength;
		tsource.waist = waist;

		let zrj = tsource.rayleighDistance();
		let p: Complex = { real: 0, imag: zrj };

		let zbase = 0;
		let ztrack = 0;

		let lensLatheGeo: LatheGeometry[] = [];
		let lensPosi: number[][] = [];
		let efls: number[] = [];
		let eflLabelPosi: number[][] = [];
		let lensColor: string[] = [];
		let opacity: number[] = [];

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

					let R = radius * 1.4;
					let ct = 2 * radius;

					if (op.value < 0) {
						R = -R;
						ct = 1;
						opacity.push(0.25);
					} else {
						opacity.push(1.0);
					}

					lensLatheGeo.push(genLensLathe(radius * 1.15, R, -R, ct, scaleZ, scaleY));
					lensPosi.push([0, 0, toGrid(ztrack, zScale) - (2.5 * radius) / scaleZ / 2]);
					efls.push(op.value);
					eflLabelPosi.push([xoffset, 1.2 * radius * scaleY, toGrid(ztrack, zScale)]);
					lensColor.push(!op.color ? 'purple' : op.color);
					break;
			}
			zbase = ztrack;
		});
		console.log(opacity);
		return [lensPosi, lensLatheGeo, efls, eflLabelPosi, lensColor, opacity];
	}

	// line data to plot beam trajectory + some data for final waist marker
	$: linedata = genLineSegs(waistvalue, wavelvalue);

	// find min waists for labeling
	$: wps = findMinWaists(waistvalue, wavelvalue);

	// generate lens for plot
	$: lensdata = generateLensData(gp, waistvalue, wavelvalue);

	// generate grid lines
	let gridLines = genGridLines2(xoffset, gridWidth, 6, gridHeight, 5);

	// location of waist on grid in gridunits
	$: zWaistGridUnits = toGrid(0, zScale);

	const showefls = true;
	const showwaists = true;

	let lensScale: [number, number, number] = [1, 1, 1];
	let backupcolor = 'black';
	const gplensmap: number[] = [];
	const gplinemap: number[] = [];

	gp.forEach((element, index) => {
		if (element.type === 'lens') {
			gplensmap.push(index);
		} else {
			gplinemap.push(index);
		}
	});

	function onEnter(n: number) {
		console.log('enter index is ', n);
		backupcolor = gp[gplensmap[n]].color;
		gp[gplensmap[n]].color = 'black';
	}

	function onLeave(n: number) {
		console.log('leave index is ', n);
		gp[gplensmap[n]].color = backupcolor;
	}

	let lineWidth = 0.005;
	let lineColor = 0x0000ff;

	function onLineEnter(n: number) {
		lineWidth = 0.01;
	}
	function onLineLeave(n: number) {
		lineWidth = 0.005;
	}
</script>

<Lens radius={2} {scaleY} {scaleZ} position={[0, 0, 0]} efl={-100} color={'red'} />
<Lens radius={2} {scaleY} {scaleZ} position={[0, 0, 50]} efl={100} color={'red'} />

<!-- Add Camera -->
<T.OrthographicCamera
	makeDefault
	position={[-100, 0, 0]}
	scale={0.5}
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
		geometry={genLineSegment(linedata[0])}
		material={new LineMaterial({ color: 0x0000ff, linewidth: lineWidth })}
		on:pointerenter={onLineEnter}
		on:pointerleave={onLineLeave}
	/>
	<T
		is={Line2}
		geometry={genLineSegment(linedata[1])}
		material={new LineMaterial({ color: 0x0000ff, linewidth: lineWidth })}
		on:pointerenter={onLineEnter}
		on:pointerleave={onLineLeave}
	/>
</T.Mesh>

<!--
  {#each gp as g, index}
	{#if g.type === 'lens'}
		<Lens
			radius={1.5}
			{scaleY}
			{scaleZ}
			position={[0, 0, -250 + index * 10]}
			color={g.color}
			efl={g.value}
		/>
	{/if}
{/each}
-->

<!-- lenses 	 [lensPosi, lensLatheGeo, efls, eflLabelPosi, lensColor]; -->
{#if lensdata[0].length > 0}
	{#each { length: lensdata[0].length } as _, index}
		<T.Mesh
			geometry={lensdata[1][index]}
			position={[lensdata[0][index][0], lensdata[0][index][1], lensdata[0][index][2]]}
			rotation={[Math.PI / 2, 0, 0]}
			scale={lensScale}
			on:pointerenter={() => onEnter(index)}
			on:pointerleave={() => onLeave(index)}
			on:click={() => onLeave(index)}
			let:ref
		>
			<!--			<Editable name="Lens" scale />-->
			<T.MeshPhongMaterial
				color={lensdata[4][index]}
				opacity={lensdata[5][index]}
				transparent
				side={DoubleSide}
				shininess={100}
			/>
		</T.Mesh>
		{#if showefls}
			<T.Mesh
				position={[lensdata[3][index][0], lensdata[3][index][1], lensdata[3][index][2]]}
				rotation.y={-Math.PI / 2}
			>
				<Text
					text={'f = ' + lensdata[2][index].toFixed(0) + ' mm'}
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
<T.Mesh position={[100, 0, 0]} rotation={[0, 0, 0]} visible={true}>
	<T.BoxGeometry args={[1, 2 * gridHeight + 50, 2 * gridWidth + 50]} />
	<T.MeshStandardMaterial side={DoubleSide} color={'white'} transparent opacity={1} />
</T.Mesh>

<!-- add background grid lines -->
<T.Mesh position={[100, 0, 0]} visible={true}>
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
<T.Group position={[100, 0, 0]} visible={true}>
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
<T.Mesh position={[xoffset + 100, gridHeight, -gridWidth]} rotation.y={-Math.PI / 2} visible={true}>
	<!--	<Editable name="title" scale visible />-->
	<Text text={titletext} color={'black'} fontSize={12} anchorX={'left'} anchorY={'bottom'} />
</T.Mesh>
