<!-- YOU CAN DELETE EVERYTHING IN THIS PAGE -->
<script lang="ts">
	import { Canvas, extend } from '@threlte/core';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import TracerScene from './TracerScene.svelte';
	import GaussOp from '$lib/gaussop';
	import Source from '$lib/source';

	// define Gaussian beam operations
	const sf = 1;
	//f2 = 266.6666666666667
	// f1 = 133.3333333333333
	let gp: GaussOp[] = [];
	gp.push(new GaussOp('distance', 400 / sf));
	gp.push(new GaussOp('lens', 100 / sf, 1, 'green')); // index 1
	//
	gp.push(new GaussOp('distance', 100 / sf));
	gp.push(new GaussOp('distance', 300 / sf));
	// OR
	//gp.push(new GaussOp('distance', 400 / sf));
	//
	gp.push(new GaussOp('lens', 300 / sf, 1, 'yellow')); // index 4
	gp.push(new GaussOp('distance', 800 / sf));
	gp.push(new GaussOp('lens', 400 / sf, 1, 'red')); // index 6
	gp.push(new GaussOp('distance', 400 / sf));
	gp.push(new GaussOp('distance', 0 / sf));

	const w0 = 1;
	const λ = 1.07;
	const waistInitialPosition = 0;
	const msq = 3;
	let source: Source = new Source(λ, w0, waistInitialPosition, msq);
</script>

<div class="flex flex-col mt-5 gap-0">
	<div class="ml-5 mb-5">
		<h2 class="h2">Gaussian Beam Tracer</h2>
	</div>
	<div class="contents1">
		<Canvas>
			<TracerScene {gp} {source} />
		</Canvas>
	</div>
</div>

<style>
	.contents1 {
		height: 500px;
		background-color: beige;
	}
</style>
