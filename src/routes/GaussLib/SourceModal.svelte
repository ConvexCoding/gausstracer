<script lang="ts">
	import { RangeSlider, modalStore } from '@skeletonlabs/skeleton';

	export let parent: any;
	let lambda = $modalStore[0].value[1].toString();
	let waist = $modalStore[0].value[3].toString();
	let msq = $modalStore[0].value[5].toString();
	let ior = $modalStore[0].value[7].toString();

	$: resp = {
		lambda: lambda,
		waist: waist,
		msq: msq,
		ior: ior
	};

	// We've created a custom submit function to pass the response and close the modal.
	// We've created a custom submit function to pass the response and close the modal.
	function onFormSubmit(): void {
		if ($modalStore[0].response) $modalStore[0].response(resp);
		modalStore.close();
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
		<form name="Frm" class="modal-form {cForm}" autocomplete="off">
			<label class="Wavelength-label">
				<span>Wavelength</span>
				<input
					id="value"
					tabindex="0"
					class="input pl-3"
					type="value"
					bind:value={resp.lambda}
					placeholder="lambda"
				/>
			</label>
			<label class="Waist-label">
				<span>Waist</span>
				<input
					id="value"
					tabindex="0"
					class="input pl-3"
					type="value"
					bind:value={resp.waist}
					placeholder="waist"
				/>
			</label>
			<label class="Msq-label">
				<span>M2</span>
				<input
					id="value"
					tabindex="0"
					class="input pl-3"
					type="value"
					bind:value={resp.msq}
					placeholder="msq"
				/>
			</label>
			<label class="Index-label">
				<span>Index of Refraction</span>
				<input
					id="value"
					tabindex="0"
					class="input pl-3"
					type="value"
					bind:value={resp.ior}
					placeholder="ior"
				/>
			</label>
		</form>
		<!-- prettier-ignore -->
		<footer class="modal-footer {parent.regionFooter}">
        <button class="btn {parent.buttonNeutral}" id="cancel-button" on:click={parent.onClose}>{parent.buttonTextCancel}</button>
        <button class="btn {parent.buttonPositive}" id="accept-button" on:click={onFormSubmit}>Accept</button>
    </footer>
	</div>
{/if}
