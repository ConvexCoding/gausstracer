<script lang="ts">
	import { Text } from '@threlte/extras';
	import { T } from '@threlte/core';
	import { DoubleSide, LatheGeometry } from 'three';
	import { Editable } from '@threlte/theatre';
	import { genLensLathe, calcSag } from '$lib/mathUtils';

	export let radius: number = 1;
	export let scaleZ: number = 1;
	export let scaleY: number = 1;
	export let position: [number, number, number];
	export let color: string = 'black';
	export let efl: number = 100;
	export let showefls: boolean = true;

	let R = radius * 5;
	let opacity = 1;
	let sag1 = calcSag(radius, R, 0);
	let ct = 2 * sag1 + 5;
	// scaleZ = real / pixels
	// ctpixels = 10 pixels
	// ctreal = 10 * scaleZ

	if (efl < 0) {
		R = -R;
		ct = 1;
		opacity = 0.25;
	}

	$: lensPosi = [position[0], position[1], position[2]];
	//console.log('<Lens> Z Pos', lensPosi[2]);

	function getLabelPosition(radius: number, scaleY: number, position: [number, number, number]) {
		let posi: [number, number, number] = [-3, 1.05 * radius * scaleY, position[2]];
		return posi;
	}

	$: eflLabelPosi = getLabelPosition(radius, scaleY, position);

	$: geo = genLensLathe(radius, R, -R, ct, scaleZ, scaleY);
	let backupcolor = color;

	function onEnter() {
		backupcolor = color;
		color = 'white';
		opacity = 0.4;
	}

	function onLeave() {
		color = backupcolor;
		opacity = 1;
	}
</script>

<T.Mesh
	geometry={geo}
	position={[lensPosi[0], lensPosi[1], lensPosi[2]]}
	rotation={[Math.PI / 2, 0, 0]}
	on:pointerenter={onEnter}
	on:pointerleave={onLeave}
	on:click={onLeave}
	let:ref
>
	<T.MeshPhongMaterial {color} {opacity} transparent side={DoubleSide} shininess={100} />
</T.Mesh>

{#if showefls}
	<T.Mesh position={eflLabelPosi} rotation.y={-Math.PI / 2}>
		<Text
			text={'f = ' + efl.toFixed(0) + ' mm'}
			color={0x000000}
			fontSize={8}
			anchorX={'center'}
			anchorY={'bottom'}
		/>
	</T.Mesh>
{/if}
