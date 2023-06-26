<script lang="ts">
	import { Text, interactivity, TransformControls, OrbitControls } from '@threlte/extras';
	import { T, useThrelte } from '@threlte/core';
	import { BufferGeometry, DoubleSide, LineDashedMaterial, Object3D, Vector3 } from 'three';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
	import LightsCamera from './LightsCamera.svelte';

	import {
		calcZend,
		findMinWaists,
		findWaistSizes,
		gaussProfile,
		generateLensData,
		genLineSegArray,
		genTypeMap
	} from '$lib/gtrace';

	import { genLineSegment, setAxisLimits, toGrid, genGridLines2, toWorld } from '$lib/mathUtils';
	import Source from '$lib/source';
	import GaussOp from '$lib/gaussop';
	import { combineAdjacentDistances, addLens } from '$lib/gaussop';
	import { getMeshIndex, getExtraKeyInfo, centerLine } from '$lib/meshUtils';
	import { modalStore, type ModalComponent, type ModalSettings } from '@skeletonlabs/skeleton';
	import HelpModal from './HelpModal.svelte';
	import ModifyOpModal from './ModifyOpModal.svelte';
	import GaussGraphModal from './GaussGraphModal.svelte';

	export let gpin: GaussOp[] = [];
	export let source: Source = new Source(1.07, 1, 0, 3);
	export let resetView = 0;

	const titletext = 'Gaussian Beam Tracer';
	const showwaists = true;
	const showSegLines = true;
	const offsetbackground = 2;

	interactivity();

	const { camera } = useThrelte();

	// **************************************
	// set canvas parameters and initial grid values
	const gridWidth = 250; // total grid width = 2 * gridWidth
	const horizDivs = 5;
	const gridHeight = 75; // total grid height = 2 * gridHeight
	const vertDivs = 5;

	let camLoc: [number, number, number] = [-300, 0, 0];
	let orbTarget: [number, number, number] = [0, 0, 0];
	let camTarget: Vector3 = new Vector3(0, 0, 0);
	let camScale: number = 0.6;

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
	maxY = calcZend(gpin) * 0.5;
	scaleY = gridHeight / maxY;
	upDateCanvas();

	const yLabels: number[] = [];
	for (let i = -gridHeight; i <= gridHeight; i += gridHeight / horizDivs) {
		yLabels.push(i);
	}

	let lineWidth = 0.005;
	let lineColor = 0x0000ff;

	let gpDistIndex = -1; // if user presses number key change the gp index
	let gpLensIndex = -1;
	let gpDragIndex = -1;
	let backupcolor = 'white';

	// *****************************************************************

	function onclickLine(e: MouseEvent) {
		const isCtrlKeyPressed = getExtraKeyInfo(e, 'ctrlKey');
		const isAltKeyPressed = getExtraKeyInfo(e, 'altKey');
		let newIndex = getMeshIndex(e, 'Line');
		// check for activated lens and deactivate
		if (gpLensIndex > -1) {
			gpin[gpLensIndex].color = backupcolor;
			gpLensIndex = -1;
		}

		// CtrlClick Line - use modal to change line properties
		if (isCtrlKeyPressed && newIndex > -1) {
			changeOpModal(e, 'Line', 'Distance');
			return;
		}

		// AltClick Line - add lens at current pointer loc
		if (isAltKeyPressed && newIndex > -1) {
			console.log('AltClick Line');
			if (gpLensIndex > -1) {
				gpin[gpLensIndex].color = backupcolor;
				gpLensIndex = -1;
			}
			const keys = Object.keys(e);
			if (keys.includes('pointOnLine')) {
				const point = e['pointOnLine' as keyof MouseEvent] as unknown as Vector3;
				const trackz = toWorld(point.z, zScale);
				addLens(gpin, trackz);
				upDateCanvas();
			}
			return;
		}

		// Click Line - activate line for user mod if keyboard
		if (newIndex > -1) {
			if (newIndex === gpDistIndex) {
				gpDistIndex = -1;
				//gpin[newIndex].tag = false;
				lineColor = 0x0000ff;
			} else {
				//console.log(newIndex);
				//gpin[newIndex].tag = true;
				gpDistIndex = newIndex;
				lineColor = 0xff0000;
			}
		}
	}

	function onLineEnter(e: MouseEvent) {
		const index = getMeshIndex(e, 'Line');
		gpin[index].tag = true;
		lineWidth = 0.01;
	}

	function onLineLeave(e: MouseEvent) {
		const index = getMeshIndex(e, 'Line');
		gpin[index].tag = false;
		lineWidth = 0.005;
	}

	// *****************************************************************

	function onClickLens(e: MouseEvent) {
		const isCtrlKeyPressed = getExtraKeyInfo(e, 'ctrlKey');
		const isAltKeyPressed = getExtraKeyInfo(e, 'altKey');
		const index = getMeshIndex(e, 'Lens');
		// here for activating lens for keyboard changes
		if (index > -1 && !isAltKeyPressed && !isCtrlKeyPressed) {
			lineColor = 0x0000ff;
			// this happens if another lens is clicked
			// when one is already active
			if (index > 0 && gpLensIndex > 0) {
				gpin[gpLensIndex].color = backupcolor;
			}
			// now swap colors for activated lens or
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
		}
		// here for deleting lens
		if (index > -1 && !isAltKeyPressed && isCtrlKeyPressed) {
			changeOpModal(e, 'Lens', 'EFL');
			upDateCanvas();
		}

		if (index > -1 && isAltKeyPressed && !isCtrlKeyPressed) {
			deleteLens(gpin, index);
			combineAdjacentDistances(gpin);
			upDateCanvas();
		}
	}

	function onLensEnter(e: MouseEvent) {
		const index = getMeshIndex(e, 'Lens');
		gpin[index].tag = true;
		//console.log('line enter', index, lensMap[index]);
	}

	function onLensLeave(e: MouseEvent) {
		const index = getMeshIndex(e, 'Lens');
		gpin[index].tag = false;
		//console.log('line enter', index, lensMap[index]);
	}

	// *****************************************************************

	function onKeyDown(e: KeyboardEvent) {
		if ($modalStore[0]) return;
		console.log('ekey=', e.key);
		e.preventDefault();

		// escape key to reset activated elements
		if (e.key === 'Escape') {
			if (gpDragIndex > -1) {
				gpin[gpDragIndex].color = backupcolor;
				gpDragIndex = -1;
			}
		}

		// recombine adjacent distance ops
		if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
			combineAdjacentDistances(gpin);
			upDateCanvas();
			const modal: ModalSettings = {
				type: 'alert',
				title: 'Recombination Complete',
				body: 'Eliminated adjacent distances if needed.'
			};
			modalStore.trigger(modal);
		}

		// Add lens op to end of system
		if (e.ctrlKey && (e.key === 'L' || e.key === 'l')) {
			gpin.push(new GaussOp('lens', 100, 1, 'orangered', false));
			console.log('add lens');
			upDateCanvas();
		}

		// Add distance op to end of system
		if (e.ctrlKey && (e.key === 'D' || e.key === 'd')) {
			gpin.push(new GaussOp('distance', 100, 1, 'blue', false));
			upDateCanvas();
		}

		// here if user has selected a distance - incrementally changes distance
		if (gpDistIndex >= 0 && gpDistIndex < gpin.length) {
			switch (e.key) {
				case 'a':
				case 'ArrowLeft':
					gpin[gpDistIndex].value -= 5;
					upDateCanvas();
					break;

				case 'd':
				case 'ArrowRight':
					gpin[gpDistIndex].value += 5;
					upDateCanvas();
					break;

				default:
					break;
			}
		}
		// here if user selected lens - incrementally changes efl
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

		const PI = Math.PI;
		// return to z-right, y-up orientation
		if (e.ctrlKey && (e.key === 'o' || e.key === 'O')) {
			resetControls(-1);
		}

		// remove last element in gp op array
		if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
			const modal: ModalSettings = {
				type: 'confirm',
				title: 'Please Confirm - Remove Last Op?',
				body: 'Are you sure you want to remove last lens or distance?',
				response: (r: boolean) => {
					if (r) {
						gpin = gpin.slice(0, -1);
						upDateCanvas();
					}
				}
			};
			modalStore.trigger(modal);
		}

		// here for resetting system
		if (e.ctrlKey && e.altKey && (e.key === 'r' || e.key === 'R')) {
			const modal: ModalSettings = {
				type: 'confirm',
				title: 'Please Confirm - Reset System?',
				body: 'Are you sure you wish to reset system?',
				response: (r: boolean) => {
					if (r) {
						gpin = [];
						gpin.push(new GaussOp('distance', 100, 1, 'blue', false));
						upDateCanvas();
					}
				}
			};
			modalStore.trigger(modal);
		}
	}

	// *****************************************************************

	function deleteLens(gops: GaussOp[], index: number): void {
		const modal: ModalSettings = {
			type: 'confirm',
			// Data
			title: 'Please Confirm - Delete Lens?',
			body: 'Are you sure you wish to delete lens?',
			// TRUE if confirm pressed, FALSE if cancel pressed
			response: (r: boolean) => {
				console.log('response:', r);
				if (r) {
					gops.splice(index, 1);
					gpLensIndex = -1;
					gpDistIndex = -1;
				}
			}
		};
		modalStore.trigger(modal);
	}

	function showHelp() {
		const c: ModalComponent = { ref: HelpModal };
		const modal: ModalSettings = {
			type: 'component',
			component: c,
			title: 'Help - Keys & Functions',
			body: 'Help - keys and functions',
			response: (r: any) => {
				console.log('help responded');
			}
		};
		modalStore.trigger(modal);
	}

	function showGaussGraph() {
		const c: ModalComponent = { ref: GaussGraphModal };
		const modal: ModalSettings = {
			type: 'component',
			component: c,
			title: 'Gauss Graphical Analysis',
			body: 'Beam Radius & Power Density at Image Plane',
			value: ['waistLabel', waistSizes[waistSizes.length - 1]],
			response: (r: any) => {
				console.log('gauss graph exited');
			}
		};
		modalStore.trigger(modal);
	}

	function changeOpModal(e: MouseEvent, type: string, valueName: string) {
		const index = getMeshIndex(e, type);
		const c: ModalComponent = { ref: ModifyOpModal };
		const modal: ModalSettings = {
			type: 'component',
			component: c,
			title: 'Modify ' + type + ' Properties',
			body: 'Modify ' + type + ' then either accept or cancel.',
			value: [
				'gopefl',
				gpin[index].value.toString(),
				'gopcolor',
				gpin[index].color,
				'valueName',
				valueName
			],
			response: (r: any) => {
				if (r) {
					//console.log('response', r, typeof r);
					gpin[index].value = parseFloat(r.value);
					gpin[index].color = r.color;
				} else {
					//console.log('cancel response');
				}
			}
		};
		modalStore.trigger(modal);
	}

	// *****************************************************************

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
		maxY = zend * 0.5;
		scaleY = gridWidth / maxY;
	}

	$: [psegs, nsegs] = genLineSegArray(gpin, source, scaleY, zScale, zinc);

	$: distanceMap = genTypeMap(gpin, 'distance');
	$: lensMap = genTypeMap(gpin, 'lens');
	$: lineMap = genTypeMap(gpin, 'distance');

	// find min waists for labeling
	$: wps = findMinWaists(gpin, source, scaleY, zScale);

	$: waistSizes = findWaistSizes(gpin, source);

	// generate grid lines
	$: gridLines = genGridLines2(0, gridWidth, horizDivs, gridHeight, vertDivs);

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

	let dragInitialPosition = 0;
	let dragcolor = 'lightblue';
	function onDblClickLens(e: MouseEvent) {
		const isCtrlKeyPressed = getExtraKeyInfo(e, 'ctrlKey');
		const isAltKeyPressed = getExtraKeyInfo(e, 'altKey');
		if (gpDragIndex < 0 && getMeshIndex(e, 'Lens') > 0) {
			console.log('first double click on lens');
			gpDragIndex = getMeshIndex(e, 'Lens');
			dragcolor = gpin[gpDragIndex].color;
			gpin[gpDragIndex].color = 'lightblue';
			upDateCanvas();
			dragInitialPosition = 0;
			for (let i = 0; i < gpDragIndex - 1; i++) {
				if (gpin[i].type === 'distance') {
					dragInitialPosition += gpin[i].value;
				}
			}
			//.log(gpDragIndex, dragcolor);
		} else {
			console.log('second double click on lens', dragcolor);
			gpin[gpDragIndex].color = dragcolor;
			gpDragIndex = -1;
			dragInitialPosition = 0;
			upDateCanvas();
		}
	}

	function canvasMove(e: WheelEvent) {
		const point = e['point' as keyof MouseEvent] as unknown as Vector3;
		const zloc = toWorld(point.z, zScale);
		if (gpDragIndex >= 0 && gpDragIndex < gpin.length) {
			const moveto = zloc - dragInitialPosition;
			gpin[gpDragIndex - 1].value = moveto >= 0 ? moveto : 0;
			upDateCanvas();
		}
	}

	function canvasWheel(e: WheelEvent) {
		const objInfo = e['nativeEvent' as keyof MouseEvent] as unknown as Object3D;
		const delta = objInfo['deltaY' as keyof Object] as unknown as number;
		if (gpLensIndex >= 0 && gpLensIndex < gpin.length) {
			if (delta < 0) {
				gpin[gpLensIndex].value += 1;
			} else {
				gpin[gpLensIndex].value -= 1;
			}
		}
		if (gpDistIndex >= 0 && gpDistIndex < gpin.length) {
			if (delta < 0) {
				gpin[gpDistIndex].value += 5;
			} else {
				gpin[gpDistIndex].value -= 5;
			}
		}
		upDateCanvas();
	}

	function resetControls(test: number) {
		camTarget = new Vector3(0, 0, 0);
		camLoc = [-300, 0, 0];
		camera.current.position.set(camLoc[0], camLoc[1], camLoc[2]);
		camera.current.lookAt(camTarget.x, camTarget.y, camTarget.z);
		upDateCanvas();
	}
	$: resetControls(resetView);

	const gdata = gaussProfile(3.0, 10);
</script>

<svelte:window on:keydown={onKeyDown} />

<!-- Add Camera and Lights-->
<LightsCamera zoomOn={true} {camLoc} {camTarget} {camScale} />

<!-- plus & negative waist profile lines -->
{#if showSegLines}
	{#each { length: psegs.length } as _, index}
		<T.Mesh>
			<T
				is={Line2}
				geometry={genLineSegment(psegs[index])}
				material={new LineMaterial({
					color: lineColor,
					linewidth: gpin[lineMap[index]].tag ? 0.01 : 0.005
				})}
				name={'Line' + distanceMap[index]}
				on:pointerenter={onLineEnter}
				on:pointerleave={onLineLeave}
				on:click={onclickLine}
			/>
			<T
				is={Line2}
				geometry={genLineSegment(nsegs[index])}
				material={new LineMaterial({
					color: lineColor,
					linewidth: gpin[lineMap[index]].tag ? 0.01 : 0.005
				})}
				name={'Line' + distanceMap[index]}
				on:pointerenter={onLineEnter}
				on:pointerleave={onLineLeave}
				on:click={onclickLine}
			/>
		</T.Mesh>
		{#if gpin[distanceMap[index]].tag}
			<T.Mesh position={centerLine(psegs[index], 5)} rotation.y={-Math.PI / 2}>
				<Text
					text={'d=' + gpin[distanceMap[index]].value.toFixed(0)}
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
			on:pointerenter={onLensEnter}
			on:pointerleave={onLensLeave}
			on:click={onClickLens}
			on:dblclick={onDblClickLens}
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
		{#if gpin[lensMap[index]].tag}
			<T.Mesh position={eflLabelPosi[index]} rotation.y={-Math.PI / 2}>
				<Text
					text={'f=' + gop[index].value.toFixed(0) + ' mm'}
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
						new Vector3(0, -35, wp.zscaled),
						new Vector3(0, -wp.yscaled, wp.zscaled)
					])}
					material={new LineDashedMaterial({ color: 'red' })}
				/>
			</T.Mesh>

			<T.Mesh position={[0, -wp.yscaled - 6, wp.zscaled]} rotation.x={0}>
				<T.ConeGeometry args={[3, 12]} />
				<T.MeshStandardMaterial color={'red'} />
			</T.Mesh>

			<!-- Label mid Line -->
			<T.Mesh position={[0, -35, wp.zscaled]} rotation.y={-Math.PI / 2} visible={true}>
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
<T.Mesh
	position={[100 + offsetbackground, 0, 0]}
	rotation={[0, 0, 0]}
	visible={true}
	on:wheel={(e) => canvasWheel(e)}
	on:pointermove={(e) => canvasMove(e)}
>
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
		position={[0, source.waist * scaleY, zWaistGridUnits]}
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
		position={[0, -source.waist * scaleY, zWaistGridUnits]}
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
		<T.Mesh position={[0, -gridHeight, hl - 250]} rotation.y={-Math.PI / 2}>
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
		<T.Mesh position={[0, vl, -gridWidth - 5]} rotation.y={-Math.PI / 2}>
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
<T.Mesh position={[100, gridHeight + 25, -gridWidth - 50]} rotation.y={-Math.PI / 2} visible={true}>
	<Text text={titletext} color={'black'} fontSize={12} anchorX={'left'} anchorY={'bottom'} />
</T.Mesh>

<!-- Help Button -->
<T.Group position={[0, gridHeight, gridWidth + 30]}>
	<T.Mesh rotation.z={Math.PI / 2} visible={true} on:click={showHelp}>
		<T.CylinderGeometry args={[6, 6, 5, 32]} />
		<T.MeshStandardMaterial color={'red'} />
	</T.Mesh>
	<Text
		position={[-2.6, 0, 0]}
		rotation.y={-Math.PI / 2}
		text={'?'}
		color={'black'}
		fontSize={8}
		anchorX={'center'}
		anchorY={'middle'}
	/>
</T.Group>

<!-- Image Plane Button -->
<T.Group position={[0, 0, gridWidth + 12]}>
	<T.Mesh rotation.z={Math.PI / 2} visible={true} on:click={showGaussGraph}>
		<T.CylinderGeometry args={[9, 9, 1, 32]} />
		<T.MeshStandardMaterial color={'tan'} />
	</T.Mesh>

	<T.Mesh position={[-5, -5, 0]}>
		<T
			is={Line2}
			geometry={genLineSegment(gdata)}
			material={new LineMaterial({
				color: 0xff0000,
				linewidth: 0.002
			})}
			name={'gLine'}
		/>
	</T.Mesh>
</T.Group>
