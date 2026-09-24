"""Build the SnowRush panda snowboarder: procedural low-poly mesh + humanoid rig.

Usage:
  blender --background --python tools/build_panda_snowboarder.py -- \
      <out.glb> [preview_dir]

What it produces (public/models/panda_snowboarder.glb by default):

  * One skinned low-poly character ("PandaSnowboarder") made of joined
    primitives: white panda head, black ears / eye patches, red (China-red)
    ski jacket, navy ski pants, black gloves / boots / helmet, blue goggles,
    plus a rigid snowboard.
  * A game-ready humanoid skeleton (Root -> Pelvis -> spine / arms / legs)
    with two-bone leg IK (Foot_IK + Knee_Pole) and an independent Board bone.
  * Deterministic per-part skin weights (distance-weighted inside a bone
    whitelist per body part), so the left leg can never pull the right leg and
    rigid props (helmet / goggles / boots / board) never shear.
  * Five in-place clips at 30 FPS: SkiIdle, Jump, Air, Landing, Crash.

The rig faces Blender -Y, which the glTF exporter turns into +Z (Three.js).
The matching character yaw is therefore PI (see ModelLibrary.ts).
"""

import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
PREVIEW_DIR = argv[1] if len(argv) > 1 else None

D = math.radians
FPS = 30


# --------------------------------------------------------------------------- #
# Scene bootstrap
# --------------------------------------------------------------------------- #
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = 40


# --------------------------------------------------------------------------- #
# Materials
# --------------------------------------------------------------------------- #
def make_material(name, color, roughness=0.75, metallic=0.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (color[0], color[1], color[2], 1.0)  # Workbench preview
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None:
        for socket in ("Emission Color", "Emission"):
            if socket in bsdf.inputs:
                bsdf.inputs[socket].default_value = (emission[0], emission[1], emission[2], 1.0)
                break
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 1.0
    return mat


M_FUR_WHITE = make_material("Fur_White", (0.93, 0.93, 0.95), 0.85)
M_FUR_BLACK = make_material("Fur_Black", (0.055, 0.055, 0.07), 0.8)
M_JACKET = make_material("Jacket_Red", (0.72, 0.075, 0.09), 0.6)
M_JACKET_DARK = make_material("Jacket_Dark", (0.42, 0.045, 0.06), 0.6)
M_PANTS = make_material("Pants_Navy", (0.075, 0.11, 0.28), 0.7)
M_GLOVE = make_material("Glove_Black", (0.045, 0.045, 0.055), 0.7)
M_BOOT = make_material("Boot_Black", (0.035, 0.035, 0.045), 0.55)
M_HELMET = make_material("Helmet_Black", (0.07, 0.07, 0.09), 0.35)
M_GOGGLE = make_material("Goggle_Blue", (0.09, 0.32, 0.85), 0.15, emission=(0.05, 0.18, 0.5))
M_BOARD = make_material("Board_Dark", (0.075, 0.09, 0.13), 0.5)
M_BOARD_ACCENT = make_material("Board_Red", (0.78, 0.12, 0.14), 0.45)
M_METAL = make_material("Board_Binding", (0.16, 0.17, 0.19), 0.4, metallic=0.6)


# --------------------------------------------------------------------------- #
# Armature (A-pose, character faces -Y)
# --------------------------------------------------------------------------- #
ARM_ANGLE = D(38)          # A-pose arm angle from vertical
UPPER_ARM = 0.26
FORE_ARM = 0.24
HAND_LEN = 0.09
SHOULDER = Vector((0.19, 0.0, 1.37))
ARM_DIR = Vector((math.sin(ARM_ANGLE), 0.0, -math.cos(ARM_ANGLE)))
ELBOW = SHOULDER + ARM_DIR * UPPER_ARM
WRIST = ELBOW + ARM_DIR * FORE_ARM
HAND_TIP = WRIST + ARM_DIR * HAND_LEN

# name, head, tail, parent, deform
BONES = [
    ("Root", (0.0, 0.0, 0.0), (0.0, 0.0, 0.10), None, False),
    ("Pelvis", (0.0, 0.0, 0.86), (0.0, 0.0, 1.00), "Root", True),
    ("Spine_01", (0.0, 0.0, 1.00), (0.0, 0.0, 1.14), "Pelvis", True),
    ("Spine_02", (0.0, 0.0, 1.14), (0.0, 0.0, 1.28), "Spine_01", True),
    ("Chest", (0.0, 0.0, 1.28), (0.0, 0.0, 1.40), "Spine_02", True),
    ("Neck", (0.0, 0.0, 1.40), (0.0, 0.0, 1.50), "Chest", True),
    ("Head", (0.0, 0.0, 1.50), (0.0, 0.0, 1.74), "Neck", True),
    ("Shoulder_L", (0.06, 0.0, 1.38), tuple(SHOULDER), "Chest", True),
    ("UpperArm_L", tuple(SHOULDER), tuple(ELBOW), "Shoulder_L", True),
    ("Forearm_L", tuple(ELBOW), tuple(WRIST), "UpperArm_L", True),
    ("Hand_L", tuple(WRIST), tuple(HAND_TIP), "Forearm_L", True),
    ("Shoulder_R", (-0.06, 0.0, 1.38), (-SHOULDER.x, SHOULDER.y, SHOULDER.z), "Chest", True),
    ("UpperArm_R", (-SHOULDER.x, 0, SHOULDER.z), (-ELBOW.x, 0, ELBOW.z), "Shoulder_R", True),
    ("Forearm_R", (-ELBOW.x, 0, ELBOW.z), (-WRIST.x, 0, WRIST.z), "UpperArm_R", True),
    ("Hand_R", (-WRIST.x, 0, WRIST.z), (-HAND_TIP.x, 0, HAND_TIP.z), "Forearm_R", True),
    # Legs start with a tiny forward knee bend so IK has a stable bend plane.
    ("Thigh_L", (0.11, 0.0, 0.86), (0.12, -0.03, 0.45), "Pelvis", True),
    ("Shin_L", (0.12, -0.03, 0.45), (0.12, 0.0, 0.12), "Thigh_L", True),
    ("Foot_L", (0.12, 0.0, 0.12), (0.12, -0.21, 0.055), "Shin_L", True),
    ("Thigh_R", (-0.11, 0.0, 0.86), (-0.12, -0.03, 0.45), "Pelvis", True),
    ("Shin_R", (-0.12, -0.03, 0.45), (-0.12, 0.0, 0.12), "Thigh_R", True),
    ("Foot_R", (-0.12, 0.0, 0.12), (-0.12, -0.21, 0.055), "Shin_R", True),
    # IK helpers (non-deforming control bones). Blender's bone-target IK uses the
    # target bone's *tail*, so the tails sit exactly on the rest ankles.
    ("Foot_IK_L", (0.12, 0.16, 0.12), (0.12, 0.0, 0.12), "Root", False),
    ("Foot_IK_R", (-0.12, 0.16, 0.12), (-0.12, 0.0, 0.12), "Root", False),
    ("Knee_Pole_L", (0.12, -0.65, 0.45), (0.12, -0.82, 0.45), "Root", False),
    ("Knee_Pole_R", (-0.12, -0.65, 0.45), (-0.12, -0.82, 0.45), "Root", False),
    # Rigid snowboard control bone.
    ("Board", (0.0, 0.0, 0.0), (0.0, -0.5, 0.0), "Root", True),
]

arm_data = bpy.data.armatures.new("PandaArmature")
arm = bpy.data.objects.new("PandaRig", arm_data)
scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm

bpy.ops.object.mode_set(mode="EDIT")
eb = arm_data.edit_bones
for name, head, tail, parent, deform in BONES:
    b = eb.new(name)
    b.head = head
    b.tail = tail
    b.use_deform = deform
    if parent:
        b.parent = eb[parent]
        b.use_connect = False

SEGMENTS = {name: (Vector(head), Vector(tail)) for name, head, tail, _, _ in BONES}
bpy.ops.object.mode_set(mode="OBJECT")


def local_delta(bone, world_delta):
    """Convert a world-space offset into a pose-bone local translation."""
    m = arm_data.bones[bone].matrix_local.to_3x3()
    return m.inverted() @ Vector(world_delta)


# Two-bone leg IK: Shin (chain 2 = Shin + Thigh) is solved to Foot_IK.
for side in ("L", "R"):
    con = arm.pose.bones[f"Shin_{side}"].constraints.new("IK")
    con.target = arm
    con.subtarget = f"Foot_IK_{side}"
    con.pole_target = arm
    con.pole_subtarget = f"Knee_Pole_{side}"
    con.chain_count = 2
    con.pole_angle = 0.0

for pb in arm.pose.bones:
    pb.rotation_mode = "XYZ"

# Auto-pick the pole angle that bends both knees *forward* (-Y), never backward.
_test = arm.pose.bones["Pelvis"]
_test.location = local_delta("Pelvis", (0, 0, -0.15))
for side in ("L", "R"):
    best_angle, best_y = 0.0, 1e9
    for candidate in (0.0, math.pi / 2, math.pi, -math.pi / 2):
        arm.pose.bones[f"Shin_{side}"].constraints[0].pole_angle = candidate
        bpy.context.view_layer.update()
        knee_y = arm.pose.bones[f"Shin_{side}"].head.y
        if knee_y < best_y:
            best_angle, best_y = candidate, knee_y
    arm.pose.bones[f"Shin_{side}"].constraints[0].pole_angle = best_angle
    bpy.context.view_layer.update()
    print("KNEE_FINAL", side, "angle", round(best_angle, 3), "y", round(best_y, 4))
_test.location = (0, 0, 0)
bpy.context.view_layer.update()


# --------------------------------------------------------------------------- #
# Mesh building helpers
# --------------------------------------------------------------------------- #
PARTS = []


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def dist_segment(p, a, b):
    ab = b - a
    denom = ab.length_squared
    t = 0.0 if denom == 0 else max(0.0, min(1.0, (p - a).dot(ab) / denom))
    return (p - (a + ab * t)).length


def finish(obj, name, material, bones, power=4.0):
    obj.name = name
    activate(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    if not obj.vertex_groups:
        for bone in bones:
            obj.vertex_groups.new(name=bone)
    for vert in obj.data.vertices:
        p = obj.matrix_world @ vert.co
        weights = [1.0 / ((dist_segment(p, *SEGMENTS[b]) + 0.004) ** power) for b in bones]
        total = sum(weights)
        for bone, weight in zip(bones, weights):
            obj.vertex_groups[bone].add([vert.index], weight / total, "REPLACE")
    PARTS.append(obj)
    return obj


def ellipsoid(name, loc, scale, material, bones, segs=8, rings=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=1.0, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    return finish(obj, name, material, bones)


def box(name, loc, half, material, bones, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=loc)
    obj = bpy.context.object
    obj.scale = half
    obj.rotation_euler = rot
    return finish(obj, name, material, bones)


def cone_between(name, a, b, r1, r2, material, bones, verts=8):
    a = Vector(a)
    b = Vector(b)
    direction = b - a
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=r1, radius2=r2, depth=direction.length, location=(a + b) / 2
    )
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction)
    return finish(obj, name, material, bones)


def hemisphere(name, loc, scale, material, bones, segs=12, rings=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=1.0, location=loc)
    obj = bpy.context.object
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
    boundary = [e for e in bm.edges if e.is_boundary]
    if boundary:
        bmesh.ops.holes_fill(bm, edges=boundary)
    bm.to_mesh(obj.data)
    bm.free()
    obj.scale = scale
    return finish(obj, name, material, bones)


def build_board():
    """Low-poly board: tapered hexagonal top view + rockered nose/tail."""
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0, 0, -0.0225))
    obj = bpy.context.object
    obj.scale = (0.185, 0.72, 0.0225)
    activate(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:
        if abs(v.co.y) > 0.5:                       # nose / tail corner
            v.co.x *= 0.55
            v.co.z += 0.028 if v.co.z > 0 else 0.012
        elif abs(v.co.y) > 0.3:                     # mid edge, subtle sidecut
            v.co.x *= 0.92
    bm.to_mesh(obj.data)
    bm.free()
    return finish(obj, "Snowboard", M_BOARD, ["Board"])


# --------------------------------------------------------------------------- #
# Build the character
# --------------------------------------------------------------------------- #
build_board()

# Hips / pants.
ellipsoid("Hips", (0.0, 0.0, 0.9), (0.17, 0.12, 0.115), M_PANTS, ["Pelvis", "Spine_01", "Thigh_L", "Thigh_R"])
# Jacket torso: slight taper from waist to shoulders.
cone_between("Torso", (0.0, 0.0, 0.93), (0.0, 0.0, 1.38), 0.185, 0.215, M_JACKET,
             ["Pelvis", "Spine_01", "Spine_02", "Chest"], verts=10)
box("JacketHem", (0.0, 0.0, 0.95), (0.195, 0.14, 0.045), M_JACKET_DARK,
    ["Pelvis", "Spine_01"])
box("Zipper", (0.0, -0.16, 1.16), (0.012, 0.012, 0.24), M_JACKET_DARK,
    ["Spine_01", "Spine_02", "Chest"])
# Fluffy collar.
ellipsoid("Collar", (0.0, 0.0, 1.4), (0.145, 0.125, 0.065), M_FUR_WHITE, ["Chest", "Neck", "Head"])
# Neck.
cone_between("Neck", (0.0, 0.0, 1.4), (0.0, 0.0, 1.5), 0.075, 0.07, M_FUR_WHITE,
             ["Chest", "Neck", "Head"])

# Head + panda markings.
ellipsoid("Head", (0.0, -0.005, 1.56), (0.165, 0.16, 0.15), M_FUR_WHITE, ["Head"], segs=10, rings=8)
ellipsoid("Ear_L", (0.145, 0.03, 1.675), (0.062, 0.05, 0.062), M_FUR_BLACK, ["Head"])
ellipsoid("Ear_R", (-0.145, 0.03, 1.675), (0.062, 0.05, 0.062), M_FUR_BLACK, ["Head"])
ellipsoid("EyePatch_L", (0.07, -0.135, 1.585), (0.052, 0.03, 0.062), M_FUR_BLACK, ["Head"])
ellipsoid("EyePatch_R", (-0.07, -0.135, 1.585), (0.052, 0.03, 0.062), M_FUR_BLACK, ["Head"])
ellipsoid("Muzzle", (0.0, -0.155, 1.525), (0.06, 0.05, 0.045), M_FUR_WHITE, ["Head"])
ellipsoid("Nose", (0.0, -0.2, 1.54), (0.024, 0.02, 0.018), M_FUR_BLACK, ["Head"])

# Helmet + goggles (rigid to the head bone).
hemisphere("Helmet", (0.0, 0.01, 1.585), (0.19, 0.2, 0.185), M_HELMET, ["Head"], segs=12, rings=6)
box("Goggles", (0.0, -0.155, 1.585), (0.155, 0.045, 0.05), M_GOGGLE, ["Head"])
box("GoggleStrap", (0.0, 0.02, 1.585), (0.182, 0.16, 0.022), M_FUR_BLACK, ["Head"])

# Arms.
for side, sign in (("L", 1.0), ("R", -1.0)):
    sh = Vector((SHOULDER.x * sign, SHOULDER.y, SHOULDER.z))
    el = Vector((ELBOW.x * sign, ELBOW.y, ELBOW.z))
    wr = Vector((WRIST.x * sign, WRIST.y, WRIST.z))
    tip = Vector((HAND_TIP.x * sign, HAND_TIP.y, HAND_TIP.z))
    ellipsoid(f"Shoulder_{side}", tuple(sh), (0.1, 0.1, 0.1), M_JACKET,
              [f"Shoulder_{side}", f"UpperArm_{side}", "Chest"])
    cone_between(f"UpperArm_{side}", tuple(sh), tuple(el), 0.082, 0.062, M_JACKET,
                 [f"Shoulder_{side}", f"UpperArm_{side}", f"Forearm_{side}"])
    cone_between(f"Forearm_{side}", tuple(el), tuple(wr), 0.062, 0.05, M_JACKET,
                 [f"UpperArm_{side}", f"Forearm_{side}", f"Hand_{side}"])
    ellipsoid(f"Glove_{side}", tuple(tip), (0.062, 0.062, 0.055), M_GLOVE,
              [f"Forearm_{side}", f"Hand_{side}"])

# Legs + boots. Boots are yawed slightly outward (duck stance) but stay weighted
# to the straight foot bone.
for side, sign in (("L", 1.0), ("R", -1.0)):
    cone_between(f"Thigh_{side}", (0.11 * sign, 0.0, 0.87), (0.12 * sign, -0.03, 0.45),
                 0.09, 0.07, M_PANTS, ["Pelvis", f"Thigh_{side}", f"Shin_{side}"])
    cone_between(f"Shin_{side}", (0.12 * sign, -0.03, 0.45), (0.12 * sign, 0.0, 0.14),
                 0.072, 0.058, M_PANTS, [f"Thigh_{side}", f"Shin_{side}", f"Foot_{side}"])
    box(f"Boot_{side}", (0.12 * sign, -0.03, 0.075), (0.065, 0.13, 0.075), M_BOOT,
        [f"Shin_{side}", f"Foot_{side}"], rot=(0, 0, -sign * D(18)))

# Board bindings (rigid to the board bone).
for side, sign in (("L", 1.0), ("R", -1.0)):
    box(f"Binding_{side}", (0.12 * sign, -0.03, 0.03), (0.085, 0.09, 0.03), M_METAL, ["Board"])
box("BoardStripe", (0.0, 0.0, 0.002), (0.05, 0.42, 0.004), M_BOARD_ACCENT, ["Board"])

# Join everything into one skinned mesh.
bpy.ops.object.select_all(action="DESELECT")
for part in PARTS:
    part.select_set(True)
bpy.context.view_layer.objects.active = PARTS[0]
bpy.ops.object.join()
mesh = bpy.context.object
mesh.name = "PandaSnowboarder"
mesh.data.name = "PandaSnowboarder"

mesh.parent = arm
mesh.matrix_parent_inverse = arm.matrix_world.inverted()
mod = mesh.modifiers.new("Armature", "ARMATURE")
mod.object = arm

bbox_min = Vector((min(v.co.x for v in mesh.data.vertices),
                   min(v.co.y for v in mesh.data.vertices),
                   min(v.co.z for v in mesh.data.vertices)))
bbox_max = Vector((max(v.co.x for v in mesh.data.vertices),
                   max(v.co.y for v in mesh.data.vertices),
                   max(v.co.z for v in mesh.data.vertices)))
print("MESH verts", len(mesh.data.vertices), "tris", len(mesh.data.loop_triangles))
print("BBOX min", tuple(round(v, 3) for v in bbox_min), "max", tuple(round(v, 3) for v in bbox_max))
print("MATERIALS", [m.name for m in mesh.data.materials])


# --------------------------------------------------------------------------- #
# Animation authoring (30 FPS, in-place)
# --------------------------------------------------------------------------- #
FK_ROT = ["Pelvis", "Spine_01", "Spine_02", "Chest", "Neck", "Head",
          "Shoulder_L", "Shoulder_R", "UpperArm_L", "UpperArm_R",
          "Forearm_L", "Forearm_R", "Hand_L", "Hand_R",
          "Foot_L", "Foot_R", "Board"]
LOC_BONES = ["Pelvis", "Board", "Foot_IK_L", "Foot_IK_R", "Knee_Pole_L", "Knee_Pole_R"]


def apply_pose(frame, rots=None, world_locs=None):
    # Frame first: frame_set re-evaluates existing keys, so pose the bones after.
    bpy.context.scene.frame_set(frame)
    for name in FK_ROT:
        arm.pose.bones[name].rotation_euler = (0.0, 0.0, 0.0)
    for name in LOC_BONES:
        arm.pose.bones[name].location = (0.0, 0.0, 0.0)
    for name, deg in (rots or {}).items():
        arm.pose.bones[name].rotation_euler = (D(deg[0]), D(deg[1]), D(deg[2]))
    for name, delta in (world_locs or {}).items():
        arm.pose.bones[name].location = local_delta(name, delta)
    _key_all(frame)


def _key_all(frame):
    for name in FK_ROT:
        arm.pose.bones[name].keyframe_insert("rotation_euler", frame=frame)
    for name in LOC_BONES:
        arm.pose.bones[name].keyframe_insert("location", frame=frame)


def new_action(name):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = action
    return action


# Shared upper-body "ready" offsets used by several clips.
def ride_pose(lean=0.0, crouch=0.10, sway=0.0, arm_out=0.0, arm_fwd=0.0, elbow=18.0):
    return (
        {
            "Pelvis": (2 + lean, 0, sway),
            "Spine_01": (3 + lean, 0, -sway * 0.6),
            "Spine_02": (3 + lean, 0, -sway * 0.4),
            "Chest": (2 + lean, 0, sway * 0.5),
            "Neck": (-4 - lean * 0.5, 0, 0),
            "Head": (-4, 0, -sway * 0.3),
            "UpperArm_L": (arm_fwd, 0, -arm_out),
            "UpperArm_R": (arm_fwd, 0, arm_out),
            "Forearm_L": (elbow, 0, 0),
            "Forearm_R": (elbow, 0, 0),
        },
        {"Pelvis": (0, 0, -crouch)},
    )


# --- SkiIdle: low ready crouch, subtle bob, arms out, loops -------------------
new_action("SkiIdle")
idle_keys = [
    (1, ride_pose(lean=0, crouch=0.10, sway=2.0, arm_out=6, arm_fwd=6)),
    (10, ride_pose(lean=1, crouch=0.085, sway=-1.0, arm_out=8, arm_fwd=4)),
    (20, ride_pose(lean=0, crouch=0.10, sway=-2.0, arm_out=6, arm_fwd=6)),
    (30, ride_pose(lean=1, crouch=0.085, sway=1.0, arm_out=8, arm_fwd=4)),
    (40, ride_pose(lean=0, crouch=0.10, sway=2.0, arm_out=6, arm_fwd=6)),
]
for frame, (rots, locs) in idle_keys:
    apply_pose(frame, rots, locs)

# --- Jump: compress -> extend -> leave the board ------------------------------
new_action("Jump")
apply_pose(1, *ride_pose(crouch=0.11, arm_fwd=6, arm_out=6))
apply_pose(4, *ride_pose(lean=6, crouch=0.22, arm_fwd=-24, arm_out=4, elbow=10))
apply_pose(9, {
    "Pelvis": (-4, 0, 0), "Spine_01": (-2, 0, 0), "Spine_02": (-2, 0, 0),
    "Chest": (-3, 0, 0), "Neck": (2, 0, 0), "Head": (0, 0, 0),
    "UpperArm_L": (24, 0, -10), "UpperArm_R": (24, 0, 10),
    "Forearm_L": (8, 0, 0), "Forearm_R": (8, 0, 0),
}, {"Pelvis": (0, 0, 0.05)})
apply_pose(13, {
    "Pelvis": (6, 0, 0), "Spine_01": (6, 0, 0), "Chest": (5, 0, 0),
    "Neck": (-6, 0, 0), "Head": (-4, 0, 0),
    "UpperArm_L": (6, 0, -22), "UpperArm_R": (6, 0, 22),
    "Forearm_L": (30, 0, 0), "Forearm_R": (30, 0, 0),
}, {"Pelvis": (0, 0, -0.02), "Foot_IK_L": (-0.02, 0.04, 0.12),
    "Foot_IK_R": (0.02, 0.04, 0.12), "Board": (0, 0, 0.11)})
apply_pose(16, {
    "Pelvis": (8, 0, 0), "Spine_01": (7, 0, 0), "Chest": (6, 0, 0),
    "Neck": (-7, 0, 0), "Head": (-5, 0, 0),
    "UpperArm_L": (4, 0, -26), "UpperArm_R": (4, 0, 26),
    "Forearm_L": (34, 0, 0), "Forearm_R": (34, 0, 0),
}, {"Pelvis": (0, 0, -0.03), "Foot_IK_L": (-0.03, 0.06, 0.16),
    "Foot_IK_R": (0.03, 0.06, 0.16), "Board": (0, 0, 0.15)})

# --- Air: looping airborne balance, legs tucked ---------------------------------
new_action("Air")
def air_pose(lean, sway, foot_dz, board_dz, arm_spread, elbow):
    return (
        {"Pelvis": (lean, 0, sway), "Spine_01": (lean - 1, 0, -sway * 0.6),
         "Spine_02": (lean - 1, 0, -sway * 0.4), "Chest": (lean - 2, 0, sway * 0.5),
         "Neck": (-lean + 1, 0, 0), "Head": (-4, 0, -sway * 0.4),
         "UpperArm_L": (2, 0, -arm_spread), "UpperArm_R": (2, 0, arm_spread),
         "Forearm_L": (elbow, 0, 0), "Forearm_R": (elbow, 0, 0)},
        {"Pelvis": (0, 0, -0.02), "Foot_IK_L": (-0.03, 0.08, foot_dz),
         "Foot_IK_R": (0.03, 0.08, foot_dz), "Board": (0, 0, board_dz)},
    )


air_keys = [
    (1, air_pose(6, 3, 0.18, 0.17, 30, 36)),
    (8, air_pose(5, -3, 0.14, 0.13, 24, 30)),
    (16, air_pose(6, 3, 0.20, 0.19, 32, 40)),
    (24, air_pose(6, 3, 0.18, 0.17, 30, 36)),
]
for frame, (rots, locs) in air_keys:
    apply_pose(frame, rots, locs)

# --- Landing: contact -> deep squash -> recover --------------------------------
new_action("Landing")
apply_pose(1, {
    "Pelvis": (2, 0, 0), "Spine_01": (2, 0, 0), "Chest": (2, 0, 0),
    "Neck": (-2, 0, 0), "Head": (-2, 0, 0),
    "UpperArm_L": (10, 0, -20), "UpperArm_R": (10, 0, 20),
    "Forearm_L": (18, 0, 0), "Forearm_R": (18, 0, 0),
}, {"Pelvis": (0, 0, 0.0)})
apply_pose(5, *ride_pose(lean=5, crouch=0.24, arm_fwd=18, arm_out=8, elbow=30))
apply_pose(11, *ride_pose(lean=6, crouch=0.14, arm_fwd=10, arm_out=6, elbow=22))
apply_pose(16, *ride_pose(crouch=0.10, arm_fwd=6, arm_out=6, elbow=18))

# --- Crash: lose balance -> twist -> settle ------------------------------------
new_action("Crash")
apply_pose(1, *ride_pose(crouch=0.10, arm_fwd=4, arm_out=6))
apply_pose(7, {
    "Pelvis": (-6, 18, 14), "Spine_01": (-8, 10, -10), "Spine_02": (-6, 8, -8),
    "Chest": (-4, 6, -6), "Neck": (6, -8, 4), "Head": (8, -10, 6),
    "UpperArm_L": (-30, 0, -34), "UpperArm_R": (-20, 0, 40),
    "Forearm_L": (10, 0, 0), "Forearm_R": (24, 0, 0),
}, {"Pelvis": (0, 0, -0.06), "Foot_IK_L": (-0.05, 0.10, 0.10),
    "Foot_IK_R": (0.08, 0.02, 0.14)})
apply_pose(16, {
    "Pelvis": (-10, 34, 22), "Spine_01": (-12, 18, -16), "Spine_02": (-10, 14, -12),
    "Chest": (-8, 10, -10), "Neck": (12, -14, 8), "Head": (14, -16, 10),
    "UpperArm_L": (-42, 0, -40), "UpperArm_R": (-30, 0, 48),
    "Forearm_L": (16, 0, 0), "Forearm_R": (30, 0, 0),
}, {"Pelvis": (0, 0, -0.18), "Foot_IK_L": (-0.10, 0.16, 0.06),
    "Foot_IK_R": (0.14, 0.06, 0.12)})
apply_pose(28, {
    "Pelvis": (-14, 46, 26), "Spine_01": (-16, 24, -20), "Spine_02": (-14, 18, -16),
    "Chest": (-10, 14, -12), "Neck": (16, -18, 10), "Head": (18, -20, 12),
    "UpperArm_L": (-48, 0, -44), "UpperArm_R": (-34, 0, 52),
    "Forearm_L": (22, 0, 0), "Forearm_R": (34, 0, 0),
}, {"Pelvis": (0, 0, -0.26), "Foot_IK_L": (-0.12, 0.20, 0.04),
    "Foot_IK_R": (0.18, 0.08, 0.10)})
apply_pose(40, {
    "Pelvis": (-15, 48, 27), "Spine_01": (-17, 25, -21), "Spine_02": (-15, 19, -17),
    "Chest": (-11, 15, -13), "Neck": (17, -19, 11), "Head": (19, -21, 13),
    "UpperArm_L": (-49, 0, -45), "UpperArm_R": (-35, 0, 53),
    "Forearm_L": (23, 0, 0), "Forearm_R": (35, 0, 0),
}, {"Pelvis": (0, 0, -0.27), "Foot_IK_L": (-0.12, 0.21, 0.04),
    "Foot_IK_R": (0.19, 0.08, 0.10)})

arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.location = (0, 0, 0)
    pb.rotation_euler = (0, 0, 0)
bpy.context.view_layer.update()

print("ACTIONS", [a.name for a in bpy.data.actions])


# --------------------------------------------------------------------------- #
# Export
# --------------------------------------------------------------------------- #
def export_glb(path):
    available = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    wanted = dict(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=False,
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_frame_range=False,
        export_force_sampling=True,
        export_nla_strips=False,
        export_optimize_animation_size=False,
        export_def_bones=False,
        export_morph=False,
    )
    kwargs = {k: v for k, v in wanted.items() if k in available}
    bpy.ops.export_scene.gltf(**kwargs)


export_glb(OUT)
print("EXPORTED", OUT, os.path.getsize(OUT), "bytes")


# --------------------------------------------------------------------------- #
# Optional preview renders (Workbench, flat materials)
# --------------------------------------------------------------------------- #
def render_preview(outdir):
    os.makedirs(outdir, exist_ok=True)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = False
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.film_transparent = False

    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 2.4
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    center = Vector((0.0, 0.0, 0.9))
    views = {
        "front": Vector((0.0, -4.0, 1.0)),
        "side": Vector((4.0, 0.0, 1.0)),
        "threeq": Vector((3.0, -3.0, 1.6)),
    }
    frames = {
        "apose": None,
        "skiidle_1": ("SkiIdle", 1),
        "jump_9": ("Jump", 9),
        "air_1": ("Air", 1),
        "landing_5": ("Landing", 5),
        "crash_16": ("Crash", 16),
    }
    for label, spec in frames.items():
        if spec is None:
            arm.animation_data.action = None
        else:
            arm.animation_data.action = bpy.data.actions[spec[0]]
            scene.frame_set(spec[1])
        bpy.context.view_layer.update()
        for view, pos in views.items():
            cam.location = pos
            cam.rotation_euler = (center - pos).to_track_quat("-Z", "Y").to_euler()
            scene.render.filepath = os.path.join(outdir, f"{label}_{view}.png")
            bpy.ops.render.render(write_still=True)
    print("PREVIEWS", outdir)


if PREVIEW_DIR:
    render_preview(PREVIEW_DIR)
