<script lang="ts">
	import { Canvas, T } from '@threlte/core';
	import LightsCamera from './LightsCamera.svelte';
</script>

<LightsCamera />

<T.Mesh>
	<T.CylinderGeometry args={[20, 20, 25, 32]} />
	<T.MeshStandardMaterial color={'red'} />
</T.Mesh>
