"""Render a same-named preview PNG for every model in a folder.

Usage:
  blender --background --python tools/render_model_previews.py -- <models_dir>

For each .glb / .gltf / .fbx it writes `<basename>.png` next to the model using
the Workbench engine (textured, studio light) so the owner can preview assets.
"""

import glob
import os
import sys

import bpy
from mathutils import Vector

MODELS_DIR = sys.argv[sys.argv.index("--") + 1:]
MODELS_DIR = MODELS_DIR[0] if MODELS_DIR else "public/models"


def import_model(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ext = path.rsplit(".", 1)[-1].lower()
    if ext in ("glb", "gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == "fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    else:
        raise ValueError(f"unsupported: {path}")

    # Blender's glTF importer leaves a phantom unit "Icosphere" behind for some
    # skinned files; it is not part of the asset and would ruin the framing.
    for obj in list(bpy.data.objects):
        if obj.name.startswith("Icosphere"):
            bpy.data.objects.remove(obj, do_unlink=True)


def scene_bounds():
    # Use real vertices: an imported armature's bound_box can be empty and
    # would throw the framing off.
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        m = o.matrix_world
        for v in o.data.vertices:
            p = m @ v.co
            mn = Vector((min(mn[i], p[i]) for i in range(3)))
            mx = Vector((max(mx[i], p[i]) for i in range(3)))
    return mn, mx


def render(path, out):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = True
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("W")
    scene.world.color = (0.86, 0.91, 0.96)

    mn, mx = scene_bounds()
    center = (mn + mx) / 2
    span = max((mx - mn).x, (mx - mn).y, (mx - mn).z, 0.001)

    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = span * 1.25
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    pos = center + Vector((span * 1.1, -span * 1.1, span * 0.6))
    cam.location = pos
    cam.rotation_euler = (center - pos).to_track_quat("-Z", "Y").to_euler()

    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)


def main():
    patterns = ("*.glb", "*.gltf", "*.fbx")
    files = []
    for pattern in patterns:
        files.extend(glob.glob(os.path.join(MODELS_DIR, pattern)))
        files.extend(glob.glob(os.path.join(MODELS_DIR, pattern.upper())))
    files = sorted(set(files))
    print("PREVIEW_TARGETS", len(files))
    for path in files:
        base = os.path.splitext(path)[0]
        out = f"{base}.png"
        try:
            import_model(path)
            render(path, out)
            print("PREVIEW", os.path.basename(out))
        except Exception as error:  # keep going for the rest of the folder
            print("PREVIEW_FAILED", path, error)


main()
