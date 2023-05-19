<!-- YOU CAN DELETE EVERYTHING IN THIS PAGE -->
<script lang="ts">
	import { Canvas, extend } from '@threlte/core';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
	import { Theatre } from '@threlte/theatre';
	import TracerScene from './TracerScene.svelte';

	extend({
		OrbitControls
	});
</script>

<div class="flex flex-col mt-5 gap-0">
	<div class="ml-5 mb-5">
		<h2 class="h2">Gaussian Beam Tracer</h2>
	</div>
	<div class="contents1">
		<Canvas>
			<TracerScene />
		</Canvas>
	</div>
</div>

<style>
	.contents1 {
		height: 500px;
		background-color: beige;
	}
</style>
