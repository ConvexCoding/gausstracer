import type { Object3D } from "three";

export function getMeshIndex(e: MouseEvent, type: string) {
  if (Object.keys(e).includes('object')) {
    const objInfo = e['object' as keyof MouseEvent] as unknown as Object3D;
    if (Object.keys(objInfo).includes('name')) {
      const name = objInfo['name' as keyof Object3D] as unknown as string;
      if (name.includes(type)) {
        return parseInt(name.slice(-1));
      }
    }
  }
  return -1;
}