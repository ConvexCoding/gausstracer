import type Source from "./source";

export interface Complex {
  real: number;
  imag: number;
}

export class Matrix2D {
  A: number;
  B: number;
  C: number;
  D: number;

  constructor(A: number, B: number, C: number, D: number) {
    this.A = A;
    this.B = B;
    this.C = C;
    this.D = D;
  }

  clone() { return new Matrix2D(this.A, this.B, this.C, this.D) }
}

export function addComplex(z1: Complex, z2: Complex): Complex {
  return { real: z1.real + z2.real, imag: z1.imag + z2.imag };
}

export function Reciprocal(z: Complex): Complex {
  const denom = z.real * z.real + z.imag * z.imag;
    return {real: z.real/denom, imag: -z.imag / denom};
}

export function divide(x: Complex, y: Complex): Complex {
  const q = y.real ** 2 + y.imag ** 2;
  const real = (x.real * y.real + x.imag * y.imag) / q;
  const imag = (x.imag * y.real - x.real * y.imag) / q;
  return { real, imag };
}

export function Matrix2DxComplex(m: Matrix2D, q: Complex): Complex {
  //qprime = (A * q + B ) / (C * q + D) 

  const x: Complex = {real: m.A * q.real + m.B, imag: m.A * q.imag}
  const y: Complex = {real: m.C * q.real + m.D, imag: m.C * q.imag}

  return divide(x, y)
}

export function waistSize(q: Complex, src: Source, n: number): number {
    // x = ((λ * msq / 1000) / (Math.PI * wz^2))
  // Math.PI * wz^2 = ((λ * msq / 1000) / x)
  // wz^2 = ((λ * msq / 1000) / (Math.PI * x))

  //let wz = Math.sqrt((λ * msq) / 1000 / (Math.PI * x))
  //console.log('🚀 ~ wz:', wz)

  // 1/q(z) = 1/R(z) - i ((λ msq) / (π w(z)^2)) 
  const wz = Math.sqrt((-src.wavelength * src.msq) / 1000 / (n * Math.PI * Reciprocal(q).imag))

  return wz;
}

export function waistSize2(q: Complex, λ: number, msq: number, n: number): number {
  // x = ((λ * msq / 1000) / (Math.PI * wz^2))
// Math.PI * wz^2 = ((λ * msq / 1000) / x)
// wz^2 = ((λ * msq / 1000) / (Math.PI * x))

//let wz = Math.sqrt((λ * msq) / 1000 / (Math.PI * x))
//console.log('🚀 ~ wz:', wz)

// 1/q(z) = 1/R(z) - i ((λ msq) / (π w(z)^2)) 
const wz = Math.sqrt((-λ * msq) / 1000 / (n * Math.PI * Reciprocal(q).imag))

return wz;
}

export function beamProps(q: Complex, src: Source, n: number): [number, number, number, number] {
  const qrecip = Reciprocal(q)
  const wz = Math.sqrt((-src.wavelength * src.msq) / 1000 / (n * Math.PI * qrecip.imag))
  const znew = q.real
  const roc = 1 / qrecip.real
  // zr = π w(z)^2 / λ
  // w(z) = sqrt((λ * msq/ 1000) * zr / (π * n) )
  const minwaist = Math.sqrt((src.wavelength * src.msq/ 1000) * q.imag / (Math.PI * n) )
  return [znew, minwaist, roc, wz];
  }

export function beamProps2(q: Complex, λ: number, msq: number, n: number): [number, number, number, number] {

  const qrecip = Reciprocal(q)
  const radius = Math.sqrt((-λ * msq) / 1000 / (n * Math.PI * qrecip.imag))
  
  const znew = q.real
  const roc = 1 / qrecip.real
  // zr = π w(z)^2 / λ
  // w(z) = sqrt((λ * msq/ 1000) * zr / (π * n) )
  const waist = Math.sqrt((λ * msq/ 1000) * q.imag / (Math.PI * n) )
  // znew is the location of the beam waist
  // waist is the size of beam at the waist location
  // roc is the radius of curvature at the current location
  // radius is the beam waist at the current location
  return [znew, waist, roc, radius];
  }

