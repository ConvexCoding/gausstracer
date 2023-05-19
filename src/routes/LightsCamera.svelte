<script>
	import { OrbitControls, Text, interactivity } from '@threlte/extras';
	import { T } from '@threlte/core';
</script>

<T.OrthographicCamera
	makeDefault
	position={[-100, 0, 0]}
	scale={0.5}
	on:create={({ ref }) => {
		ref.lookAt(0, 0, 0);
	}}
>
	<OrbitControls enableZoom enableRotate={true} enablePan={true} />
</T.OrthographicCamera>

<!-- Add Lights -->
<T.DirectionalLight position={[-100, 0, 0]} intensity={0.75} />
<T.DirectionalLight position={[0, 100, 0]} intensity={0.2} />
<T.DirectionalLight position={[0, -100, 0]} intensity={0.2} />
<T.AmbientLight intensity={0.5} />
