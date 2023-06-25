<script lang="ts">
	import { modalStore } from '@skeletonlabs/skeleton';
	import { Canvas } from '@threlte/core';
	import SceneModal from './SceneModal.svelte';
	import Gauss3DScene from './Gauss3DScene.svelte';

	// Props
	/** Exposes parent props to this component. */
	export let parent: any;

	// Local
	let flavor = 'chocolate';

	// Handle Form Submission
	function onFormSubmit(): void {
		if ($modalStore[0].response) $modalStore[0].response(flavor);
		modalStore.close();
	}

	// Base Classes
	const cBase = 'card p-4 w-modal shadow-xl space-y-4';
	const cHeader = 'text-2xl font-bold';
</script>

<!-- @component This example creates a simple form modal. -->

{#if $modalStore[0]}
	<div class="modal-example-form {cBase}">
		<header class={cHeader}>{$modalStore[0].title ?? '(title missing)'}</header>
		<article>{$modalStore[0].body ?? '(body missing)'}</article>
		<div class="border w-[608px] bg-slate-50 border-surface-500 p-5 rounded-container-token">
			<Canvas>
				<Gauss3DScene waistvalue={$modalStore[0].value[1]} ivalue={1.2} />
			</Canvas>
		</div>
		<!-- prettier-ignore -->
		<footer class="modal-footer {parent.regionFooter}">
        <button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>Close</button>
    </footer>
	</div>
{/if}
