<script lang="ts">
	import { Text, interactivity } from '@threlte/extras';
	import { T, forwardEventHandlers, useThrelte } from '@threlte/core';
	import { BufferGeometry, DoubleSide, LatheGeometry, LineDashedMaterial, Vector3 } from 'three';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
	import LightsCamera from './LightsCamera.svelte';

	import {
		genLineSegment,
		setAxisLimits,
		toGrid,
		points2ArrayX,
		genGridLines2,
		saveTextToFile,
		converXYtoString
	} from '$lib/mathUtils';
	import { type Complex, Matrix2DxComplex, waistSize, beamProps } from '$lib/gcomplex';
	import Source from '$lib/source';
	import type GaussOp from '$lib/gaussop';
	import Lens from './Lens.svelte';

	export let gpin: GaussOp[] = [];
	export let source: Source = new Source(1.07, 1, 0, 3);

	interactivity();
	const n = 1;
	let titletext = 'Gaussian Beam Tracer';

	const zstart = 0;
	const zinc = 1;

	let zend = calcZend(gpin);

	function calcZend(gp: GaussOp[]) {
		let zend = 0;
		gp.forEach((op) => {
			if (op.type == 'distance') zend += op.value;
		});
		return zend;
	}

	// define slider values for input waist, wavelength, lens focal length, and lens position
	let waistvalue = source.waist;
	let wavelvalue = source.wavelength;

	// displayed chart in pixels
	const gridWidth = 250; // total grid width = 2 * gridWidth
	const horizDivs = 5;
	const gridHeight = 75; // total grid height = 2 * gridHeight
	const vertDivs = 5;

	// set up labels for horizontal axis
	const horizlabels: number[] = [];
	for (let i = 0; i <= 2 * gridWidth; i += gridWidth / vertDivs) {
		horizlabels.push(i);
	}

	function genHorizLabels() {}

	const verticallabels: number[] = [];
	for (let i = -gridHeight; i <= gridHeight; i += gridHeight / horizDivs) {
		verticallabels.push(i);
	}

	$: zScale = [
		[zstart, calcZend(gpin)],
		[-gridWidth, gridWidth]
	];

	// Calculate start values for maxY and scales and ratios
	let zrtemp = source.rayleighDistance();
	let maxY = source.waist * Math.sqrt(1 + (zend / zrtemp) * (zend / zrtemp)); // max waist size needed for scale chart
	maxY = setAxisLimits(0, maxY, zinc)[1]; // round up to nearest logical chart scale
	maxY = 5;
	// set scale constants for w and z
	let scaleZ = (2 * gridWidth) / (zend - zstart); // scale about -gridWith
	const scaleY = gridHeight / maxY; // scale about center of plot 0 in Y axis

	let xoffset = -2;

	interface WaistPosi {
		waist: number;
		yscaled: number;
		zscaled: number;
	}

	// main function for computing lens segs
	function genLineSegs(
		gp: GaussOp[],
		waist: number,
		wavelength: number
	): [Float32Array, Float32Array] {
		let tsource = source.clone();
		tsource.wavelength = wavelength;
		tsource.waist = waist;

		let zrj = tsource.rayleighDistance();
		let p: Complex = { real: 0, imag: zrj };

		const zsave: number[] = [];
		const wsave: number[] = [];
		const z: number[] = [];
		const w: number[] = [];

		let zbase = 0; // local beam path used to find waist
		let ztrack = 0; // this tracks the beam path in world z
		let offset = 0;
		gp.forEach((op) => {
			switch (op.type) {
				case 'distance':
					for (let d = 0; d <= op.value; d += zinc) {
						p.real = d + offset;
						ztrack = zbase + d;
						let wsize = waistSize(p, tsource, n);
						zsave.push(ztrack);
						wsave.push(wsize);
						z.push(toGrid(ztrack, zScale));
						w.push(wsize * scaleY);
					}
					offset = p.real; // do this in case the next surface is distance and not a lens
					break;
				case 'lens':
					p = Matrix2DxComplex(op.toMatrix2D(), p);
					const props = beamProps(p, tsource, n);
					//[znew, minwaist, roc, wz];
					offset = props[0];
					break;
			}
			zbase = ztrack;
		});

		//saveTextToFile(converXYtoString(zsave, wsave), 'z-w.txt');
		//const temp = Math.max(...w);
		//maxY = setAxisLimits(0, temp)[1];
		const [plussegs, negsegs] = points2ArrayX(xoffset, w, z);
		return [plussegs, negsegs];
	}

	// main function for computing lens segs
	function findMinWaists(gp: GaussOp[], waist: number, wavelength: number): WaistPosi[] {
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
		wavelength: number,
		zs: number[][]
	): [number[], number[][], string[], number[], number[][]] {
		let tsource = source.clone();
		tsource.wavelength = wavelength;
		tsource.waist = waist;

		let zrj = tsource.rayleighDistance();
		let p: Complex = { real: 0, imag: zrj };

		let zbase = 0;
		let ztrack = 0;

		/*
      radius={1.5}
			position={[lensdata[0][index][0], lensdata[0][index][1], lensdata[0][index][2]]}
			color={'purple'}
			efl={100}
    */
		let radius: number[] = [];
		let lensPosi: number[][] = [];
		let lensColor: string[] = [];
		let efls: number[] = [];
		let eflLabelPosi: number[][] = [];

		gp.forEach((op) => {
			switch (op.type) {
				case 'distance':
					p.real += op.value;
					ztrack = zbase + op.value;
					break;
				case 'lens':
					p = Matrix2DxComplex(op.toMatrix2D(), p);
					const rtemp = waistSize(p, tsource, n);
					radius.push(rtemp * 1.15);
					lensPosi.push([0, 0, toGrid(ztrack, zs)]);
					lensColor.push(!op.color ? 'purple' : op.color);
					efls.push(op.value);
					eflLabelPosi.push([xoffset, 1.2 * rtemp * scaleY, toGrid(ztrack, zs)]);
					break;
			}
			zbase = ztrack;
		});
		console.log('<Tracer> Pos', lensPosi[2][2]);
		return [radius, lensPosi, lensColor, efls, eflLabelPosi];
	}

	// line data to plot beam trajectory + some data for final waist marker
	$: linedata = genLineSegs(gpin, waistvalue, wavelvalue);

	// find min waists for labeling
	$: wps = findMinWaists(gpin, waistvalue, wavelvalue);

	// generate lens for plot
	$: lenses = generateLensData(gpin, waistvalue, wavelvalue, [
		[zstart, calcZend(gpin)],
		[-gridWidth, gridWidth]
	]);
	console.log(lenses);

	// generate grid lines
	$: gridLines = genGridLines2(xoffset, gridWidth, horizDivs, gridHeight, vertDivs);

	// location of waist on grid in gridunits
	$: zWaistGridUnits = toGrid(0, zScale);

	const showefls = true;
	const showwaists = true;

	function genTypeMap(gp: GaussOp[], mapType: string) {
		const gpmap: number[] = [];

		gpin.forEach((element, index) => {
			if (element.type === mapType) {
				gpmap.push(index);
			}
		});
		return gpmap;
	}

	let lineWidth = 0.005;

	function onLineEnter(n: number) {
		lineWidth = 0.01;
	}

	function onLineLeave(n: number) {
		lineWidth = 0.005;
	}

	function onclickLine() {
		xoffset += 5;
	}

	/** @param {KeyboardEvent} e */
	let gpindex = 0;
	function onKeyDown(e: KeyboardEvent) {
		if (/[0,2,3,5,7]/.test(e.key)) {
			gpindex = parseInt(e.key);
		}
		switch (e.key) {
			case 's':
				xoffset += 5;
				break;
			case 'w':
				xoffset -= 5;
				break;
			case 'r':
				xoffset = 0;
				break;

			case 'a':
				gpin[gpindex].value -= 10;
				if (gpin[gpindex].value < 0) gpin[gpindex].value = 0;
				zend = calcZend(gpin);
				scaleZ = (2 * gridWidth) / (zend - zstart);
				zScale = zScale = [
					[zstart, calcZend(gpin)],
					[-gridWidth, gridWidth]
				];
				lenses = generateLensData(gpin, waistvalue, wavelvalue, zScale);
				//console.log('<Tracer> Z2 Pos', lenses[1][2][2]);
				break;

			case 'd':
				gpin[gpindex].value += 10;
				zend = calcZend(gpin);
				scaleZ = (2 * gridWidth) / (zend - zstart);
				zScale = zScale = [
					[zstart, calcZend(gpin)],
					[-gridWidth, gridWidth]
				];
				lenses = generateLensData(gpin, waistvalue, wavelvalue, zScale);
				//console.log('<Tracer> Z2 Pos', lenses[1][2][2]);
				break;

			default:
				break;
		}
	}
</script>

<svelte:window on:keydown|preventDefault={onKeyDown} />

<!-- Add Camera and Lights-->
<LightsCamera scale={0.4} />

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

<!-- lenses  -->
{#if lenses.length > 0}
	{#each { length: lenses[0].length } as _, index}
		<Lens
			radius={lenses[0][index]}
			{scaleY}
			{scaleZ}
			position={[lenses[1][index][0], lenses[1][index][1], lenses[1][index][2]]}
			color={lenses[2][index]}
			efl={lenses[3][index]}
		/>
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
					fontSize={8}
					anchorX={'center'}
					anchorY={'top'}
				/>
			</T.Mesh>
		</T.Group>
	{/each}
{/if}

<!-- background plane - in this case along Y-Z aaxis -->
<T.Mesh position={[100, 0, 0]} rotation={[0, 0, 0]} visible={true}>
	<T.BoxGeometry args={[1, 2 * gridHeight + 50, 2 * gridWidth + 100]} />
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
	<!-- add axis label for Waist at X0 -->
	<T.Mesh
		position={[xoffset, source.waist * scaleY, zWaistGridUnits]}
		rotation.y={-Math.PI / 2}
		visible={false}
	>
		<Text
			text={waistvalue.toFixed(2)}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'top'}
		/>
	</T.Mesh>

	<!-- add axis label for (-)Waist at X0 -->
	<T.Mesh
		position={[xoffset, -source.waist * scaleY, zWaistGridUnits]}
		rotation.y={-Math.PI / 2}
		visible={false}
	>
		<Text
			text={'-' + waistvalue.toFixed(2)}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'bottom'}
		/>
	</T.Mesh>

	<!-- horizontal axis labels -->
	{#each horizlabels as hl}
		<T.Mesh position={[xoffset, -gridHeight, hl - 250]} rotation.y={-Math.PI / 2}>
			<Text
				text={(hl / scaleZ).toFixed(0)}
				color={0x000000}
				fontSize={8}
				anchorX={'center'}
				anchorY={'top'}
			/>
		</T.Mesh>
	{/each}

	{#each verticallabels as vl}
		<T.Mesh position={[xoffset, vl, -gridWidth - 5]} rotation.y={-Math.PI / 2}>
			<Text
				text={(vl / scaleY).toFixed(2)}
				color={0x000000}
				fontSize={8}
				anchorX={'right'}
				anchorY={'middle'}
			/>
		</T.Mesh>
	{/each}
</T.Group>

<!-- Title -->
<T.Mesh position={[xoffset + 100, gridHeight, -gridWidth]} rotation.y={-Math.PI / 2} visible={true}>
	<Text text={titletext} color={'black'} fontSize={12} anchorX={'left'} anchorY={'bottom'} />
</T.Mesh>
