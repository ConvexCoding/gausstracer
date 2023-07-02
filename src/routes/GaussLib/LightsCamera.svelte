<script lang="ts">
	import { OrbitControls } from '@threlte/extras';
	import { T } from '@threlte/core';
	import { camPosition, lookAtPosition, camScale } from '../../stores/camOrbitStore';

	export let ocEnabled: boolean = true;
</script>

<T.OrthographicCamera
	let:ref={cameraRef}
	makeDefault
	position.x={$camPosition.x}
	position.y={$camPosition.y}
	position.z={$camPosition.z}
	fov={45}
>
	<OrbitControls
		let:ref
		enableZoom
		enableDamping
		dampingFactor={0.075}
		on:change={() => {
			if (ocEnabled) {
				const { x, y, z } = cameraRef.position;
				camPosition.set({ x, y, z }, { duration: 0 });
				const newScale = cameraRef.scale;
				camScale.set({ x: newScale.x, y: newScale.y, z: newScale.z }, { duration: 0 });
			}
		}}
		target={[$lookAtPosition.x, $lookAtPosition.y, $lookAtPosition.z]}
		enabled={ocEnabled}
	/>
</T.OrthographicCamera>

<!-- Add Lights -->
<T.DirectionalLight position={[-100, 0, 0]} intensity={0.75} />
<T.DirectionalLight position={[0, 100, 0]} intensity={0.2} />
<T.DirectionalLight position={[0, -100, 0]} intensity={0.2} />
<T.AmbientLight intensity={0.5} />
