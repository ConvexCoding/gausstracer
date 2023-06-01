<script lang="ts">
	import { Text, interactivity } from '@threlte/extras';
	import { T } from '@threlte/core';
	import { BufferGeometry, DoubleSide, LineDashedMaterial, Object3D, Vector3 } from 'three';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
	import LightsCamera from './LightsCamera.svelte';

	import {
		calcZend,
		genLineSegs,
		findMinWaists,
		findWaistSizes,
		generateLensData,
		genLineSegArray,
		genTypeMap
	} from '$lib/gtrace';

	import {
		genLineSegment,
		setAxisLimits,
		toGrid,
		genGridLines2,
		toWorld,
		genLensLathe
	} from '$lib/mathUtils';
	import Source from '$lib/source';
	import GaussOp from '$lib/gaussop';
	import { getMeshIndex } from '$lib/meshUtils';

	export let gpin: GaussOp[] = [];
	export let source: Source = new Source(1.07, 1, 0, 3);

	const titletext = 'Gaussian Beam Tracer';
	const showwaists = true;
	const showSolidLines = false;
	const showSegLines = true;
	let showEFLs = true;
	let showDistances = false;

	interactivity();

	// **************************************
	// set canvas parameters and initial grid values
	const gridWidth = 250; // total grid width = 2 * gridWidth
	const horizDivs = 5;
	const gridHeight = 75; // total grid height = 2 * gridHeight
	const vertDivs = 5;
	let xoffset = -2; // use this offset to make sure labels are visible

	// **************************************
	// calculate z or optical axis parameters
	const zstart = 0; // assume model begins at z = 0
	let zend = calcZend(gpin); // find end of model
	const zinc = 1; // plot beam path every 1 mm
	let scaleZ = (2 * gridWidth) / (zend - zstart); // scale about -gridWith
	$: zScale = [
		[zstart, calcZend(gpin)],
		[-gridWidth, gridWidth]
	]; // zScale is used to convert z to grid coordinates

	const zLabels: number[] = []; // setup z axis labels scheme
	for (let i = 0; i <= 2 * gridWidth; i += (2 * gridWidth) / vertDivs) {
		zLabels.push(i);
	}

	// **************************************
	// calculate y axis parameters (waist size)
	let maxY = 5; // manually set max y for now, it will be updated later
	let scaleY = gridHeight / maxY; // scale about center of plot 0 in Y axis
	upDateCanvas();

	const yLabels: number[] = [];
	for (let i = -gridHeight; i <= gridHeight; i += gridHeight / horizDivs) {
		yLabels.push(i);
	}

	let lineWidth = 0.005;
	let lineColor = 0x0000ff;

	// if gauss beam line is one continous line
	// this function is designed to find out which
	// line segment is click or maybe it is more
	// accurate to say which air gap is clicked.
	let gpDistIndex = -1; // if user presses number key change the gp index
	function findIndex(z: number): number {
		let index = -1;
		let A = 0;
		for (let i = 0; i < gpin.length; i++) {
			if (gpin[i].type === 'distance') {
				const B = A + gpin[i].value;
				if (z > A && z < B) {
					index = i;
					//console.log(A, B, i);
					break;
				} else {
					//console.log(A, B, i);
					A += gpin[i].value;
				}
			} else {
				//console.log('not distance', i);
			}
		}
		return index;
	}

	function onclickLine(e: MouseEvent) {
		if (gpLensIndex > -1) {
			gpin[gpLensIndex].color = backupcolor;
			gpLensIndex = -1;
		}
		const keys = Object.keys(e);
		if (keys.includes('pointOnLine')) {
			const point = e['pointOnLine' as keyof MouseEvent] as unknown as Vector3;
			const trackz = toWorld(point.z, zScale);
			const newIndex = findIndex(trackz);
			if (newIndex === gpDistIndex) {
				gpDistIndex = -1;
				lineColor = 0x0000ff;
			} else {
				gpDistIndex = newIndex;
				lineColor = 0x00ff00;
			}
		}
	}

	function ondblclickLine(e: MouseEvent) {
		console.log('double click');
		if (gpLensIndex > -1) {
			gpin[gpLensIndex].color = backupcolor;
			gpLensIndex = -1;
		}
		const keys = Object.keys(e);
		if (keys.includes('pointOnLine')) {
			const point = e['pointOnLine' as keyof MouseEvent] as unknown as Vector3;
			const trackz = toWorld(point.z, zScale);
			const newIndex = findIndex(trackz);
			const dsum = gpin[newIndex].value;
			gpin[newIndex].value = trackz - distanceTo(gpin, newIndex);
			gpin.splice(newIndex + 1, 0, new GaussOp('lens', 3000, 1, 'blue'));
			gpin.splice(newIndex + 2, 0, new GaussOp('distance', dsum - gpin[newIndex].value));
			console.log('double click line', trackz, newIndex);
		}
	}

	function distanceTo(gps: GaussOp[], index: number): number {
		let dist = 0;
		for (let i = 0; i < index; i++) {
			if (gps[i].type === 'distance') {
				dist += gps[i].value;
			}
		}
		return dist;
	}

	let gpLensIndex = -1;
	let backupcolor = 'white';
	function onclickLens(e: MouseEvent) {
		if (Object.keys(e).includes('object')) {
			const objInfo = e['object' as keyof MouseEvent] as unknown as Object3D;
			if (Object.keys(objInfo).includes('name')) {
				const name = objInfo['name' as keyof Object3D] as unknown as string;
				if (name.includes('Lens')) {
					lineColor = 0x0000ff;
					const index = parseInt(name.slice(-1));
					// this happens if another lens is clicked
					// when one is already active
					if (index > 0 && gpLensIndex > 0) {
						gpin[gpLensIndex].color = backupcolor;
					}
					// no swap colors for activated lens or
					// deactivate lens and reset colors
					if (index === gpLensIndex) {
						gpin[index].color = backupcolor;
						gpLensIndex = -1;
						gpDistIndex = -1;
					} else {
						gpLensIndex = index;
						gpDistIndex = -1;
						backupcolor = gpin[index].color;
						gpin[index].color = 'white';
					}
					//console.log('final index', index, typeof index);
				}
			}
		}
	}

	/** @param {KeyboardEvent} e */
	function onKeyDown(e: KeyboardEvent) {
		if (gpDistIndex === -1 && gpLensIndex === -1) {
			// quick exit - nothing selected
			return;
		}
		if (gpDistIndex >= 0 && gpDistIndex < gpin.length) {
			switch (e.key) {
				case 'a':
				case 'ArrowLeft':
					gpin[gpDistIndex].value -= 10;
					upDateCanvas();
					break;

				case 'd':
				case 'ArrowRight':
					gpin[gpDistIndex].value += 10;
					upDateCanvas();
					break;

				default:
					break;
			}
		}
		if (gpLensIndex >= 0 && gpLensIndex < gpin.length) {
			switch (e.key) {
				case 'a':
				case 'ArrowLeft':
					gpin[gpLensIndex].value -= 5;
					upDateCanvas();
					break;

				case 'd':
				case 'ArrowRight':
					gpin[gpLensIndex].value += 5;
					upDateCanvas();
					break;

				default:
					break;
			}
		}
	}

	// update canvas scaling factors and other parameters
	function upDateCanvas() {
		zend = calcZend(gpin);
		scaleZ = (2 * gridWidth) / (zend - zstart);
		zScale = zScale = [
			[zstart, calcZend(gpin)],
			[-gridWidth, gridWidth]
		];
		const tempY = Math.max(...findWaistSizes(gpin, source));
		const yLimit = setAxisLimits(0, tempY)[1];
		//console.log(tempY, yLimit);
		maxY = yLimit;
		scaleY = gridHeight / maxY;
	}

	// line data to plot beam trajectory + some data for final waist marker
	$: linedata = genLineSegs(gpin, source, scaleY, zScale, zinc);
	$: [psegs, nsegs] = genLineSegArray(gpin, source, scaleY, zScale, zinc);

	$: distanceMap = genTypeMap(gpin, 'distance');
	// find min waists for labeling
	$: wps = findMinWaists(gpin, source, scaleY, zScale);

	// generate grid lines
	$: gridLines = genGridLines2(xoffset, gridWidth, horizDivs, gridHeight, vertDivs);

	// location of waist on grid in gridunits
	$: zWaistGridUnits = toGrid(0, zScale);

	// generate lens for plot
	$: [radius, lensPosi, gop, lensIndex, eflLabelPosi, geos] = generateLensData(
		gpin,
		source,
		scaleZ,
		scaleY,
		zScale
	);

	function onLineEnter(e: MouseEvent) {
		const index = getMeshIndex(e, 'line');
		showEFLs = false;
		showDistances = true;
		lineWidth = 0.01;
		console.log('line enter', index);
	}

	function onLineLeave(e: MouseEvent) {
		showEFLs = true;
		showDistances = false;
		lineWidth = 0.005;
	}

	function centerLine(lineseg: Float32Array, yoffset: number): [number, number, number] {
		const center = lineseg.length / 3 / 2;
		const centerIndex = Math.floor(center);
		console.log('center', center, centerIndex);
		console.log(
			'center triplet',
			lineseg[centerIndex * 3],
			lineseg[centerIndex * 3 + 1],
			lineseg[centerIndex * 3 + 2]
		);
		return [
			lineseg[centerIndex * 3],
			lineseg[centerIndex * 3 + 1] + yoffset,
			lineseg[centerIndex * 3 + 2]
		];
	}
</script>

<svelte:window on:keydown|preventDefault={onKeyDown} />

<!-- Add Camera and Lights-->
<LightsCamera scale={0.6} />

<!-- plus & negative waist profile lines -->
{#if showSolidLines}
	<T.Mesh>
		<T
			is={Line2}
			geometry={genLineSegment(linedata[0])}
			material={new LineMaterial({ color: lineColor, linewidth: lineWidth })}
			on:pointerenter={onLineEnter}
			on:pointerleave={onLineLeave}
			on:click={onclickLine}
		/>
		<T
			is={Line2}
			geometry={genLineSegment(linedata[1])}
			material={new LineMaterial({ color: lineColor, linewidth: lineWidth })}
			on:pointerenter={onLineEnter}
			on:pointerleave={onLineLeave}
			on:click={onclickLine}
		/>
	</T.Mesh>
{/if}

<!-- plus & negative waist profile lines -->
{#if showSegLines}
	{#each { length: psegs.length } as _, index}
		<T.Mesh>
			<T
				is={Line2}
				geometry={genLineSegment(psegs[index])}
				material={new LineMaterial({ color: lineColor, linewidth: lineWidth })}
				name={'line' + index}
				on:pointerenter={onLineEnter}
				on:pointerleave={onLineLeave}
				on:click={onclickLine}
				on:dblclick={ondblclickLine}
			/>
			<T
				is={Line2}
				geometry={genLineSegment(nsegs[index])}
				material={new LineMaterial({ color: lineColor, linewidth: lineWidth })}
				name={'line' + index}
				on:pointerenter={onLineEnter}
				on:pointerleave={onLineLeave}
				on:click={onclickLine}
			/>
		</T.Mesh>
		{#if showDistances}
			<T.Mesh position={centerLine(psegs[index], 5)} rotation.y={-Math.PI / 2}>
				<Text
					text={'d=' + gpin[distanceMap[index]].value}
					color={0x000000}
					fontSize={8}
					anchorX={'center'}
					anchorY={'bottom'}
				/>
			</T.Mesh>
		{/if}
	{/each}
{/if}

<!-- lenses  	[radius, lensPosi, gop, eflLabelPosi, geos] -->
{#if radius.length > 0}
	{#each { length: radius.length } as _, index}
		<T.Mesh
			geometry={geos[index]}
			name={'Lens' + lensIndex[index].toString()}
			position={lensPosi[index]}
			rotation={[Math.PI / 2, 0, 0]}
			on:click={onclickLens}
			let:ref
		>
			<T.MeshPhongMaterial
				color={gop[index].color}
				opacity={1.0}
				transparent
				side={DoubleSide}
				shininess={100}
			/>
		</T.Mesh>
		{#if showEFLs}
			<T.Mesh position={eflLabelPosi[index]} rotation.y={-Math.PI / 2}>
				<Text
					text={'f' + lensIndex[index].toString() + ' = ' + gop[index].value.toFixed(0) + ' mm'}
					color={0x000000}
					fontSize={8}
					anchorX={'center'}
					anchorY={'bottom'}
				/>
			</T.Mesh>
		{/if}
		<!--
		<Lens
			radius={lenses[0][index]}
			{scaleY}
			{scaleZ}
			position={[lenses[1][index][0], lenses[1][index][1], lenses[1][index][2]]}
			gop={lenses[2][index]}
		/>
    -->
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

			<T.Mesh position={[xoffset, -wp.yscaled - 6, wp.zscaled]} rotation.x={0}>
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
			text={source.waist.toFixed(2)}
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
			text={'-' + source.waist.toFixed(2)}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'bottom'}
		/>
	</T.Mesh>

	<!-- horizontal axis labels -->
	{#each zLabels as hl}
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

	<!-- vertical axis labels -->
	{#each yLabels as vl}
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
