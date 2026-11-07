#!/usr/bin/env python3
"""Read ``eval21-run/1`` HDF5 run files for the explorer.

Only h5py and numpy are required.  The Host passes one JSON request on stdin and
receives one JSON response on stdout.  ``scan`` reads metadata and metric results
only; ``read`` reads the curated metric arrays the panel plots.
"""
import json
import math
import os
import sys

try:
    import h5py
    import numpy as np
except Exception as exc:  # pragma: no cover - environment dependent
    json.dump({"error": "Python h5py and numpy are required to read eval21 HDF5 files: " + str(exc)},
              sys.stdout)
    sys.exit(0)

# The arrays behind Overview, Charts and Cones.  Large map/gallery/cylindrical
# arrays are deliberately not loaded into the browser.
PLUGIN_METRICS = ("voxel", "spectrum", "history", "observable", "bubble", "morphology", "front")
MAX_ARRAY_ELEMENTS = 4_000_000


def text(value):
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", "replace")
    return str(value)


def read_json(group, name, default=None):
    if group is None or name not in group:
        return default
    try:
        raw = group[name][()]
        return json.loads(text(raw))
    except Exception:
        return default


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def flatten(value, prefix, out):
    if isinstance(value, dict):
        for key, child in value.items():
            flatten(child, f"{prefix}.{key}" if prefix else str(key), out)
    elif isinstance(value, list):
        return
    elif isinstance(value, bool):
        out[prefix] = value
    elif finite(value):
        out[prefix] = float(value)


def dataset_name(info):
    """Evaluation dataset directory (the parent of a group root)."""
    info = info if isinstance(info, dict) else {}
    data_root = info.get("root") or info.get("path")
    if data_root:
        parent = os.path.basename(os.path.dirname(str(data_root).rstrip(os.sep)))
        if parent:
            return parent
    return ""


def dataset_group(info, relative_path):
    """The short data label used by eval21.visualization.common.Run."""
    info = info if isinstance(info, dict) else {}
    data_path = info.get("path")
    if data_path:
        candidate = os.path.basename(str(data_path).rstrip(os.sep))
        if candidate.lower().endswith((".json", ".h5", ".hdf5", ".npz", ".toml", ".yaml", ".yml")):
            candidate = os.path.basename(os.path.dirname(str(data_path).rstrip(os.sep)))
        if candidate:
            return candidate
    root_path = info.get("root")
    if root_path:
        candidate = os.path.basename(str(root_path).rstrip(os.sep))
        if candidate:
            return candidate
    parent = os.path.dirname(relative_path.rstrip("/"))
    return os.path.basename(parent) if parent else "data"


def stage_labels(results):
    for metric in ("spectrum", "bubble", "observable", "eft"):
        result = results.get(metric)
        if isinstance(result, dict) and isinstance(result.get("stage_labels"), list):
            return [text(value) for value in result["stage_labels"]]
    return []


def variant_of(relative_path):
    parts = relative_path.replace(os.sep, "/").split("/")
    return "viz" if "viz" in parts else ""


def scan_file(path, root):
    with h5py.File(path, "r", locking=False) as handle:
        schema = text(handle.attrs.get("schema", ""))
        if not schema.startswith("eval21-run/") or schema.rsplit("/", 1)[-1].split(".", 1)[0] != "1":
            return None
        relative = os.path.relpath(path, root).replace(os.sep, "/")
        if relative == ".":
            relative = os.path.basename(path)
        model = text(handle.attrs.get("model", "")) or os.path.basename(path).split(".", 1)[0]
        target = text(handle.attrs.get("target", ""))
        dataset_info = read_json(handle.get("dataset"), "info", {}) or {}
        settings = read_json(handle.get("meta"), "settings", {}) or {}
        if not target:
            target = str(settings.get("target", "xhi"))
        model_info = read_json(handle.get("model"), "info", {}) or {}
        model_meta = read_json(handle.get("model"), "meta", {}) or {}
        sample_ids = []
        ids_node = handle.get("samples/ids")
        if ids_node is not None:
            try:
                sample_ids = [text(value) for value in ids_node[:]]
            except Exception:
                sample_ids = []
        results = {}
        flat = {}
        metrics_node = handle.get("metrics")
        if metrics_node is not None:
            for name in metrics_node:
                result = read_json(metrics_node.get(name), "result", None)
                if not isinstance(result, dict):
                    continue
                results[str(name)] = result
                flatten(result, str(name), flat)
        n_samples = int(model_meta.get("n_samples") or dataset_info.get("n_samples") or len(sample_ids) or 0)
        group = dataset_group(dataset_info, relative)
        seconds = model_meta.get("seconds")
        if not isinstance(seconds, (int, float)) or isinstance(seconds, bool) or not math.isfinite(float(seconds)):
            seconds = None
        return {
            "id": relative,
            "path": relative,
            "model": model,
            "group": group,
            "dataset": dataset_name(dataset_info),
            "pass": target,
            "variant": variant_of(relative),
            "target": target,
            "format": "hdf5",
            "nSamples": n_samples,
            "sampleIds": sample_ids,
            "stages": stage_labels(results),
            "metrics": flat,
            "files": {},
            "schema": schema,
            "created": text(handle.attrs.get("created", "")),
            "info": {
                "model": text(model_info.get("model", "")),
                "framework": text(model_info.get("framework", "")),
                "seconds": seconds,
            },
        }


def scan(root, paths):
    root = os.path.realpath(os.path.expanduser(root))
    roots = [os.path.realpath(os.path.expanduser(item)) for item in (paths or [])]
    if not roots:
        roots = []
        for directory, subdirs, files in os.walk(root):
            subdirs[:] = [d for d in subdirs if not d.startswith(".") and d not in ("node_modules", "__pycache__")]
            for name in files:
                if name.lower().endswith((".h5", ".hdf5")):
                    roots.append(os.path.join(directory, name))
    runs = []
    for path in roots:
        try:
            run = scan_file(path, root)
        except (OSError, ValueError):
            continue
        if run is not None:
            runs.append(run)
    return {"runs": runs}


def jsonable(value):
    if isinstance(value, np.ndarray):
        return [jsonable(item) for item in value.tolist()]
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", "replace")
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, (list, tuple)):
        return [jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): jsonable(item) for key, item in value.items()}
    return value


def read_arrays(path, metrics):
    wanted = metrics or list(PLUGIN_METRICS)
    arrays = {}
    with h5py.File(path, "r", locking=False) as handle:
        schema = text(handle.attrs.get("schema", ""))
        if not schema.startswith("eval21-run/"):
            raise ValueError("Not an eval21 run file: " + schema)
        model = text(handle.attrs.get("model", "")) or os.path.basename(path).split(".", 1)[0]
        prefix = f"{model}__" if model else ""
        for metric in wanted:
            node = handle.get(f"metrics/{metric}/arrays")
            if node is None:
                continue
            for key in node:
                dataset = node[key]
                try:
                    if dataset.size > MAX_ARRAY_ELEMENTS:
                        continue
                    arrays[f"{prefix}{metric}__{key}"] = jsonable(dataset[()])
                except Exception:
                    continue
    return {"arrays": arrays}


def main():
    try:
        request = json.load(sys.stdin)
    except Exception as exc:
        json.dump({"error": "Invalid HDF5 request: " + str(exc)}, sys.stdout)
        return
    try:
        operation = request.get("op")
        if operation == "scan":
            result = scan(request.get("root") or "", request.get("paths") or [])
        elif operation == "read":
            path = os.path.realpath(os.path.expanduser(request.get("path") or ""))
            result = read_arrays(path, request.get("metrics") or [])
        else:
            result = {"error": "Unknown HDF5 operation"}
    except Exception as exc:
        result = {"error": str(exc)}
    json.dump(result, sys.stdout, allow_nan=False, ensure_ascii=False)


if __name__ == "__main__":
    main()
