/*
import {
  type Complex,
  type Matrix2D,
  Reciprocal,
  Matrix2DxComplex,
  waistSize,
  beamProps,
} from '$lib/Gcomplex'


export function findMinMaxGauss(waist: number, wavelength: number): [number, number] {
  traces[0].efl = lensf
  let zrj = (Math.PI * waist * waist * n) / ((wavelength * msq) / 1000)
  let p2: Complex
  let zoffset = 0

  traces.forEach((trace, index) => {
    if (index > 0) {
      const mlens = { A: 1, B: 0, C: -1 / trace.efl, D: 1 }
      p2 = Matrix2DxComplex(mlens, p2)
      const [znew, minwaist, roc, wzsize] = beamProps(p2, wavelvalue, msq, n)
      zrj = (Math.PI * minwaist * minwaist * n) / ((wavelength * msq) / 1000)
      zoffset = traces[index - 1].end - znew
    }
  })


  return 
}

  */