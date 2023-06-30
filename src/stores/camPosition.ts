import { cubicOut } from 'svelte/easing';
import { tweened } from 'svelte/motion';

export const camPosition = tweened(
	{ x: -300, y: 0, z: 0 },
	{
		duration: 5000,
		easing: cubicOut
	}
);

export const lookPosition = tweened(  
	{ x: 0, y: 0, z: 300 },
	{
		duration: 5000,
		easing: cubicOut
	}
);