import { cubicOut } from 'svelte/easing';
import { tweened } from 'svelte/motion';

export const camPosition = tweened(
	{ x: -300, y: 0, z: 0 },
	{
		duration: 5000,
		easing: cubicOut
	}
);

export const lookAtPosition = tweened(
	{ x: 0, y: 0, z: 0 },
	{
		duration: 2000,
		easing: cubicOut
	}
);

export const camScale = tweened(
	{ x: 0.6, y: 0.6, z: 0.6 },
	{
		duration: 2000,
		easing: cubicOut
	}
);
