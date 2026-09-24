"""Prepare a rigged FBX character for SnowRush.

Usage:
  blender --background --python tools/prepare_rigged_fbx.py -- \
      <input.fbx> <output.glb> <targetTris> <maxTextureSize>

Keeps the existing skeleton + animation, decimates the skinned mesh (Decimate
moved before the Armature modifier so it applies cleanly) and shrinks textures.
Scaling to the game height is done at load (ModelLibrary.buildRider).
"""

import bpy
import sys

argv = sys.argv[sys.argv.index("--") + 1:]
src, dst = argv[0], argv[1]
target_tris = int(argv[2]) if len(argv) > 2 else 12000
max_tex = int(argv[3]) if len(argv) > 3 else 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)

mesh = next(o for o in bpy.data.objects if o.type == "MESH")
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh

orig = len(mesh.data.polygons)
ratio = min(1.0, target_tris / max(1, orig))
if ratio < 1.0:
    mod = mesh.modifiers.new("dec", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = ratio
    # Decimate must run before the Armature modifier to apply cleanly.
    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    bpy.ops.object.modifier_apply(modifier=mod.name)
print("DECIMATED", orig, "->", len(mesh.data.polygons))

for img in bpy.data.images:
    w, h = img.size
    if max(w, h) > max_tex:
        scale = max_tex / max(w, h)
        img.scale(max(1, int(w * scale)), max(1, int(h * scale)))
        print("IMG", img.name, (w, h), "->", tuple(img.size))

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_image_format="WEBP",
    export_animations=True,
    export_skins=True,
)
print("EXPORTED", dst)
