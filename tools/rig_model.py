"""Auto-rig a static GLB with a simple spine and a looping "Idle" clip.

Usage:
  blender --background --python tools/rig_model.py -- <input.glb> <output.glb>

Blender's automatic (bone-heat) weighting often fails on single-surface AI
meshes, so this builds explicit distance-based vertex weights along a five-bone
spine (Root/Hips/Spine/Chest/Head) fitted to the model's tallest axis, then
adds a gentle sway. Produces a skinned GLB with one clip named "Idle".

This is how public/models/{runer,panda}.glb got their skeletal animation.
"""

import bpy, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

mesh = next(o for o in bpy.data.objects if o.type == "MESH")

# Bake the import transform so mesh-local space == world space.
bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

verts = [v.co.copy() for v in mesh.data.vertices]
mn = Vector((min(v.x for v in verts), min(v.y for v in verts), min(v.z for v in verts)))
mx = Vector((max(v.x for v in verts), max(v.y for v in verts), max(v.z for v in verts)))
size = mx - mn
up = max(range(3), key=lambda i: size[i])
print("UP_AXIS", "xyz"[up], "size", tuple(round(v, 3) for v in size))

center = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, (mn.z + mx.z) / 2))


def point(f):
    p = center.copy()
    p[up] = mn[up] + size[up] * f
    return p


arm_data = bpy.data.armatures.new("rig")
arm = bpy.data.objects.new("rig", arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
eb = arm_data.edit_bones

specs = [
    ("Root", 0.02, 0.16, None),
    ("Hips", 0.16, 0.42, "Root"),
    ("Spine", 0.42, 0.66, "Hips"),
    ("Chest", 0.66, 0.88, "Spine"),
    ("Head", 0.88, 1.0, "Chest"),
]
segments = {}
made = {}
for name, f0, f1, parent in specs:
    b = eb.new(name)
    b.head = point(f0)
    b.tail = point(f1)
    if parent:
        b.parent = made[parent]
    made[name] = b
    segments[name] = (b.head.copy(), b.tail.copy())
bpy.ops.object.mode_set(mode="OBJECT")


def dist_seg(p, a, b):
    ab = b - a
    denom = ab.length_squared
    t = 0.0 if denom == 0 else max(0.0, min(1.0, (p - a).dot(ab) / denom))
    return (p - (a + ab * t)).length


names = [s[0] for s in specs]
groups = {n: mesh.vertex_groups.new(name=n) for n in names}
for vi, v in enumerate(verts):
    ws = [1.0 / (dist_seg(v, *segments[n]) + 1e-3) ** 4 for n in names]
    total = sum(ws)
    for n, w in zip(names, ws):
        groups[n].add([vi], w / total, "REPLACE")

mod = mesh.modifiers.new(name="Armature", type="ARMATURE")
mod.object = arm
mesh.parent = arm
mesh.matrix_parent_inverse = arm.matrix_world.inverted()

for pb in arm.pose.bones:
    pb.rotation_mode = "XYZ"
action = bpy.data.actions.new("Idle")
arm.animation_data_create()
arm.animation_data.action = action

phase = {1: 0.0, 16: 1.0, 31: 0.0, 46: -1.0, 61: 0.0}
bpy.ops.object.mode_set(mode="POSE")
for f, s in phase.items():
    bpy.context.scene.frame_set(f)
    amt = {"Hips": (4, 3), "Spine": (5, -3), "Chest": (6, 3), "Head": (-5, 5)}
    for name, (rx, rz) in amt.items():
        pb = arm.pose.bones[name]
        pb.rotation_euler = (math.radians(rx) * s, 0.0, math.radians(rz) * s)
        pb.keyframe_insert("rotation_euler", frame=f)
bpy.ops.object.mode_set(mode="OBJECT")


def snapshot(frame):
    bpy.context.scene.frame_set(frame)
    deps = bpy.context.evaluated_depsgraph_get()
    ev = mesh.evaluated_get(deps)
    m = ev.to_mesh()
    pts = [v.co.copy() for v in m.vertices]
    ev.to_mesh_clear()
    return pts


a = snapshot(1)
b = snapshot(16)
print("MAXDISP", round(max(((x - y).length for x, y in zip(a, b)), default=0.0), 5))

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    export_image_format="WEBP",
    export_animations=True,
    export_skins=True,
)
print("EXPORTED", dst)
