"""Batch-prepare the owner's generated GLBs for SnowRush.

Usage:
  blender --background --python tools/prepare_generated_batch.py -- <src_dir> <out_dir>

Each job either keeps a single model or splits a mesh that holds several
side-by-side items (the count comes from the file name annotation). Splitting
uses connected-component centroids + 2D k-means over the horizontal plane,
which is robust for scanned meshes that fragment into thousands of shells.

Every output is normalised to a game target, decimated to a triangle budget and
has its embedded textures shrunk + re-encoded as WebP.

Job fields:
  src     file name inside <src_dir>
  count   how many items are in the mesh (1 = no split)
  prefix  output base name (suffix _a, _b, ... when count > 1)
  mode    'height' (scale Z extent, base at 0) or 'center' (max extent, centred)
  target  target size in metres for the chosen mode
  tris    triangle budget per output
  strip   optional pre-pass ('rods' | 'base' | '') that deletes junk geometry
"""

import os
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
SRC_DIR, OUT_DIR = argv[0], argv[1]
ONLY = set(argv[2].split(",")) if len(argv) > 2 else None

JOBS = [
    ("四种不同的树-需拆分.glb", 4, "tree_gen", "height", 9.0, 2500, ""),
    ("三种不同的岩石-需拆分.glb", 3, "rock_gen", "height", 2.4, 2500, ""),
    ("三种不同的岩壁-需拆分.glb", 3, "cliff_gen", "height", 12.0, 2500, ""),
    ("七种不同的草-拆分.glb", 7, "grass_gen", "height", 1.5, 1000, ""),
    ("四种不同的护栏-需拆分.glb", 4, "fence_gen", "height", 1.4, 250, ""),
    ("三种不同的云-需拆分.glb", 3, "cloud_gen", "center", 1.0, 1200, ""),
    ("四种不同雪堆-需拆分.glb", 4, "snowpile_gen", "height", 1.5, 1000, "rods"),
    ("主体雪山.glb", 1, "mountain_main_gen", "height", 1500.0, 20000, ""),
    ("远山雪景.glb", 1, "mountain_far_gen", "height", 900.0, 5000, ""),
    ("太阳.glb", 1, "sun_gen", "center", 1.0, 1200, ""),
    ("人物-哪吒.glb", 1, "rider_nezha_gen", "height", 1.85, 12000, "base"),
    ("人物-橘猫.glb", 1, "rider_cat_gen", "height", 1.85, 12000, ""),
    ("终点拱门.glb", 1, "finish_arch_gen", "height", 16.0, 8000, ""),
    ("两种跳台-需拆分-需把旗子调整成横向.glb", 2, "ramp_gen", "height", 8.0, 4000, ""),
    ("热气球4个-需拆分.glb", 4, "balloon_gen", "height", 16.0, 3000, ""),
]


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


def components(me):
    """Return (vertex_count, centroid_by_root, verts_by_root) via union-find."""
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

    verts_by_root = {}
    for i in range(n):
        verts_by_root.setdefault(find(i), []).append(i)
    return co, verts_by_root


def kmeans2d(points, k, restarts=12, seed=1234):
    """k-means++ over 2D points; returns (labels, centers, inertia)."""
    rng = np.random.default_rng(seed)
    m = len(points)
    best = None
    for _ in range(restarts):
        first = int(rng.integers(m))
        centers = [points[first]]
        d2 = ((points - points[first]) ** 2).sum(axis=1)
        for _ in range(1, k):
            total = d2.sum()
            probs = d2 / total if total > 0 else np.full(m, 1 / m)
            nxt = int(rng.choice(m, p=probs))
            centers.append(points[nxt])
            d2 = np.minimum(d2, ((points - points[nxt]) ** 2).sum(axis=1))
        centers = np.array(centers)
        labels = None
        for _ in range(100):
            d = ((points[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
            labels = d.argmin(axis=1)
            new = np.array([
                points[labels == j].mean(axis=0) if (labels == j).any() else centers[j]
                for j in range(k)
            ])
            if np.allclose(new, centers):
                centers = new
                break
            centers = new
        d = ((points[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        inertia = float(d.min(axis=1).sum())
        if best is None or inertia < best[2]:
            best = (labels.copy(), centers, inertia)
    return best


def largest_blob_mask(mins, maxs, counts, gap):
    """Keep the biggest group of shells whose bounding boxes are within `gap`.

    Scanned assets fragment into many shells; a few stray shells drift away
    from the main body (leftovers from a neighbouring object). Connecting
    shells by bounding-box proximity and keeping only the largest group removes
    those strays without needing manual editing.
    """
    m = len(counts)
    parent = list(range(m))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    lo = np.maximum(mins[:, None, :], mins[None, :, :])
    hi = np.minimum(maxs[:, None, :], maxs[None, :, :])
    sep = np.sqrt((np.maximum(0.0, lo - hi) ** 2).sum(axis=2))
    for i in range(m):
        for j in range(i + 1, m):
            if sep[i, j] < gap:
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[rj] = ri

    totals = {}
    for i in range(m):
        root = find(i)
        totals[root] = totals.get(root, 0) + int(counts[i])
    best = max(totals, key=totals.get)
    return np.array([find(i) == best for i in range(m)])


def cluster_labels(obj, k):
    co, verts_by_root = components(obj.data)
    roots = list(verts_by_root)
    arrays = {r: co[verts_by_root[r]] for r in roots}
    centroids = np.array([arrays[r].mean(axis=0) for r in roots])
    mins = np.array([arrays[r].min(axis=0) for r in roots])
    maxs = np.array([arrays[r].max(axis=0) for r in roots])
    counts = np.array([len(verts_by_root[r]) for r in roots])

    labels, centers, _ = kmeans2d(centroids[:, :2], k)
    # Order clusters left-to-right for stable a/b/c naming.
    order = np.argsort(centers[:, 0])
    remap = {int(old): new for new, old in enumerate(order)}
    comp_label = np.array([remap[int(l)] for l in labels])

    # Drop stray shells that are disconnected from each cluster's main body.
    keep = np.ones(len(roots), dtype=bool)
    removed = 0
    for j in range(k):
        idx = np.where(comp_label == j)[0]
        if len(idx) < 2:
            continue
        diag = float(np.linalg.norm(maxs[idx].max(axis=0) - mins[idx].min(axis=0)))
        mask = largest_blob_mask(mins[idx], maxs[idx], counts[idx], 0.02 * diag)
        dropped = idx[~mask]
        keep[dropped] = False
        removed += len(dropped)

    vertex_label = np.full(len(obj.data.vertices), -1, dtype=np.int32)
    for ci, root in enumerate(roots):
        if keep[ci]:
            vertex_label[verts_by_root[root]] = comp_label[ci]
    print("  cluster_centers", [tuple(round(float(v), 3) for v in centers[o]) for o in order])
    print("  cluster_components", [int(((comp_label == j) & keep).sum()) for j in range(k)])
    print(f"  stray_shells_removed {removed}")
    return vertex_label


def extract_cluster(src, labels, cluster, name):
    obj = src.copy()
    obj.data = src.data.copy()
    obj.name = name
    obj.data.name = name
    bpy.context.scene.collection.objects.link(obj)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    kill = [f for f in bm.faces if any(labels[v.index] != cluster for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return obj


def normalize(obj, mode, target):
    me = obj.data
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    mn, mx = co.min(axis=0), co.max(axis=0)
    size = mx - mn
    scale = target / max(size[2] if mode == "height" else float(size.max()), 1e-6)
    if mode == "height":
        pivot = np.array([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, mn[2]])
    else:
        pivot = (mn + mx) / 2
    co = (co - pivot) * scale
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
    print(f"  decimated {obj.name} -> {len(obj.data.polygons)} tris")


def shrink_textures(max_size=1024):
    for img in bpy.data.images:
        w, h = img.size
        if max(w, h) > max_size:
            s = max_size / max(w, h)
            img.scale(max(1, int(w * s)), max(1, int(h * s)))


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
    print("  exported", os.path.basename(path), os.path.getsize(path), "bytes")


def delete_verts(obj, remove):
    if not remove:
        return
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in sorted(remove)], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def strip_geometry(obj, mode):
    """Delete junk islands before splitting/normalising.

    'rods' removes thin, elongated shells (the stray tube bundles behind the
    snow piles). 'base' removes everything whose highest point is still below a
    low cut-off (the dirt diorama disc under the Nezha character).
    """
    if not mode:
        return
    co, verts_by_root = components(obj.data)
    remove = set()
    for verts in verts_by_root.values():
        pts = co[verts]
        size = pts.max(axis=0) - pts.min(axis=0)
        if mode == "rods":
            aspect = size.max() / max(size.min(), 1e-5)
            # Thin elongated shells are the stray tube bundles; anything that
            # sits entirely behind the pile line (y > 0.05) is their residue.
            if (aspect > 8 and size[2] < 0.05) or pts[:, 1].min() > 0.05:
                remove.update(verts)
        elif mode == "base":
            if pts[:, 2].max() < 0.12:
                remove.update(verts)
    print(f"  strip[{mode}] removed {len(remove)} / {len(obj.data.vertices)} verts")
    delete_verts(obj, remove)


def run_job(src, count, prefix, mode, target, tris, strip):
    print(f"\n=== {os.path.basename(src)} -> {prefix} (count={count}, {mode}={target}, {tris} tris, strip={strip or '-'})")
    obj = import_mesh(src)
    strip_geometry(obj, strip)
    if count > 1:
        labels = cluster_labels(obj, count)
        outs = [extract_cluster(obj, labels, j, prefix) for j in range(count)]
    else:
        obj.name = prefix
        outs = [obj]
    for i, item in enumerate(outs):
        normalize(item, mode, target)
        decimate(item, tris)
    shrink_textures()
    for i, item in enumerate(outs):
        suffix = f"_{chr(97 + i)}" if count > 1 else ""
        export_selected(item, os.path.join(OUT_DIR, f"{prefix}{suffix}.glb"))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for src, count, prefix, mode, target, tris, strip in JOBS:
        if ONLY is not None and prefix not in ONLY:
            continue
        path = os.path.join(SRC_DIR, src)
        if not os.path.exists(path):
            print("MISSING", path)
            continue
        run_job(path, count, prefix, mode, target, tris, strip)


main()
