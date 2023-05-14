<!-- YOU CAN DELETE EVERYTHING IN THIS PAGE -->
<script lang="ts">
	import { Canvas, T } from '@threlte/core';
	import NewScene from './NewScene.svelte';
</script>

<div class="flex flex-col mt-5 gap-0">
	<div class="ml-5 mb-5">
		<h2 class="h2">Gaussian Beam Tracer</h2>
	</div>
	<div class="contents1">
		<Canvas>
			<NewScene />
		</Canvas>
	</div>
</div>

<style>
	.contents1 {
		height: 300px;
		background-color: beige;
	}
</style>
