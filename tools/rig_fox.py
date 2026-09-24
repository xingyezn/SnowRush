"""Rig + animate the generated fox into a SnowRush rider.

Usage:
  blender --background --python tools/rig_fox.py -- <fox.glb> <out.glb> [preview_dir]
  (env FOX_WEIGHTS=distance  forces distance weighting instead of bone heat)
  (env FOX_NO_DECIMATE=1     skips the decimate pass)

Pipeline:
  1. Import the T-pose fox, bake transforms, centre it and drop it onto a board.
  2. Decimate + shrink the 4K textures (this is what shrinks ~31 MB to ~2 MB).
  3. Fit a humanoid skeleton (the same joint names the game's CharacterAnimator
     expects) plus two tail bones, and strip the stray right-hand fragments.
  4. Skin it (distance weights; bone heat fails on this mesh). No board is baked:
     the game uses public/models/panda_board_gen.glb via PlayerVisual.
  5. Author five 30 FPS in-place clips: SkiIdle / Jump / Air / Landing / Crash.
  6. Export a GLB with mesh + armature + skin + materials + animations.

The fox faces Blender -Y, so the exported model faces Three.js +Z (yaw = PI).
"""

import bpy
import bmesh
import math
import os
import sys
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[0], argv[1]
PREVIEW_DIR = argv[2] if len(argv) > 2 else None

DECIMATE_RATIO = 0.5
MAX_TEX = 1024
FPS = 30
D = math.radians

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = 40


# --------------------------------------------------------------------------- #
# 1. Import + normalise
# --------------------------------------------------------------------------- #
bpy.ops.import_scene.gltf(filepath=SRC)
mesh = next(o for o in bpy.data.objects if o.type == "MESH")
mesh.name = "FoxSnowboarder"

bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# Center in X/Y and drop the boots to z = 0 so the skeleton fits predictably.
co = [v.co for v in mesh.data.vertices]
mn = Vector((min(v.x for v in co), min(v.y for v in co), min(v.z for v in co)))
mx = Vector((max(v.x for v in co), max(v.y for v in co), max(v.z for v in co)))
offset = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z))
for v in mesh.data.vertices:
    v.co += offset
mesh.data.update()

co = [v.co for v in mesh.data.vertices]
mn = Vector((min(v.x for v in co), min(v.y for v in co), min(v.z for v in co)))
mx = Vector((max(v.x for v in co), max(v.y for v in co), max(v.z for v in co)))
print("FOX_SIZE", tuple(round(v, 3) for v in (mx - mn)))


def remove_hand_debris(obj, threshold=0.418):
    """Delete stray fragments beyond the hands.

    The generated mesh carries a handful of loose triangles just past the right
    glove; anything whose connected component centres further out than the glove
    (|x| > threshold) is modelling residue, not geometry.
    """
    me = obj.data
    n = len(me.vertices)
    parent = list(range(n))

    def find(a):
        root = a
        while parent[root] != root:
            root = parent[root]
        while parent[a] != root:
            parent[a], a = root, parent[a]
        return root

    for e in me.edges:
        a, b = e.vertices
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    pos = [obj.matrix_world @ v.co for v in me.vertices]

    kill = []
    for verts in groups.values():
        cx = sum(pos[i].x for i in verts) / len(verts)
        if abs(cx) > threshold:
            kill.extend(verts)
    if kill:
        bm = bmesh.new()
        bm.from_mesh(me)
        bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.verts[i] for i in kill], context="VERTS")
        bm.to_mesh(me)
        bm.free()
    print("DEBRIS_REMOVED", len(kill), "verts")


remove_hand_debris(mesh)

if os.environ.get("FOX_NO_DECIMATE") != "1":
    mod = mesh.modifiers.new("dec", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = DECIMATE_RATIO
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print("DECIMATED ->", len(mesh.data.polygons), "tris")

for img in bpy.data.images:
    w, h = img.size
    if max(w, h) > MAX_TEX:
        s = MAX_TEX / max(w, h)
        img.scale(max(1, int(w * s)), max(1, int(h * s)))
        print("IMG", img.name, (w, h), "->", tuple(img.size))


# --------------------------------------------------------------------------- #
# 2. Armature, fitted to the measured proportions (H ~= 1.08)
# --------------------------------------------------------------------------- #
BONES = [
    ("Root", (0, 0, 0.0), (0, 0, 0.10), None, False),
    ("Pelvis", (0, 0, 0.30), (0, 0, 0.40), "Root", True),
    ("Spine_01", (0, 0, 0.40), (0, 0, 0.47), "Pelvis", True),
    ("Spine_02", (0, 0, 0.47), (0, 0, 0.54), "Spine_01", True),
    ("Chest", (0, 0, 0.54), (0, 0, 0.66), "Spine_02", True),
    ("Neck", (0, 0, 0.66), (0, 0, 0.74), "Chest", True),
    ("Head", (0, 0, 0.74), (0, 0, 1.00), "Neck", True),
    ("Shoulder_L", (0.05, 0, 0.645), (0.13, 0, 0.648), "Chest", True),
    ("UpperArm_L", (0.13, 0, 0.648), (0.27, 0, 0.648), "Shoulder_L", True),
    ("Forearm_L", (0.27, 0, 0.648), (0.375, 0, 0.648), "UpperArm_L", True),
    ("Hand_L", (0.375, 0, 0.648), (0.44, 0, 0.648), "Forearm_L", True),
    ("Shoulder_R", (-0.05, 0, 0.645), (-0.13, 0, 0.648), "Chest", True),
    ("UpperArm_R", (-0.13, 0, 0.648), (-0.27, 0, 0.648), "Shoulder_R", True),
    ("Forearm_R", (-0.27, 0, 0.648), (-0.375, 0, 0.648), "UpperArm_R", True),
    ("Hand_R", (-0.375, 0, 0.648), (-0.44, 0, 0.648), "Forearm_R", True),
    # Slight forward knee bend gives the IK a stable bend plane.
    ("Thigh_L", (0.10, 0, 0.30), (0.105, -0.01, 0.17), "Pelvis", True),
    ("Shin_L", (0.105, -0.01, 0.17), (0.105, 0, 0.06), "Thigh_L", True),
    ("Foot_L", (0.105, 0, 0.06), (0.105, -0.17, 0.035), "Shin_L", True),
    ("Thigh_R", (-0.10, 0, 0.30), (-0.105, -0.01, 0.17), "Pelvis", True),
    ("Shin_R", (-0.105, -0.01, 0.17), (-0.105, 0, 0.06), "Thigh_R", True),
    ("Foot_R", (-0.105, 0, 0.06), (-0.105, -0.17, 0.035), "Shin_R", True),
    ("Tail_01", (0, 0.10, 0.36), (0, 0.22, 0.36), "Pelvis", True),
    ("Tail_02", (0, 0.22, 0.36), (0, 0.36, 0.33), "Tail_01", True),
    # Non-deforming IK controls; tails sit exactly on the rest ankles.
    ("Foot_IK_L", (0.105, 0.16, 0.06), (0.105, 0, 0.06), "Root", False),
    ("Foot_IK_R", (-0.105, 0.16, 0.06), (-0.105, 0, 0.06), "Root", False),
    ("Knee_Pole_L", (0.105, -0.45, 0.17), (0.105, -0.60, 0.17), "Root", False),
    ("Knee_Pole_R", (-0.105, -0.45, 0.17), (-0.105, -0.60, 0.17), "Root", False),
]

arm_data = bpy.data.armatures.new("FoxArmature")
arm = bpy.data.objects.new("FoxRig", arm_data)
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

for pb in arm.pose.bones:
    pb.rotation_mode = "QUATERNION"

for side in ("L", "R"):
    con = arm.pose.bones[f"Shin_{side}"].constraints.new("IK")
    con.target = arm
    con.subtarget = f"Foot_IK_{side}"
    con.pole_target = arm
    con.pole_subtarget = f"Knee_Pole_{side}"
    con.chain_count = 2
    con.pole_angle = 0.0


def local_delta(bone, world_delta):
    m = arm_data.bones[bone].matrix_local.to_3x3()
    return m.inverted() @ Vector(world_delta)


# Auto-pick the knee-forward pole angle.
_test = arm.pose.bones["Pelvis"]
_test.location = local_delta("Pelvis", (0, 0, -0.10))
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
    print("KNEE", side, round(best_angle, 3), round(best_y, 4))
_test.location = (0, 0, 0)
bpy.context.view_layer.update()


# --------------------------------------------------------------------------- #
# 3. Skin the fox
# --------------------------------------------------------------------------- #
def distance_weights(obj, bones, power=6.0, nearest=4):
    """Nearest-bone distance weighting.

    Bone heat works poorly on this generated single-surface mesh, so weights are
    solved explicitly: each vertex blends only its `nearest` closest bones, which
    keeps the two legs / arms from bleeding into each other.
    """
    def dist_seg(p, a, b):
        ab = b - a
        denom = ab.length_squared
        t = 0.0 if denom == 0 else max(0.0, min(1.0, (p - a).dot(ab) / denom))
        return (p - (a + ab * t)).length

    for name in bones:
        if name not in obj.vertex_groups:
            obj.vertex_groups.new(name=name)
    for v in obj.data.vertices:
        p = obj.matrix_world @ v.co
        ranked = sorted((dist_seg(p, *SEGMENTS[b]), b) for b in bones)[:nearest]
        weights = [(1.0 / ((d + 0.004) ** power), b) for d, b in ranked]
        total = sum(w for w, _ in weights)
        for w, b in weights:
            obj.vertex_groups[b].add([v.index], w / total, "REPLACE")


def bones_with_weights(obj):
    used = set()
    for v in obj.data.vertices:
        for g in v.groups:
            if g.weight > 1e-4:
                used.add(obj.vertex_groups[g.group].name)
    return used


DEFORM_BONES = [name for name, _, _, _, deform in BONES if deform]
FOX_BONES = list(DEFORM_BONES)

bpy.ops.object.select_all(action="DESELECT")
mesh.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm

auto = os.environ.get("FOX_WEIGHTS") == "auto"
if auto:
    try:
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    except RuntimeError as error:
        print("AUTO_WEIGHTS_FAILED", error)
        auto = False
    else:
        auto = bool(bones_with_weights(mesh))
        print("AUTO_WEIGHTS", "ok" if auto else "empty")

if not auto:
    for group in list(mesh.vertex_groups):
        mesh.vertex_groups.remove(group)
    mesh.parent = arm
    mesh.matrix_parent_inverse = arm.matrix_world.inverted()
    existing = [m for m in mesh.modifiers if m.type == "ARMATURE"]
    for extra in existing[1:]:
        mesh.modifiers.remove(extra)
    if existing:
        existing[0].object = arm
    else:
        md = mesh.modifiers.new("Armature", "ARMATURE")
        md.object = arm
    distance_weights(mesh, FOX_BONES)
    print("WEIGHTS distance")

used = bones_with_weights(mesh)
missing = [b for b in FOX_BONES if b not in used]
print("WEIGHTS_READY", "missing=", missing)


# The character uses the game's generated snowboard (panda_board_gen.glb) via
# PlayerVisual, so no board is baked into this GLB.


# --------------------------------------------------------------------------- #
# 4. Animation authoring
# --------------------------------------------------------------------------- #
def pose_bone_world(name, direction=None, twist=0.0):
    pb = arm.pose.bones[name]
    if direction is not None:
        m = pb.matrix.copy()
        y = m.col[1].to_3d().normalized()
        R = y.rotation_difference(Vector(direction).normalized()).to_matrix()
        nm = (R @ m.to_3x3()).to_4x4()
        nm.translation = m.translation
        pb.matrix = nm
        bpy.context.view_layer.update()
    if twist:
        m = pb.matrix.copy()
        y = m.col[1].to_3d().normalized()
        R = Matrix.Rotation(twist, 4, y).to_3x3()
        nm = (R @ m.to_3x3()).to_4x4()
        nm.translation = m.translation
        pb.matrix = nm
        bpy.context.view_layer.update()


def dir_from_lean(lean_deg):
    """Direction of an upright bone leaned forward (toward -Y) by lean_deg."""
    a = D(lean_deg)
    return (0.0, -math.sin(a), math.cos(a))


def arm_dirs(side, drop, out, fwd, elbow):
    s = 1.0 if side == "L" else -1.0
    upper = Vector((s * out, -fwd, -drop)).normalized()
    fore = Vector((s * out * 0.7, -fwd - elbow, -drop * 0.85 + elbow * 0.35)).normalized()
    return upper, fore


TAILS = {
    "flat": [(0, 0.98, -0.10), (0, 0.99, -0.12)],
    "up": [(0, 0.85, 0.52), (0, 0.72, 0.69)],
    "down": [(0, 0.9, -0.44), (0, 0.86, -0.51)],
    "left": [(-0.35, 0.9, -0.1), (-0.5, 0.82, -0.2)],
    "right": [(0.35, 0.9, -0.1), (0.5, 0.82, -0.2)],
}

LOC_BONES = ["Pelvis", "Foot_IK_L", "Foot_IK_R", "Knee_Pole_L", "Knee_Pole_R"]
ROT_BONES = [name for name, _, _, _, _ in BONES]
PENDING = {}


def apply_pose(pose):
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    bpy.context.view_layer.update()

    for name, delta in pose.get("locs", {}).items():
        arm.pose.bones[name].location = local_delta(name, delta)
    bpy.context.view_layer.update()

    pelvis = pose.get("pelvis", (0, 0))
    pose_bone_world("Pelvis", dir_from_lean(pelvis[0]), D(pelvis[1]))

    for bone, lean in pose.get("spine", {}).items():
        pose_bone_world(bone, dir_from_lean(lean))

    for side in ("L", "R"):
        up, fore = pose["arms"][side]
        pose_bone_world(f"UpperArm_{side}", up)
        pose_bone_world(f"Forearm_{side}", fore)

    foot = pose.get("foot")
    if foot is not None:
        for side in ("L", "R"):
            pose_bone_world(f"Foot_{side}", foot)

    for i, direction in enumerate(pose.get("tail", TAILS["flat"])):
        pose_bone_world(f"Tail_{i + 1:02d}", direction)

    # Stash the solved local transforms; key_all restores them after frame_set
    # (which re-evaluates existing keys and would otherwise clobber the pose).
    PENDING.clear()
    for name in ROT_BONES:
        PENDING[name] = ("q", arm.pose.bones[name].rotation_quaternion.copy())
    for name in LOC_BONES:
        PENDING[name] = ("l", arm.pose.bones[name].location.copy())


def key_all(frame):
    scene.frame_set(frame)
    for name, (kind, value) in PENDING.items():
        if kind == "q":
            arm.pose.bones[name].rotation_quaternion = value
        else:
            arm.pose.bones[name].location = value
    bpy.context.view_layer.update()
    for name in ROT_BONES:
        arm.pose.bones[name].keyframe_insert("rotation_quaternion", frame=frame)
    for name in LOC_BONES:
        arm.pose.bones[name].keyframe_insert("location", frame=frame)


def new_action(name):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = action
    return action


def ride(lean=4, crouch=0.06, arm=(0.95, 0.18, 0.18, 0.30), sway=0, twist=0,
         foot=None, tail="flat"):
    """Standard rider pose: knees bent, arms down, slight forward lean."""
    pose = {
        "locs": {"Pelvis": (0, 0, -crouch)},
        "pelvis": (lean * 0.5, twist + sway * 0.5),
        "spine": {
            "Spine_01": lean * 0.8 + sway * 0.3,
            "Spine_02": lean * 0.9,
            "Chest": lean * 0.8 - sway * 0.3,
            "Neck": -lean * 0.7,
            "Head": -lean * 0.6,
        },
        "arms": {"L": arm_dirs("L", *arm), "R": arm_dirs("R", *arm)},
        "tail": TAILS[tail],
    }
    if foot is not None:
        pose["foot"] = dir_from_lean(foot)
    return pose


# --- SkiIdle -----------------------------------------------------------------
new_action("SkiIdle")
for frame in (1, 10, 20, 30, 40):
    bob = {1: 0.06, 10: 0.05, 20: 0.065, 30: 0.05, 40: 0.06}[frame]
    sway = {1: 1.0, 10: -0.5, 20: -1.0, 30: 0.5, 40: 1.0}[frame]
    arm_pose = (0.95, 0.20 if frame % 20 == 10 else 0.16, 0.16, 0.28)
    apply_pose(ride(lean=4, crouch=bob, arm=arm_pose, sway=sway, tail="flat"))
    key_all(frame)

# --- Jump --------------------------------------------------------------------
new_action("Jump")
apply_pose(ride(lean=5, crouch=0.07, arm=(0.95, 0.15, 0.12, 0.28)))
key_all(1)
apply_pose(ride(lean=12, crouch=0.16, arm=(0.8, 0.25, -0.35, 0.15), tail="down"))
key_all(4)
apply_pose(ride(lean=-4, crouch=-0.03, arm=(0.2, 0.35, 0.6, 0.15), tail="up"))
key_all(9)
apply_pose({
    "locs": {"Pelvis": (0, 0, -0.02), "Foot_IK_L": (-0.02, 0.02, 0.03),
             "Foot_IK_R": (0.02, 0.02, 0.03)},
    "pelvis": (8, 0),
    "spine": {"Spine_01": 7, "Spine_02": 6, "Chest": 5, "Neck": -6, "Head": -5},
    "arms": {"L": arm_dirs("L", 0.4, 0.75, 0.5, 0.5), "R": arm_dirs("R", 0.4, 0.75, 0.5, 0.5)},
    "tail": TAILS["up"],
})
key_all(13)
apply_pose({
    "locs": {"Pelvis": (0, 0, -0.03), "Foot_IK_L": (-0.03, 0.03, 0.05),
             "Foot_IK_R": (0.03, 0.03, 0.05)},
    "pelvis": (9, 0),
    "spine": {"Spine_01": 8, "Spine_02": 7, "Chest": 6, "Neck": -7, "Head": -6},
    "arms": {"L": arm_dirs("L", 0.3, 0.85, 0.55, 0.55), "R": arm_dirs("R", 0.3, 0.85, 0.55, 0.55)},
    "tail": TAILS["up"],
})
key_all(16)

# --- Air ---------------------------------------------------------------------
new_action("Air")


def air_pose(lean, sway, foot_dz, arm):
    # Feet stay on the (external) board, so the tuck is small.
    return {
        "locs": {"Pelvis": (0, 0, -0.02), "Foot_IK_L": (-0.03, 0.03, foot_dz),
                 "Foot_IK_R": (0.03, 0.03, foot_dz)},
        "pelvis": (lean, sway),
        "spine": {"Spine_01": lean - 1, "Spine_02": lean - 1, "Chest": lean - 2,
                  "Neck": -lean + 1, "Head": -4},
        "arms": {"L": arm_dirs("L", *arm), "R": arm_dirs("R", *arm)},
        "tail": TAILS["up"] if sway >= 0 else TAILS["left"],
    }


air_keys = [
    (1, air_pose(6, 3, 0.05, (0.35, 0.85, 0.5, 0.5))),
    (8, air_pose(5, -3, 0.03, (0.4, 0.75, 0.4, 0.45))),
    (16, air_pose(6, 3, 0.06, (0.3, 0.95, 0.55, 0.55))),
    (24, air_pose(6, 3, 0.05, (0.35, 0.85, 0.5, 0.5))),
]
for frame, pose in air_keys:
    apply_pose(pose)
    key_all(frame)

# --- Landing -----------------------------------------------------------------
new_action("Landing")
apply_pose(ride(lean=2, crouch=-0.02, arm=(0.7, 0.5, 0.35, 0.3), tail="up"))
key_all(1)
apply_pose(ride(lean=6, crouch=0.20, arm=(0.75, 0.55, 0.5, 0.55), tail="up", sway=0))
key_all(5)
apply_pose(ride(lean=4, crouch=0.11, arm=(0.85, 0.35, 0.3, 0.4), tail="flat"))
key_all(11)
apply_pose(ride(lean=4, crouch=0.06, arm=(0.95, 0.18, 0.16, 0.28), tail="flat"))
key_all(16)

# --- Crash -------------------------------------------------------------------
new_action("Crash")
apply_pose(ride(lean=4, crouch=0.06, arm=(0.95, 0.18, 0.16, 0.28)))
key_all(1)
apply_pose({
    "locs": {"Pelvis": (0, 0, -0.05), "Foot_IK_L": (-0.06, 0.10, 0.10),
             "Foot_IK_R": (0.08, 0.02, 0.12)},
    "pelvis": (-6, 26),
    "spine": {"Spine_01": -8, "Spine_02": -6, "Chest": -4, "Neck": 6, "Head": 8},
    "arms": {"L": arm_dirs("L", 0.2, 0.9, 0.7, 0.3), "R": arm_dirs("R", 0.6, 0.7, 0.2, 0.5)},
    "tail": TAILS["left"],
})
key_all(7)
apply_pose({
    "locs": {"Pelvis": (0, 0, -0.14), "Foot_IK_L": (-0.11, 0.16, 0.06),
             "Foot_IK_R": (0.15, 0.06, 0.10)},
    "pelvis": (-10, 44),
    "spine": {"Spine_01": -12, "Spine_02": -10, "Chest": -8, "Neck": 12, "Head": 12},
    "arms": {"L": arm_dirs("L", 0.1, 0.95, 0.8, 0.25), "R": arm_dirs("R", 0.7, 0.6, 0.1, 0.6)},
    "tail": TAILS["right"],
})
key_all(16)
apply_pose({
    "locs": {"Pelvis": (0, 0, -0.20), "Foot_IK_L": (-0.13, 0.20, 0.04),
             "Foot_IK_R": (0.18, 0.08, 0.08)},
    "pelvis": (-13, 52),
    "spine": {"Spine_01": -15, "Spine_02": -13, "Chest": -10, "Neck": 15, "Head": 15},
    "arms": {"L": arm_dirs("L", 0.05, 1.0, 0.85, 0.2), "R": arm_dirs("R", 0.75, 0.55, 0.05, 0.65)},
    "tail": TAILS["right"],
})
key_all(28)
apply_pose({
    "locs": {"Pelvis": (0, 0, -0.21), "Foot_IK_L": (-0.13, 0.21, 0.04),
             "Foot_IK_R": (0.19, 0.08, 0.08)},
    "pelvis": (-14, 53),
    "spine": {"Spine_01": -16, "Spine_02": -14, "Chest": -11, "Neck": 16, "Head": 16},
    "arms": {"L": arm_dirs("L", 0.05, 1.0, 0.86, 0.2), "R": arm_dirs("R", 0.76, 0.54, 0.04, 0.66)},
    "tail": TAILS["right"],
})
key_all(40)

arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
bpy.context.view_layer.update()
print("ACTIONS", [a.name for a in bpy.data.actions])


# --------------------------------------------------------------------------- #
# 6. Export
# --------------------------------------------------------------------------- #
def export_glb(path):
    available = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    wanted = dict(
        filepath=path,
        export_format="GLB",
        export_image_format="WEBP",
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
    )
    bpy.ops.export_scene.gltf(**{k: v for k, v in wanted.items() if k in available})


export_glb(OUT)
print("EXPORTED", OUT, os.path.getsize(OUT), "bytes")


# --------------------------------------------------------------------------- #
# 7. Preview renders
# --------------------------------------------------------------------------- #
def render_preview(outdir):
    os.makedirs(outdir, exist_ok=True)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640

    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 1.5
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    center = Vector((0, 0, 0.55))

    shots = [
        ("apose", None, None),
        ("skiidle_1", "SkiIdle", 1),
        ("jump_9", "Jump", 9),
        ("air_1", "Air", 1),
        ("landing_5", "Landing", 5),
        ("crash_16", "Crash", 16),
    ]
    views = {"front": Vector((0, -3, 0.6)), "side": Vector((3, 0, 0.6)), "threeq": Vector((2.2, -2.2, 1.0))}
    for label, action, frame in shots:
        if action:
            arm.animation_data.action = bpy.data.actions[action]
            scene.frame_set(frame)
        else:
            arm.animation_data.action = None
        bpy.context.view_layer.update()
        for view, pos in views.items():
            cam.location = pos
            cam.rotation_euler = (center - pos).to_track_quat("-Z", "Y").to_euler()
            scene.render.filepath = os.path.join(outdir, f"{label}_{view}.png")
            bpy.ops.render.render(write_still=True)
    print("PREVIEWS", outdir)


if PREVIEW_DIR:
    render_preview(PREVIEW_DIR)
