<script lang="ts">
	import { OrbitControls, Text } from '@threlte/extras';
	import { T, useFrame } from '@threlte/core';
	import {
		BufferAttribute,
		BufferGeometry,
		DoubleSide,
		LatheGeometry,
		LineDashedMaterial,
		Vector3
	} from 'three';
	import { genLineSegment, xyToVector } from '$lib/mathUtils';
	import { Lut } from 'three/examples/jsm/math/Lut';
	import { generateLatheColors } from '$lib/mathUtils';
	import { Line2 } from 'three/examples/jsm/lines/Line2';
	import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

	export let waistvalue = 0.2;
	export let ivalue = 1.0;
	let w0 = 0.6;
	let i0 = ivalue;

	// Generate a 2d plot of peak intensity versus radial distance (2 * w0)
	// where radial distance r is mapped to the z axis
	// and the intensity Ir is mapped to the y axis

	const r: number[] = [];
	const intensity: number[] = [];

	const rmulti = 2;
	const verticalGridDivisions = 9;
	const horizontalGridDivisions = 10;
	const rinc = (w0 * rmulti) / 100;

	// set constants
	// realize this could one statement but it's easier to read this way
	let maxY = i0;
	let minY = 0;
	let maxR = rmulti * w0;
	let maxWaist = 1.0;

	const numLuts = 51;
	const lut = new Lut('rainbow', numLuts);

	// displayed chart in pixels
	const gridWidth = 100; // total grid width = 2 * gridWidth
	const gridHeight = 100; // total grid height = 2 * gridHeight
	const horizontalLabelHeight = 10;

	// set scale constants for w and z
	let scaleY0 = maxY;
	const colorToGrid = false;
	const yMaxColor = gridHeight;
	let image: LatheGeometry;
	let max = 1.0;

	const verticalOffsetFactor = 2.5;

	const vGaussPosi = ivalue * 0.135335 * gridHeight - gridHeight / verticalOffsetFactor;
	const zGauss = (w0 * gridWidth) / 2;
	const gLabelOffset = 20;
	const gLabelOffset2 = 50;

	function updateLathe(localIntensity: number, localWaist: number) {
		w0 = localWaist;
		i0 = localIntensity;
		r.length = 0;
		intensity.length = 0;
		for (let radius = -rmulti * maxWaist; radius <= rmulti * maxWaist; radius += rinc) {
			r.push((radius * gridWidth) / (rmulti * maxWaist));
			const itemp = localIntensity * Math.exp(-2 * (radius / localWaist) * (radius / localWaist));
			intensity.push(itemp * gridHeight);
		}
		const data = xyToVector(r, intensity);
		image = new LatheGeometry(data, 51, 0, Math.PI * 2);
		const lathcolors = generateLatheColors(image, yMaxColor, 'rainbow', numLuts);
		image.setAttribute('color', new BufferAttribute(lathcolors, 3));
		return image;
	}

	function updateELine(localIntensity: number, localWaist: number) {
		r.length = 0;
		intensity.length = 0;
		let x: number[] = [];
		let y: number[] = [];
		let epoint = localIntensity * 0.135335 * gridHeight;
		for (let angle = 0; angle <= 2 * Math.PI; angle += Math.PI / 50) {
			const xpt = (localWaist * Math.cos(angle)) / 2;
			const ypt = (localWaist * Math.sin(angle)) / 2;
			x.push(xpt * gridWidth);
			y.push(ypt * gridWidth);
		}

		const numPoints = x.length;
		const linesegs = new Float32Array(numPoints * 3); // each point has 3 coordinates (x, y, z)

		for (let i = 0; i < numPoints; i++) {
			linesegs[i * 3] = x[i]; // set x-coordinate to 0
			linesegs[i * 3 + 1] = epoint; // set y-coordinate to intensity[i]
			linesegs[i * 3 + 2] = y[i]; // set z-coordinate to r[i]
		}

		return genLineSegment(linesegs);
	}

	function arrowLine(localIntensity: number, localWaist: number) {
		const p0 = new Vector3(0, vGaussPosi, zGauss + gLabelOffset);
		const p1 = new Vector3(0, vGaussPosi, zGauss + gLabelOffset2);

		const arrow = new Float32Array(2 * 3);

		arrow[0] = p0.x;
		arrow[1] = p0.y;
		arrow[2] = p0.z;
		arrow[3] = p1.x;
		arrow[4] = p1.y;
		arrow[5] = p1.z;

		return genLineSegment(arrow);
	}

	function formatWaistLabel(waist: number): string {
		if (waist > 0.1) {
			return `${waist.toFixed(3)} mm`;
		}
		if (waist > 0.001) {
			return `${(waist * 1000).toFixed(0)} micron`;
		}
		return `${(waist * 1000000).toFixed(0)} nm`;
	}

	let rotation = 0;
	useFrame((state, delta) => {
		rotation += delta;
	});

	$: updatedImage = updateLathe(ivalue, w0);
	$: updatedELine = updateELine(ivalue, w0);

	$: aLine = arrowLine(ivalue, w0);
</script>

<T.PerspectiveCamera
	makeDefault
	position={[-200, 10, -0]}
	on:create={({ ref }) => {
		ref.lookAt(0, 0, 0);
	}}
>
	<OrbitControls enableDamping enableZoom enablePan />
</T.PerspectiveCamera>

<T.DirectionalLight position={[-100, 0, 0]} intensity={0.75} />
<T.DirectionalLight position={[0, 100, 0]} intensity={0.2} />
<T.DirectionalLight position={[0, -100, 0]} intensity={0.2} />
<T.AmbientLight intensity={0.5} />

<T.Group rotation.y={rotation}>
	<!-- gauss lathe mesh to scene -->
	<T.Mesh
		geometry={updatedImage}
		position={[0, -gridWidth / verticalOffsetFactor, 0]}
		rotation={[0, rotation, 0]}
		castShadow={true}
		let:ref
	>
		<T.MeshPhongMaterial vertexColors={true} shinness={100} opacity={0.8} transparent side={2} />
	</T.Mesh>

	<!-- add circular line at 1/e^-2 pts -->
	<T.Mesh position={[0, vGaussPosi, 0]} visible={false}>
		<T
			is={Line2}
			geometry={updatedELine}
			material={new LineMaterial({ color: 0xff0000, linewidth: 0.03 })}
		/>
	</T.Mesh>

	<!-- add circular plane at 1/e^-2 pts -->
	<T.Mesh position={[0, vGaussPosi, 0]} visible={true} rotation.x={Math.PI / 2}>
		<T.CircleGeometry args={[zGauss + 10, 50]} />
		<T.MeshPhongMaterial color={'red'} side={DoubleSide} />
	</T.Mesh>

	<!-- label waist radius -->
	<T.Group visible={true}>
		<T.Mesh>
			<T
				is={Line2}
				geometry={aLine}
				material={new LineMaterial({ color: 0xff0000, linewidth: 0.015 })}
			/>
		</T.Mesh>

		<T.Mesh position={[0, vGaussPosi, zGauss + gLabelOffset]} rotation.x={-Math.PI / 2}>
			<T.ConeGeometry args={[5, 15]} />
			<T.MeshStandardMaterial color={'red'} />
		</T.Mesh>

		<T.Mesh
			position={[0, vGaussPosi, zGauss + gLabelOffset2 + 15]}
			rotation.y={-Math.PI / 2}
			visible={true}
		>
			<Text
				text={formatWaistLabel(waistvalue)}
				color={'black'}
				fontSize={16}
				anchorX={'left'}
				anchorY={'middle'}
			/>
		</T.Mesh>
	</T.Group>
</T.Group>
