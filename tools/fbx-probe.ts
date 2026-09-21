import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const path = process.argv[2] ?? 'public/models/rider.fbx';
const buffer = readFileSync(path);
const loader = new FBXLoader();
const object = loader.parse(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  '',
);

console.log('file:', path);
console.log(
  'animations:',
  object.animations.map((clip) => `${clip.name}(${clip.duration.toFixed(2)}s)`).join(', ') || 'none',
);

const box = new THREE.Box3().setFromObject(object);
console.log(
  'bbox:',
  box.min.toArray().map((n) => n.toFixed(3)).join(','),
  '->',
  box.max.toArray().map((n) => n.toFixed(3)).join(','),
);

let meshes = 0;
let skinned = 0;
let bones = 0;
const materials = new Set<string>();
object.traverse((child) => {
  const anyChild = child as unknown as { isMesh?: boolean; isSkinnedMesh?: boolean; isBone?: boolean };
  if (anyChild.isMesh) meshes++;
  if (anyChild.isSkinnedMesh) skinned++;
  if (anyChild.isBone) bones++;
  const mesh = child as THREE.Mesh;
  if (mesh.material) {
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) materials.add(material.name || material.type);
  }
});
console.log('meshes:', meshes, 'skinned:', skinned, 'bones:', bones);
console.log('materials:', [...materials].join(', '));
