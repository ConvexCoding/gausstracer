const ensureNumber = (value: number | string) => typeof value === "string" ? parseFloat(value) : value;
import { Matrix2D } from './gcomplex'

export default class GaussOp {
  type: 'distance' | 'lens'
  value: number  
  index: number
  color: string
  tag: boolean

  constructor(
    type: 'distance' | 'lens',
    value: number | string, 
    index: number | string = 1,
    color = 'lightblue',
    tag = false
  ) {
    this.type = type
    this.value = ensureNumber(value)
    this.index = ensureNumber(index)  
    this.color = color
    this.tag = tag
  }

  clone() {
    return new GaussOp(this.type, this.value, this.index, this.color, this.tag)
  }

  toMatrix2D()  {
    switch (this.type) {
      case 'distance':
        return new Matrix2D(1, this.value, 0, 1)
      case 'lens':
        return new Matrix2D(1, 0, -1 / this.value, 1)
      default:
        return new Matrix2D(1, 0, 0, 1)
    }
  }
}

export function combineAdjacentDistances(gaussOps: GaussOp[]): void {
  const adjops: number[] = [];
  for (let i = 0; i < gaussOps.length - 1; i++) {
    if (gaussOps[i].type === 'distance' && gaussOps[i + 1].type === 'distance') {
      adjops.push(i);
    }
  }
  if (adjops.length === 0) return;
    // remove them in reverse order
  for (let i = adjops.length - 1; i >= 0; i--) {
    const index = adjops[i];
    gaussOps[index].value += gaussOps[index + 1].value;
    gaussOps.splice(index + 1, 1);
  }
}

export function distanceTo(gops: GaussOp[], index: number): number {
  let dist = 0;
  for (let i = 0; i < index; i++) {
    if (gops[i].type === 'distance') {
      dist += gops[i].value;
    }
  }
  return dist;
}

export function findIndex(gops: GaussOp[], z: number): number {
  let index = -1;
  let A = 0;
  for (let i = 0; i < gops.length; i++) {
    if (gops[i].type === 'distance') {
      const B = A + gops[i].value;
      if (z > A && z < B) {
        index = i;
        break;
      } else {
        A += gops[i].value;
      }
    }
  }
  return index;
}

export function addLens(gops: GaussOp[], trackz: number): void {
  const newIndex = findIndex(gops, trackz);
    const dsum = gops[newIndex].value;
    gops[newIndex].value = trackz - distanceTo(gops, newIndex);
    gops.splice(newIndex + 1, 0, new GaussOp('lens', 3000, 1, 'blue'));
    gops.splice(newIndex + 2, 0, new GaussOp('distance', dsum - gops[newIndex].value));
}

