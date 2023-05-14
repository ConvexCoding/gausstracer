<script lang="ts">
  import { T } from '@threlte/core'
  import { Text } from '@threlte/extras'
  import { BufferGeometry, LineDashedMaterial, Vector3 } from 'three'

  export let vsz: number = 0
  export let vsy0: number = 0
  export let vsy1: number = 0
  export let arrow = 0
  export let label = 'W0'
  export let textAX = 'center'
  export let textAY = 'top'
  export let lineColor = 0xff0000
  export let textColor = 0x000000
  export let isVisible = true
  export let setTextAngle = false

  let v0: Vector3 = new Vector3(0, vsy0, vsz)
  let v1: Vector3 = new Vector3(0, vsy1, vsz)

  let textRotation = 0

  if (setTextAngle) {
    textRotation = -Math.atan2(v1.y - v0.y, v1.z - v0.z)
  }

  let labelPosition: [number, number, number] = [0, vsy0, vsz]

  let coneLength = 12
  let coneBase = 3

  let coneAngle1 = Math.atan2(v0.z - v1.z, v0.y - v1.y)
  let conePosition1: [number, number, number] = [
    v0.x,
    v0.y - (Math.cos(coneAngle1) * coneLength) / 2,
    v0.z - (Math.sin(coneAngle1) * coneLength) / 2,
  ]

  let coneAngle2 = Math.atan2(v1.z - v0.z, v1.y - v0.y)
  let conePosition2: [number, number, number] = [
    v1.x,
    v1.y - (Math.cos(coneAngle2) * coneLength) / 2,
    v1.z - (Math.sin(coneAngle2) * coneLength) / 2,
  ]
</script>

<T.Group visible={isVisible}>
  <T.Mesh>
    <T.Line
      geometry={new BufferGeometry().setFromPoints([v0, v1])}
      material={new LineDashedMaterial({ color: lineColor, dashSize: 5, gapSize: 5 })}
    />
  </T.Mesh>

  <!-- End Point Arrow -->
  {#if arrow === 2 || arrow === 3}
    <T.Mesh position={conePosition2} rotation.x={coneAngle2}>
      <T.ConeGeometry args={[coneBase, coneLength]} />
      <T.MeshStandardMaterial color={'red'} />
    </T.Mesh>
  {/if}

  {#if arrow === 1 || arrow === 3}
    <T.Mesh position={conePosition1} rotation.x={coneAngle1}>
      <T.ConeGeometry args={[coneBase, coneLength]} />
      <T.MeshStandardMaterial color={'red'} />
    </T.Mesh>
  {/if}

  <!-- Label mid Line -->
  <T.Mesh
    position={labelPosition}
    rotation.y={-Math.PI / 2}
    rotation.x={textRotation}
    visible={true}
  >
    <Text text={label} color={textColor} fontSize={8} anchorX={textAX} anchorY={textAY} />
  </T.Mesh>
</T.Group>
