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
	gp.push(new GaussOp('distance', 200 / sf)); // index 5
	gp.push(new GaussOp('lens', 200 / sf, 1, 'red'));
	gp.push(new GaussOp('distance', 100 / sf)); // index 7

	$: λ = 1.07;
	const waistInitialPosition = 0;
	$: msq = 1;
	$: w0 = 1;
	$: ior = 1;
	$: source = new Source(λ, w0, waistInitialPosition, ior, msq);

	let arrowString = 'M 19 9 l -7 8 -7 -8Z';
	arrowString = 'M 19 9 l -7 -8 -7 8Z';
	arrowString = 'M 19 14 l -7 8 -7 -8Z' + 'M 19 9 l -7 -8 -7 8Z';
	function ShowAndHide() {
		var x = document.getElementById('SectionName');
		if (x === null) return;
		if (x.style.display === 'none') {
			arrow = 'Source Control ^';
			x.style.display = 'block';
		} else {
			arrow = 'Source Control v';
			x.style.display = 'none';
		}
	}

	let arrow = 'Source Control --- ^';
</script>

<div class="ml-5 mb-5">
	<h2 class="h2">Gaussian Beam Tracer</h2>
</div>

<div class="mt-5 gap-0">
	<div class="contents1">
		<Canvas>
			<TracerScene gpin={gp} {source} />
		</Canvas>
	</div>
</div>

<div class="controls">
	<button
		class="mb-5 text-white bg-blue-600 hover:bg-blue-800 focus:ring-4 focus:ring-blue-100 font-medium rounded-lg text-sm px-4 py-2.5 text-center inline-flex items-center"
		type="button"
		on:click={ShowAndHide}
		>Source Control <svg
			class="w-4 h-4 ml-2"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			><path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d={arrowString}
				fill="white"
			/></svg
		></button
	>
	<div id="SectionName" STYLE="display:block">
		<RangeSlider
			name="waist-slider"
			accent="accent-surface-900 dark:accent-surface-300 mb-5"
			bind:value={λ}
			min={0.5}
			max={12}
			step={0.5}
		>
			<div class="flex justify-between items-center">
				<div class="text-xs font-bold gap-0">λ</div>
				<div class="text-xs font-bold gap-0">{λ} / {12}</div>
			</div>
		</RangeSlider>

		<RangeSlider
			name="waist-slider"
			accent="accent-surface-900 dark:accent-surface-300  mb-5"
			bind:value={w0}
			min={0.5}
			max={10}
			step={0.5}
		>
			<div class="flex justify-between items-center">
				<div class="text-xs font-bold">w0</div>
				<div class="text-xs font-bold">{w0} / {10}</div>
			</div>
		</RangeSlider>

		<RangeSlider
			name="waist-slider"
			accent="accent-surface-900 dark:accent-surface-300  mb-5"
			bind:value={msq}
			min={1}
			max={10}
			step={1}
		>
			<div class="flex justify-between items-center self-end">
				<div class="text-xs font-bold">M<sup>2</sup></div>
				<div class="text-xs font-bold">{msq} / {10}</div>
			</div>
		</RangeSlider>

		<RangeSlider
			name="waist-slider"
			accent="accent-surface-900 dark:accent-surface-300  mb-5"
			bind:value={ior}
			min={1}
			max={5}
			step={0.05}
		>
			<div class="flex justify-between items-center self-end">
				<div class="text-xs font-bold">Index of Ref.</div>
				<div class="text-xs font-bold">{ior} / {10}</div>
			</div>
		</RangeSlider>
	</div>
</div>

<style>
	.contents1 {
		height: 500px;
		background-color: beige;
	}

	.controls {
		position: absolute;
		background-color: gray;
		top: 4rem;
		left: 1rem;
		width: 12rem;
		padding: 1rem;
	}
</style>
