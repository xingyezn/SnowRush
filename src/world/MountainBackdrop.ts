import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';

/**
 * Distant low-poly peaks framing the course. Placed on a large ring with a
 * fixed base level so they read as a far-off range. No physics, no shadows and
 * no fog (they are pre-tinted to sit just beyond the fogged terrain).
 */
export class MountainBackdrop {
  private readonly mesh: THREE.InstancedMesh;

  constructor(scene: THREE.Scene) {
    const c = CONFIG.mountains;
    const rng = new Rng(CONFIG.course.seed ^ 0x9e3779b9);

    const geometry = new THREE.ConeGeometry(1, 1, 5);
    geometry.translate(0, 0.5, 0);

    const material = new THREE.MeshStandardMaterial({
      color: c.color,
      roughness: 1,
      flatShading: true,
      fog: false,
    });

    // Snow cap: fade the upper part of each peak to white (Fuji-like). The cone
    // geometry spans y 0..1, so a local-Y varying gives an instance-independent
    // snow line that scales with each mountain's height.
    material.onBeforeCompile = (shader) => {
      shader.uniforms.snowLine = { value: c.snowLine };
      shader.uniforms.snowColor = { value: new THREE.Color(c.snowColor) };
      shader.vertexShader = `varying float vPeakY;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vPeakY = position.y;',
      );
      shader.fragmentShader =
        `varying float vPeakY;\nuniform float snowLine;\nuniform vec3 snowColor;\n${shader.fragmentShader}`.replace(
          '#include <color_fragment>',
          `#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, snowColor, smoothstep(snowLine, snowLine + 0.18, vPeakY));`,
        );
    };
    material.customProgramCacheKey = () => `mountain-snow-${c.snowLine}`;

    const mesh = new THREE.InstancedMesh(geometry, material, c.count);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.mesh = mesh;

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < c.count; i++) {
      const angle = (i / c.count) * Math.PI * 2 + rng.range(-0.04, 0.04);
      const radius = rng.range(c.minRadius, c.maxRadius);
      const height = rng.range(c.minHeight, c.maxHeight);
      const baseRadius = height * rng.range(1.1, 1.9);

      quat.setFromAxisAngle(up, rng.range(0, Math.PI * 2));
      position.set(Math.cos(angle) * radius, c.baseY, Math.sin(angle) * radius);
      scale.set(baseRadius, height, baseRadius);
      matrix.compose(position, quat, scale);
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }

  /**
   * Keeps the range centred on the rider so the peaks stay at a fixed distance.
   * The bases sit below the lowest terrain (see CONFIG.mountains.baseY), so the
   * peaks always fill the horizon instead of opening a band of sky between the
   * terrain edge and the mountains.
   */
  update(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
  }
}
