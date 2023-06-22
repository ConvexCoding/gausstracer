<script>
	import { OrbitControls, Text, interactivity } from '@threlte/extras';
	import { T } from '@threlte/core';

	export let scale = 0.75;
	export const zoomOn = false;
	const rotateOn = true;
	const panOn = true;
</script>

<T.OrthographicCamera
	makeDefault
	position={[-300, 0, 0]}
	{scale}
	on:create={({ ref }) => {
		ref.lookAt(0, 0, 0);
	}}
>
	<OrbitControls enableZoom={zoomOn} enableRotate={rotateOn} enablePan={panOn} />
</T.OrthographicCamera>

<!-- Add Lights -->
<T.DirectionalLight position={[-100, 0, 0]} intensity={0.75} />
<T.DirectionalLight position={[0, 100, 0]} intensity={0.2} />
<T.DirectionalLight position={[0, -100, 0]} intensity={0.2} />
<T.AmbientLight intensity={0.5} />
