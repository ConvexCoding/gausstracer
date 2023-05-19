<script lang="ts">
	import { OrbitControls, Text, interactivity } from '@threlte/extras';
	import { T } from '@threlte/core';
	import { BufferGeometry, DoubleSide, LatheGeometry, LineDashedMaterial, Vector3 } from 'three';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
	import { Editable } from '@threlte/theatre';
	import { genLensLathe } from '$lib/mathUtils';

	export let radius: number = 1;
	export let scaleZ: number = 1;
	export let scaleY: number = 1;
	export let position: [number, number, number] = [0, 0, 0];
	export let color: string = 'black';
	export let efl: number = 100;

	let R = radius * 1.4;
	let ct = 2 * radius;
	let opacity = 1;

	if (efl < 0) {
		R = -R;
		ct = 1;
		opacity = 0.25;
	}

	let lensPosi: [number, number, number] = [position[0], position[1], position[2] - 2 * ct];

	let geo = genLensLathe(radius, R, -R, ct, scaleZ, scaleY);
</script>

<T.Mesh geometry={geo} position={lensPosi} rotation={[Math.PI / 2, 0, 0]} let:ref>
	<!--<Editable name="Lens" scale /> -->
	<T.MeshPhongMaterial {color} {opacity} transparent side={DoubleSide} shininess={100} />
</T.Mesh>
