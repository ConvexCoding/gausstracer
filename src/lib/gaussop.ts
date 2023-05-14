const ensureNumber = (value: number | string) => typeof value === "string" ? parseFloat(value) : value;
import { Matrix2D } from './gcomplex'

export default class GaussOp {
  type: 'distance' | 'lens'
  value: number  
  index: number

  constructor(
    type: 'distance' | 'lens',
    value: number | string, 
    index: number | string = 1,
  ) {
    this.type = type
    this.value = ensureNumber(value)
    this.index = ensureNumber(index)  }


  clone() {
    return new GaussOp(this.type, this.value, this.index)
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
