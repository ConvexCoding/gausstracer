<!-- YOU CAN DELETE EVERYTHING IN THIS PAGE -->
<script lang="ts">
	import { Canvas, forwardEventHandlers, useThrelte } from '@threlte/core';
	import TracerScene from './TracerScene.svelte';
	import GaussOp from '$lib/gaussop';
	import Source from '$lib/source';
	import { RangeSlider } from '@skeletonlabs/skeleton';

	// define Gaussian beam operations
	const sf = 1;
	//f2 = 266.6666666666667
	// f1 = 133.3333333333333m
	let gp: GaussOp[] = [];
	gp.push(new GaussOp('distance', 50 / sf)); // index 0
	gp.push(new GaussOp('lens', 100 / sf, 1, 'green')); // index 1
	//
	gp.push(new GaussOp('distance', 100 / sf)); // index 2
	gp.push(new GaussOp('distance', 200 / sf)); // index 3
	// OR
	//gp.push(new GaussOp('distance', 300 / sf));
	//
	gp.push(new GaussOp('lens', 200 / sf, 1, 'yellow')); // index 4
	gp.push(new GaussOp('distance', 250 / sf)); // index 5
	gp.push(new GaussOp('lens', 200 / sf, 1, 'red'));
	gp.push(new GaussOp('distance', 200 / sf)); // index 7

	const w0 = 1;
	const λ = 1.07;
	const waistInitialPosition = 0;
	$: msq = 1;
	let source: Source = new Source(λ, w0, waistInitialPosition, msq);

	function incSF() {
		console.log('incSF', msq);
		gp[6].value *= 2 / msq++;
	}
</script>

<div class="flex flex-col mt-5 gap-0">
	<div class="ml-5 mb-5">
		<h2 class="h2">Gaussian Beam Tracer</h2>
		<RangeSlider
			name="waist-slider"
			accent="accent-surface-900 dark:accent-surface-300"
			bind:value={msq}
			min={1}
			max={10}
			step={1}
			on:change={incSF}
		/>
	</div>
	<div class="contents1">
		<Canvas>
			<TracerScene gpin={gp} {source} />
		</Canvas>
	</div>
</div>

<style>
	.contents1 {
		height: 500px;
		background-color: beige;
	}
</style>
