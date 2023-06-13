<script lang="ts">
	import { RangeSlider, modalStore } from '@skeletonlabs/skeleton';
	import * as THREE from 'three';

	const colorKeywords = THREE.Color.NAMES;
	const colorKeywordNames = Object.keys(colorKeywords);

	export let parent: any;
	let value = $modalStore[0].value[1];
	let linecolor = $modalStore[0].value[3];
	let opType = $modalStore[0].value[5];

	function updateValue() {
		opData.value = value.toString();
	}

	$: opData = {
		color: linecolor,
		value: value
	};

	function changeColor(e: Event) {
		if (e) {
			const target = e.target as HTMLSelectElement;
			const selectedValue = target.value;
			console.log('Selected value:', selectedValue);
			opData.color = selectedValue;
		}
	}

	// We've created a custom submit function to pass the response and close the modal.
	function onFormSubmit(): void {
		if ($modalStore[0].response) $modalStore[0].response(opData);
		modalStore.close();
	}

	function fillValue(e: KeyboardEvent) {
		// first check for tab or shift tab
		if (e.key === 'Tab') {
			console.log('tab key press: ', e.key);
			const gotoColors = document.getElementById('lens-colors') as HTMLInputElement;
			gotoColors.focus();
			return;
		}
		if (e.key === 'Backspace') {
			if (opData.value.length > 0) {
				opData.value = opData.value.slice(0, -1);
			}
		} else {
			const allowedKeys = /^[-\d.]$/;
			if (allowedKeys.test(e.key)) {
				opData.value += e.key;
			} else {
				e.preventDefault();
			}
		}
	}

	function moveFocusfromColor(e: KeyboardEvent) {
		if (e.shiftKey && e.key === 'Tab') {
			console.log('shift tab key press: ', e.shiftKey, e.key);
			const newID = document.getElementById('efl') as HTMLInputElement;
			newID.focus();
			return;
		}
		if (e.key === 'Tab') {
			const newID = document.getElementById('accept-button') as HTMLInputElement;
			newID.focus();
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
		<header class={cHeader}>{$modalStore[0].title ?? '(title missing)'}</header>
		<!-- Enable for debugging: -->
		<form class="modal-form {cForm}">
			<label class="Distance-label">
				<span>{opType}</span>
				<input
					id="value"
					tabindex="0"
					class="input pl-3"
					type="value"
					bind:value={opData.value}
					placeholder="op value"
					on:keydown={fillValue}
				/>
			</label>
			<RangeSlider
				name="waist-slider"
				accent="accent-surface-900 dark:accent-surface-300  mb-5"
				bind:value
				min={25}
				max={1000}
				step={25}
				tabindex="0"
				on:change={updateValue}
			>
				<div class="flex justify-between items-center">
					<div class="text-lg">{opType}</div>
					<div class="text-lg">{opData.value} / {1000}</div>
				</div>
			</RangeSlider>
			<label for="LensColor-label">Lens Color:</label>
			<select
				name="lens-colors"
				id="lens-colors"
				tabindex="0"
				on:change={changeColor}
				on:keydown={moveFocusfromColor}
			>
				{#each colorKeywordNames as color}
					{#if color === linecolor}
						<option value={color} selected>{color}</option>
					{:else}
						<option value={color}>{color}</option>
					{/if}
				{/each}
			</select>
		</form>
		<!-- prettier-ignore -->
		<footer class="modal-footer {parent.regionFooter}">
        <button class="btn {parent.buttonNeutral}" id="cancel-button" on:click={parent.onClose}>{parent.buttonTextCancel}</button>
        <button class="btn {parent.buttonPositive}" id="accept-button" on:click={onFormSubmit}>Accept</button>
    </footer>
	</div>
{/if}

<style>
	select {
		background-color: black;
		color: white;
	}
</style>
