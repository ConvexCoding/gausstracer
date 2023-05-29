import { type Complex, Matrix2DxComplex, waistSize, beamProps } from '$lib/gcomplex';
import type Source from '$lib/source';
import type GaussOp from '$lib/gaussop';
import { points2ArrayX, toGrid } from '$lib/mathUtils';

	// define this interface - TODO: figure out how to do witout
export interface WaistPosi {
		waist: number;
		yscaled: number;
		zscaled: number;
	}

export function calcZend(gp: GaussOp[]) {
  let zend = 0;
  gp.forEach((op) => {
    if (op.type == 'distance') zend += op.value;
  });
  return zend;
}

// function for computing lens segs through system
export	function genLineSegs(
  gp: GaussOp[],
  source: Source,
  scaleY: number,
  zScale: number[][],
  zinc: number
): [Float32Array, Float32Array] {
  const tsource = source.clone();

  const zrj = tsource.rayleighDistance();
  let p: Complex = { real: 0, imag: zrj };

  const zsave: number[] = [];
  const wsave: number[] = [];
  const z: number[] = [];
  const w: number[] = [];

  let zbase = 0; // local beam path used to find waist
  let ztrack = 0; // this tracks the beam path in world z
  let offset = 0;
  gp.forEach((op) => {
    switch (op.type) {
      case 'distance':
        for (let d = 0; d <= op.value; d += zinc) {
          p.real = d + offset;
          ztrack = zbase + d;
          const wsize = waistSize(p, tsource, source.index);
          zsave.push(ztrack);
          wsave.push(wsize);
          z.push(toGrid(ztrack, zScale));
          w.push(wsize * scaleY);
        }
        offset = p.real; // do this in case the next surface is distance and not a lens
        break;
      case 'lens':
        p = Matrix2DxComplex(op.toMatrix2D(), p);
        //[znew, minwaist, roc, wz];
        offset = beamProps(p, tsource, 1.0)[0];  // index here is separated in case of inside lens
        break;
    }
    zbase = ztrack;
  });

  //saveTextToFile(converXYtoString(zsave, wsave), 'z-w.txt');
  //const temp = Math.max(...w);
  //maxY = setAxisLimits(0, temp)[1];
  const [plussegs, negsegs] = points2ArrayX(0, w, z);
  return [plussegs, negsegs];
}

// function for computing lens segs
export function findMinWaists(
  gp: GaussOp[], 
  tsource: Source, 
  scaleY: number,
  zScale: number[][] 
  ): WaistPosi[] {
  const zrj = tsource.rayleighDistance();
  let p: Complex = { real: 0, imag: zrj };

  let zbase = 0;
  let ztrack = 0;

  const wps: WaistPosi[] = [];

  gp.forEach((op) => {
    switch (op.type) {
      case 'distance':
        p.real += op.value;
        ztrack = zbase + op.value;
        break;
      case 'lens': {
        //  return [znew, minwaist, roc, wz];
        p = Matrix2DxComplex(op.toMatrix2D(), p);
        const [znew, waist, roc, ] = beamProps(p, tsource, 1.0); // n=1.0 is index will
        const zreal = ztrack - znew;
        if (Math.abs(roc) < 500 && zreal > 0 && zreal < 2020) {
          const w: WaistPosi = {
            waist: waist,
            yscaled: waist * scaleY,
            zscaled: toGrid(zreal, zScale)
          };
          wps.push(w);
        }
        break;
      }
    }
    zbase = ztrack;
  });
  return wps;
}

// this routine will find the waist size at each transform
export function findWaistSizes(gp: GaussOp[], tsource: Source): number[] {
  const zrj = tsource.rayleighDistance();
  let p: Complex = { real: 0, imag: zrj };

  let zbase = 0;
  let ztrack = 0;

  const wSizes: number[] = [];
  wSizes.push(beamProps(p, tsource, tsource.index)[3]);
  gp.forEach((op) => {
    switch (op.type) {
      case 'distance':
        p.real += op.value;
        ztrack = zbase + op.value;
        wSizes.push(beamProps(p, tsource, tsource.index)[3]);
        break;
      case 'lens':
        //  return [znew, minwaist, roc, wz];
        p = Matrix2DxComplex(op.toMatrix2D(), p);
        wSizes.push(beamProps(p, tsource, 1.0)[3]); // future change 1 to lens index if inside lens
        break;
    }
    zbase = ztrack;
  });
  return wSizes;
}

// generate lens items needed to plot
export function generateLensData(
  gp: GaussOp[], tsource: Source,
  scaleY: number,
  zScale: number[][]
): [number[], number[][], GaussOp[], number[][]] {


  const zrj = tsource.rayleighDistance();
  let p: Complex = { real: 0, imag: zrj };

  let zbase = 0;
  let ztrack = 0;

  const radius: number[] = [];
  const lensPosi: number[][] = [];
  const gop: GaussOp[] = [];
  const eflLabelPosi: number[][] = [];

  gp.forEach((op) => {
    switch (op.type) {
      case 'distance':
        p.real += op.value;
        ztrack = zbase + op.value;
        break;
      case 'lens': {
        p = Matrix2DxComplex(op.toMatrix2D(), p);
        const rtemp = waistSize(p, tsource, 1.0); // change 1 to material index if inside lens
        radius.push(rtemp * 1.15);
        lensPosi.push([0, 0, toGrid(ztrack, zScale)]);
        gop.push(op.clone());
        eflLabelPosi.push([0, 1.2 * rtemp * scaleY, toGrid(ztrack, zScale)]);
        break;
      }
    }
    zbase = ztrack;
  });
    return [radius, lensPosi, gop, eflLabelPosi];
}

// returns a list of indices for a given type of element
export function genTypeMap(gpin: GaussOp[], mapType: string) {
  const gpmap: number[] = [];

  gpin.forEach((element, index) => {
    if (element.type === mapType) {
      gpmap.push(index);
    }
  });
  return gpmap;
}