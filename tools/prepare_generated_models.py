"""Prepare the owner's generated GLBs for SnowRush.

Usage:
  blender --background --python tools/prepare_generated_models.py -- \
      <pine_trees.glb> <panda.glb> <out_dir>

Steps:
  * Split the pine GLB (one mesh holding three trees side by side) into three
    separate objects, using connected-component centroids + 1D k-means on X.
  * Normalise each tree to CONFIG.course.trees.visualHeight (9 m), base at 0.
  * Rotate the snowboard flat (long axis forward, deck up), scale it to a
    1.75 m board length with the base at 0, so it drops in as the player board.
  * Decimate to a low-poly triangle budget and shrink embedded 4K textures to
    1024, re-encoded as WebP (this is what removes most of the file weight).
  * Export each tree / the rider as its own GLB.

Outputs: pine_gen_a.glb, pine_gen_b.glb, pine_gen_c.glb, panda_board_gen.glb.
"""

import os
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
PINE_SRC, PANDA_SRC, OUT_DIR = argv[0], argv[1], argv[2]

TREE_COUNT = 3
TREE_HEIGHT = 9.0
TREE_TARGET_TRIS = 6000
BOARD_LENGTH = 1.75
BOARD_TARGET_TRIS = 12000
MAX_TEX = 1024


def import_mesh(path):
    """Import a GLB and bake its object transform into the mesh (world coords)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    obj = next(o for o in bpy.data.objects if o.type == "MESH")
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def cluster_labels(obj, k):
    """Assign every vertex to one of k spatial clusters along X.

    The source is a single mesh made of thousands of disconnected fragments
    (one tree each spans many fragments), so we group connected components by
    their centroid and split those with a deterministic 1D k-means.
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

    for edge in me.edges:
        a, b = edge.vertices
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)

    comp_verts = {}
    for i in range(n):
        comp_verts.setdefault(find(i), []).append(i)

    roots = list(comp_verts)
    centroids = np.array([co[comp_verts[r]].mean(axis=0) for r in roots])
    xs = centroids[:, 0]

    centers = np.quantile(xs, [(i + 0.5) / k for i in range(k)])
    for _ in range(100):
        assign = np.abs(xs[:, None] - centers[None, :]).argmin(axis=1)
        new = np.array([
            xs[assign == j].mean() if (assign == j).any() else centers[j]
            for j in range(k)
        ])
        if np.allclose(new, centers):
            break
        centers = new

    labels = np.empty(n, dtype=np.int32)
    for ci, root in enumerate(roots):
        labels[comp_verts[root]] = assign[ci]
    print("TREE_CLUSTER_X", [round(float(c), 3) for c in sorted(centers)])
    return labels


def extract_cluster(src, labels, cluster):
    """Duplicate src and keep only the faces whose vertices belong to cluster."""
    obj = src.copy()
    obj.data = src.data.copy()
    obj.name = f"tree_{cluster}"
    obj.data.name = f"tree_{cluster}"
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    kill = [f for f in bm.faces if any(labels[v.index] != cluster for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return obj


def normalize(obj, target_height):
    """Center in XZ, put base at y/z = 0 and scale to target_height (Z-up)."""
    me = obj.data
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    mn, mx = co.min(axis=0), co.max(axis=0)
    scale = target_height / max(mx[2] - mn[2], 1e-6)
    co = (co - np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mn[2]])) * scale
    me.vertices.foreach_set("co", co.ravel())
    me.update()


def rotate_x(obj, degrees):
    # glTF import leaves rotation_mode as QUATERNION, where rotation_euler is
    # ignored, so force Euler mode before baking the rotation.
    obj.rotation_mode = "XYZ"
    obj.rotation_euler = (np.radians(degrees), 0.0, 0.0)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(rotation=True)


def normalize_board(obj, target_length):
    """Lay-flat board: longest horizontal axis -> target_length, base at z = 0.

    The generated board is authored upright (long axis on Z, deck facing -Y).
    Rotating it -90 deg about X makes the length run along +Y and the deck face
    +Z, so after the Y-up export the length is forward (-Z) and the deck is up.
    """
    me = obj.data
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    mn, mx = co.min(axis=0), co.max(axis=0)
    scale = target_length / max(mx[0] - mn[0], mx[1] - mn[1], 1e-6)
    co = (co - np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mn[2]])) * scale
    me.vertices.foreach_set("co", co.ravel())
    me.update()


def decimate(obj, target_tris):
    me = obj.data
    ratio = min(1.0, target_tris / max(1, len(me.polygons)))
    if ratio >= 1.0:
        return
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("dec", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print("DECIMATED", obj.name, "->", len(obj.data.polygons), "tris")


def shrink_textures(max_size):
    for img in bpy.data.images:
        w, h = img.size
        if max(w, h) > max_size:
            s = max_size / max(w, h)
            img.scale(max(1, int(w * s)), max(1, int(h * s)))
            print("IMG", img.name, (w, h), "->", tuple(img.size))


def export_selected(obj, path):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    available = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    wanted = dict(
        filepath=path,
        export_format="GLB",
        export_image_format="WEBP",
        export_animations=False,
        export_apply=True,
        export_yup=True,
        use_selection=True,
    )
    bpy.ops.export_scene.gltf(**{k: v for k, v in wanted.items() if k in available})
    print("EXPORTED", path, os.path.getsize(path), "bytes")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    pine = import_mesh(PINE_SRC)
    labels = cluster_labels(pine, TREE_COUNT)
    trees = [extract_cluster(pine, labels, j) for j in range(TREE_COUNT)]
    for tree in trees:
        normalize(tree, TREE_HEIGHT)
        decimate(tree, TREE_TARGET_TRIS)
    shrink_textures(MAX_TEX)
    for i, tree in enumerate(trees):
        export_selected(tree, os.path.join(OUT_DIR, f"pine_gen_{chr(97 + i)}.glb"))

    panda = import_mesh(PANDA_SRC)
    rotate_x(panda, -90)
    normalize_board(panda, BOARD_LENGTH)
    decimate(panda, BOARD_TARGET_TRIS)
    shrink_textures(MAX_TEX)
    export_selected(panda, os.path.join(OUT_DIR, "panda_board_gen.glb"))


main()
