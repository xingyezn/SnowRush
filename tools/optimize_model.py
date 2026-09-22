"""Decimate + texture-resize a GLB with Blender (headless).

Usage:
  blender --background --python tools/optimize_model.py -- \
      <input.glb> <output.glb> <ratio> <maxTextureSize>

`ratio` is the Decimate modifier ratio (e.g. 0.03 keeps ~3% of the triangles);
`maxTextureSize` caps each embedded texture (e.g. 1024). Images are re-encoded
as WebP on export, which is what shrinks the file the most.

This is how public/models/{runer,panda}.glb were produced from the owner's
source models; keep it for reproducibility.
"""

import bpy, sys

argv = sys.argv[sys.argv.index("--") + 1:]
src, dst = argv[0], argv[1]
ratio = float(argv[2])
maxtex = int(argv[3])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

bpy.ops.object.select_all(action="DESELECT")
for o in list(bpy.data.objects):
    if o.type != "MESH":
        continue
    orig = len(o.data.polygons)
    if ratio < 1.0 and orig > 0:
        bpy.context.view_layer.objects.active = o
        m = o.modifiers.new("dec", "DECIMATE")
        m.decimate_type = "COLLAPSE"
        m.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=m.name)
    print("MESH", o.name, orig, "->", len(o.data.polygons))

for img in bpy.data.images:
    w, h = img.size
    if max(w, h) > maxtex:
        scale = maxtex / max(w, h)
        img.scale(max(1, int(w * scale)), max(1, int(h * scale)))
        print("IMG", img.name, (w, h), "->", tuple(img.size))

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_image_format="WEBP",
    export_animations=True,
)
print("EXPORTED", dst)
