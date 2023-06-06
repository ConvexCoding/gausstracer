<script lang="ts">
	import { RangeSlider, modalStore } from '@skeletonlabs/skeleton';
	import * as THREE from 'three';

	const colorKeywords = THREE.Color.NAMES;
	const colorKeywordNames = Object.keys(colorKeywords);

	export let parent: any;
	let focal = $modalStore[0].value[1];
	let lenscolor = $modalStore[0].value[3];

	function updateEFL() {
		lensData.efl = focal.toString();
	}

	$: lensData = {
		color: lenscolor,
		efl: focal,
		cpick: lenscolor
	};

	function changeColor(e: Event) {
		if (e) {
			const target = e.target as HTMLSelectElement;
			const selectedValue = target.value;
			console.log('Selected value:', selectedValue);
			lensData.color = selectedValue;
		}
	}

	// We've created a custom submit function to pass the response and close the modal.
	function onFormSubmit(): void {
		if ($modalStore[0].response) $modalStore[0].response(lensData);
		modalStore.close();
	}

	function fillEFL(e: KeyboardEvent) {
		if (e.key === 'Backspace') {
			if (lensData.efl.length > 0) {
				lensData.efl = lensData.efl.slice(0, -1);
			}
		} else {
			lensData.efl += e.key;
		}
	}

	function fillColor(e: KeyboardEvent) {
		if (e.key === 'Backspace') {
			if (lensData.color.length > 0) {
				lensData.color = lensData.color.slice(0, -1);
			}
		} else {
			lensData.color += e.key;
		}
	}

	// Base Classes
	const cBase = 'card p-4 shadow-xl space-y-4';
	const cHeader = 'font-bold text-lg';
	const cForm = 'border border-surface-300 p-4 space-y-4 rounded-container-token';
</script>

<!-- @component This example creates a simple form modal. -->

{#if $modalStore[0]}
	<div class="modal-example-form {cBase}">
		<header class={cHeader}>Modify Lens Property</header>
		<article>Enter New EFL or Cancel</article>
		<!-- Enable for debugging: -->
		<form class="modal-form {cForm}">
			<label class="label">
				<span>Lens Color</span>
				<input
					id="color"
					class="input"
					type="tel"
					bind:value={lensData.color}
					placeholder="Lens Color"
					on:keydown={fillColor}
				/>
			</label>

			<label class="label">
				<span>EFL</span>
				<input
					id="efl"
					class="input"
					type="efl"
					bind:value={lensData.efl}
					placeholder="Lens EFL"
					on:keydown={fillEFL}
				/>
			</label>
			<RangeSlider
				name="waist-slider"
				accent="accent-surface-900 dark:accent-surface-300  mb-5"
				bind:value={focal}
				min={5}
				max={300}
				step={5}
				on:change={updateEFL}
			>
				<div class="flex justify-between items-center">
					<div class="text-xs font-bold">efl</div>
					<div class="text-xs font-bold">{lensData.efl} / {300}</div>
				</div>
			</RangeSlider>
			<label for="dog-names">Enter Lens Color:</label>
			<select name="lens-colors" id="lens-colors" on:change={changeColor}>
				{#each colorKeywordNames as color}
					{#if color === lenscolor}
						<option value={color} selected>{color}</option>
					{:else}
						<option value={color}>{color}</option>
					{/if}
				{/each}
			</select>
		</form>
		<!-- prettier-ignore -->
		<footer class="modal-footer {parent.regionFooter}">
        <button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>{parent.buttonTextCancel}</button>
        <button class="btn {parent.buttonPositive}" on:click={onFormSubmit}>Submit Form</button>
    </footer>
	</div>
{/if}

<style>
	select {
		background-color: black;
		color: white;
	}
</style>
