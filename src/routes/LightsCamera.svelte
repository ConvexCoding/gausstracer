<script lang="ts">
	import { OrbitControls } from '@threlte/extras';
	import { T } from '@threlte/core';
	import { Vector3 } from 'three';
	import { injectLookAtPlugin } from './lookAtPlugin';

	export let camScale = 0.6;
	export const zoomOn = true;
	export const rotateOn = true;
	export const panOn = true;
	export let camLoc: [number, number, number] = [-300, 0, 0];
	export const camTarget: Vector3 = new Vector3(0, 0, 0);
	injectLookAtPlugin();
</script>

<T.OrthographicCamera makeDefault position={camLoc} scale={camScale} lookAt={camTarget}>
	<OrbitControls enableZoom={zoomOn} enableRotate={rotateOn} enablePan={panOn} />
</T.OrthographicCamera>

<!-- Add Lights -->
<T.DirectionalLight position={[-100, 0, 0]} intensity={0.75} />
<T.DirectionalLight position={[0, 100, 0]} intensity={0.2} />
<T.DirectionalLight position={[0, -100, 0]} intensity={0.2} />
<T.AmbientLight intensity={0.5} />
