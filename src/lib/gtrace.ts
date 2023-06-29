import { type Complex, Matrix2DxComplex, waistSize, beamProps } from '$lib/gcomplex';
import type Source from '$lib/source';
import type GaussOp from '$lib/gaussop';
import { genLensLathe2, points2ArrayX, pointsToFloat32ArrayX, toGrid } from '$lib/mathUtils';
import type { LatheGeometry } from 'three';

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
        offset = beamProps(p, tsource, tsource.index)[0];  // index here is separated in case of inside lens
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

// function for computing lens segs through system
export	function genLineSegArray(
  gp: GaussOp[],
  source: Source,
  scaleY: number,
  zScale: number[][],
  zinc: number
): [Float32Array[], Float32Array[]] {
  const tsource = source.clone();

  const zrj = tsource.rayleighDistance();
  let p: Complex = { real: 0, imag: zrj };

  const zsave: number[] = [];
  const wsave: number[] = [];

  const psegs: Float32Array[] = [];
  const nsegs: Float32Array[] = [];


  let zbase = 0; // local beam path used to find waist
  let ztrack = 0; // this tracks the beam path in world z
  let offset = 0;
  gp.forEach((op) => {
    switch (op.type) {
      case 'distance': {
        const z: number[] = [];
        const w: number[] = [];
        for (let d = 0; d <= op.value; d += zinc) {
          p.real = d + offset;
          ztrack = zbase + d;
          const wsize = waistSize(p, tsource, source.index);
          zsave.push(ztrack);
          wsave.push(wsize);
          z.push(toGrid(ztrack, zScale));
          w.push(wsize * scaleY);
        }
        const [plus, neg] = points2ArrayX(0, w, z);
        psegs.push(plus);
        nsegs.push(neg);
        offset = p.real; // do this in case the next surface is distance and not a lens
        break;
      }
      case 'lens':
        p = Matrix2DxComplex(op.toMatrix2D(), p);
        //[znew, minwaist, roc, wz];
        offset = beamProps(p, tsource, tsource.index)[0];  // index here is separated in case of inside lens
        break;
    }
    zbase = ztrack;
  });

  //saveTextToFile(converXYtoString(zsave, wsave), 'z-w.txt');
  //const temp = Math.max(...w);
  //maxY = setAxisLimits(0, temp)[1];

  return [psegs, nsegs];
}

export	function gaussProfile( waist: number, iMag: number): Float32Array {
  const x: number[] = [];
  const I: number[] = [];

  for (let r = -1.5*waist; r <= 1.5*waist; r += 0.1) {
    x.push(r);
    I.push(iMag * Math.exp(-2 * r * r / (waist * waist)));
  }
  const data = pointsToFloat32ArrayX(0, I, x);
  //console.log(data)
  return data;
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
        const [znew, waist, roc, ] = beamProps(p, tsource, tsource.index); // n=1.0 is index will
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
        wSizes.push(beamProps(p, tsource, tsource.index)[3]); // future change 1 to lens index if inside lens
        break;
    }
    zbase = ztrack;
  });
  return wSizes;
}

// generate lens items needed to plot
export function generateLensData(
  gp: GaussOp[], tsource: Source,
  scaleZ: number,
  scaleY: number,
  zScale: number[][]
): [number[], [number, number, number][], GaussOp[], number[], [number, number, number][], LatheGeometry[]] {


  const zrj = tsource.rayleighDistance();
  let p: Complex = { real: 0, imag: zrj };

  let zbase = 0;
  let ztrack = 0;

  const radius: number[] = [];
  const lensPosi: [number, number, number][] = [];
  const gop: GaussOp[] = [];
  const gopIndex: number[] = [];
  const eflLabelPosi: [number, number, number][] = [];
  const geos: LatheGeometry[] = [];

  gp.forEach((op, index) => {
    switch (op.type) {
      case 'distance':
        p.real += op.value;
        ztrack = zbase + op.value;
        break;
      case 'lens': {
        p = Matrix2DxComplex(op.toMatrix2D(), p);
        const rtemp = waistSize(p, tsource, tsource.index); // change 1 to material index if inside lens
        radius.push(rtemp * 1.5);
        const posi: [number, number, number] = [0, 0, toGrid(ztrack, zScale)];
        lensPosi.push(posi);
        gop.push(op.clone());
        gopIndex.push(index);
        eflLabelPosi.push([0, 1.5 * rtemp * scaleY, toGrid(ztrack, zScale)]);
        geos.push(genLensLathe2(rtemp * 1.4, op.value, scaleZ, scaleY));
        break;
      }
    }
    zbase = ztrack;
  });
  return [radius, lensPosi, gop, gopIndex, eflLabelPosi, geos];
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