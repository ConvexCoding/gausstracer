<script lang="ts">
	import { modalStore } from '@skeletonlabs/skeleton';

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
		<article>All "Clicks" refer to left mouse button click</article>
		<div
			class="border border-surface-500 p-4 rounded-container-token grid grid-cols-3 gap-x-10 gap-y-2"
		>
			<div class="col-span-2">Change efl by dragging lens with mouse</div>
			<div><i>Double Click Lens</i></div>

			<div class="col-span-2">Change distance or efl using arrow keys</div>
			<div><i>Click Lens/Line</i></div>

			<div class="col-span-2">Change distance or efl using mouse wheel</div>
			<div><i>Click Lens/Line</i></div>

			<div class="col-span-2">Modify Lens Props</div>
			<div><i>Ctrl Click Lens</i></div>

			<div class="col-span-2">Modify Line Props</div>
			<div><i>Ctrl Click Line</i></div>

			<div class="col-span-2">Delete Lens</div>
			<div><i>Alt Click Lens</i></div>

			<div class="col-span-2">Add lens at cursor location</div>
			<div><i>Alt Click Line</i></div>

			<div class="col-span-2">Display lens efl or distance settings</div>
			<div><i>Hover Over Lens/Dist</i></div>

			<div class="col-span-2">Look for and remove adjacent distances</div>
			<div><i>Ctrl C or c</i></div>

			<div class="col-span-2">Append a lens element to end of system</div>
			<div><i>Ctrl L or l</i></div>

			<div class="col-span-2">Append a distance element to end of system</div>
			<div><i>Ctrl D or d</i></div>

			<div class="col-span-2">Reset to single distance element</div>
			<div><i>Ctrl Alt R or r</i></div>
		</div>
		<!-- prettier-ignore -->
		<footer class="modal-footer {parent.regionFooter}">
        <button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>Close</button>
    </footer>
	</div>
{/if}
