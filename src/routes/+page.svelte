<!-- YOU CAN DELETE EVERYTHING IN THIS PAGE -->
<script lang="ts">
	import { Canvas, forwardEventHandlers, useThrelte } from '@threlte/core';
	import type { Object3D } from 'three';
	import TracerScene from './TracerScene.svelte';
	import GaussOp from '$lib/gaussop';
	import Source from '$lib/source';
	import {
		RangeSlider,
		type ModalComponent,
		type ModalSettings,
		modalStore
	} from '@skeletonlabs/skeleton';
	import { interactivity } from '@threlte/extras';
	import SourceModal from './SourceModal.svelte';

	// define Gaussian beam operations
	const sf = 1;
	//f2 = 266.6666666666667
	// f1 = 133.3333333333333m
	let gp: GaussOp[] = [];
	gp.push(new GaussOp('distance', 100 / sf)); // index 0
	gp.push(new GaussOp('lens', 100 / sf, 1, 'green')); // index 1
	//
	gp.push(new GaussOp('distance', 100 / sf)); // index 2
	gp.push(new GaussOp('distance', 100 / sf)); // index 3
	// OR
	//gp.push(new GaussOp('distance', 300 / sf));
	//
	gp.push(new GaussOp('lens', 100 / sf, 1, 'yellow')); // index 4
	gp.push(new GaussOp('distance', 100 / sf)); // index 5
	gp.push(new GaussOp('lens', 100 / sf, 1, 'red'));
	gp.push(new GaussOp('distance', 100 / sf)); // index 7

	$: λ = 1.07;
	const waistInitialPosition = 0; // maybe future feature
	$: msq = 1;
	$: w0 = 1;
	$: ior = 1;
	$: source = new Source(λ, w0, waistInitialPosition, ior, msq);

	let arrowString = 'M 19 9 l -7 8 -7 -8Z';
	arrowString = 'M 19 9 l -7 -8 -7 8Z';
	arrowString = 'M 19 14 l -7 8 -7 -8Z' + 'M 19 9 l -7 -8 -7 8Z';

	const editicon =
		'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10';
	const reseticon =
		'M12 3.75v16.5M2.25 12h19.5M6.375 17.25a4.875 4.875 0 004.875-4.875V12m6.375 5.25a4.875 4.875 0 01-4.875-4.875V12m-9 8.25h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v13.5a1.5 1.5 0 001.5 1.5zm12.621-9.44c-1.409 1.41-4.242 1.061-4.242 1.061s-.349-2.833 1.06-4.242a2.25 2.25 0 013.182 3.182zM10.773 7.63c1.409 1.409 1.06 4.242 1.06 4.242S9 12.22 7.592 10.811a2.25 2.25 0 113.182-3.182z';

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

	function showModal() {
		const c: ModalComponent = { ref: SourceModal };
		const modal: ModalSettings = {
			type: 'component',
			component: c,
			title: 'Modify ' + 'Source' + ' Properties',
			body: 'Modify ' + 'Source' + ' then either accept or cancel.',
			value: ['wavelength', λ.toString(), 'w0', w0, 'msq', msq, 'ior', ior],
			response: (r: any) => {
				if (r) {
					λ = parseFloat(r.lambda);
					w0 = parseFloat(r.waist);
					msq = parseFloat(r.msq);
					ior = parseFloat(r.ior);
					source = new Source(λ, w0, waistInitialPosition, ior, msq);
					console.log(r);
					console.log(source);
				}
			}
		};
		modalStore.trigger(modal);
	}

	let resetNumber = 0;
	function resetView() {
		resetNumber++;
	}
</script>

<div class="ml-5 mb-5">
	<h2 class="h2">Gaussian Beam Tracer</h2>
</div>

<div class="mt-5 gap-0">
	<div class="contents1">
		<Canvas>
			<TracerScene gpin={gp} {source} resetView={resetNumber} />
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
			min={0.01}
			max={10}
			step={0.01}
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

		<div class="flex justify-center">
			<button type="button" class="btn-icon bg-blue-600 hover:bg-blue-800" on:click={showModal}
				><svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-6 h-6"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d={editicon} /></svg
				></button
			>
		</div>
	</div>
</div>
<div class="flex justify-center m-10">
	<button type="button" class="btn-icon bg-blue-600 hover:bg-blue-800" on:click={resetView}
		><svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="w-6 h-6"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d={reseticon} /></svg
		></button
	>
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
