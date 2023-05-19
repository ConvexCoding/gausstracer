<script lang="ts">
	import { Text } from '@threlte/extras';
	import { T } from '@threlte/core';
	import { DoubleSide, LatheGeometry } from 'three';
	import { Editable } from '@threlte/theatre';
	import { genLensLathe } from '$lib/mathUtils';

	export let radius: number = 1;
	export let scaleZ: number = 1;
	export let scaleY: number = 1;
	export let position: [number, number, number] = [0, 0, 0];
	export let color: string = 'black';
	export let efl: number = 100;
	export let showefls: boolean = true;

	let R = radius * 1.4;
	let ct = 2 * radius;
	let opacity = 1;

	if (efl < 0) {
		R = -R;
		ct = 1;
		opacity = 0.25;
	}

	let lensPosi: [number, number, number] = [position[0], position[1], position[2] - 2 * ct];

	let eflLabelPosi: [number, number, number] = [-3, 1.05 * radius * scaleY, position[2]];

	let geo = genLensLathe(radius, R, -R, ct, scaleZ, scaleY);
	let backupcolor = color;

	function onEnter() {
		backupcolor = color;
		color = 'white';
	}

	function onLeave() {
		color = backupcolor;
	}
</script>

<T.Mesh
	geometry={geo}
	position={lensPosi}
	rotation={[Math.PI / 2, 0, 0]}
	on:pointerenter={onEnter}
	on:pointerleave={onLeave}
	on:click={onLeave}
	let:ref
>
	<!--<Editable name="Lens" scale /> -->
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
