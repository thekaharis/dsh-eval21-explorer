#!/usr/bin/env python3
"""Small, dependency-free 21cmEVAL tree reader used over SSH.

The host sends one JSON request on stdin and receives one JSON object on stdout.
Legacy directories need only the Python standard library; ``eval21-run/1``
files use h5py, which is already a 21cmEVAL dependency on the cluster.
"""
import base64
import json
import os
import stat
import sys

RUN_FILES = {"results.json", "curves.npz", "summary.csv", "stages.csv", "report.md"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
DOCUMENT_EXTENSIONS = {".pdf"}
SKIP_DIRECTORIES = {"node_modules", "__pycache__", ".git", ".hg", ".svn"}
MAX_DEPTH = 4
MAX_ENTRIES = 30000
MAX_FIGURES = 500


def flatten_numbers(value, prefix, out):
    if value is None:
        return
    if isinstance(value, bool):
        out[prefix] = value
        return
    if isinstance(value, (int, float)):
        if value == value and value not in (float("inf"), float("-inf")):
            out[prefix] = value
        return
    if isinstance(value, list):
        return
    if isinstance(value, dict):
        for key, child in value.items():
            flatten_numbers(child, (prefix + "." + str(key)) if prefix else str(key), out)


def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return None


def find_upward(start, name):
    directory = start
    for _ in range(3):
        candidate = os.path.join(directory, name)
        value = load_json(candidate)
        if value is not None:
            return value
        parent = os.path.dirname(directory)
        if parent == directory:
            break
        directory = parent
    return None


def split_run_path(relative_path, model_key):
    parts = [part for part in relative_path.replace(os.sep, "/").split("/") if part]
    group_index = -1
    for index, part in enumerate(parts):
        if len(part) >= 2 and part[0].lower() == "g" and part[1].isdigit():
            group_index = index
            break
    last = parts[-1] if parts else ""
    pass_name = last if last in ("xhi", "tb") else ""
    model_from_path = parts[0] if parts else ""
    if group_index >= 0:
        group = parts[group_index]
    elif len(parts) >= 2:
        group = parts[-2]
    else:
        group = ""
    variant = "/".join(parts[1:group_index]) if group_index > 1 else ""
    return {
        "model": model_key or model_from_path,
        "group": group,
        "pass": pass_name,
        "variant": variant,
    }


def describe_run(root, directory, results, files, model_key):
    relative_path = os.path.relpath(directory, root).replace(os.sep, "/")
    model_entries = list(results.get("models", {}).keys()) if isinstance(results, dict) and isinstance(results.get("models"), dict) else []
    effective_model = model_key or (model_entries[0] if model_entries else None)
    meta = split_run_path(relative_path, effective_model)
    group = meta["group"]
    pass_name = meta["pass"]
    if not pass_name and isinstance(results, dict) and results.get("settings", {}).get("target") in ("xhi", "tb"):
        pass_name = results["settings"]["target"]
    if not group and isinstance(results, dict):
        dataset_root = results.get("dataset", {}).get("root")
        if isinstance(dataset_root, str):
            for part in dataset_root.replace(os.sep, "/").split("/"):
                if len(part) >= 2 and part[0].lower() == "g" and part[1].isdigit():
                    group = part
                    break
    model_result = {}
    if isinstance(results, dict) and effective_model:
        model_result = results.get("models", {}).get(effective_model, {}) or {}
    metrics = model_result.get("metrics") if isinstance(model_result.get("metrics"), dict) else {}
    flat = {}
    flatten_numbers(metrics, "", flat)
    stages = []
    spectrum = metrics.get("spectrum") if isinstance(metrics, dict) else None
    bubble = metrics.get("bubble") if isinstance(metrics, dict) else None
    if isinstance(spectrum, dict) and isinstance(spectrum.get("stage_labels"), list):
        stages = [str(label) for label in spectrum["stage_labels"]]
    elif isinstance(bubble, dict) and isinstance(bubble.get("stage_labels"), list):
        stages = [str(label) for label in bubble["stage_labels"]]
    dataset = results.get("dataset", {}) if isinstance(results, dict) else {}
    try:
        n_samples = int(model_result.get("n_samples") or dataset.get("n_samples") or 0)
    except Exception:
        n_samples = 0
    info = model_result.get("info", {}) if isinstance(model_result.get("info"), dict) else {}
    canonical_path = relative_path or "."
    run_id = canonical_path + "::" + str(effective_model) if len(model_entries) > 1 else canonical_path
    return {
        "id": run_id,
        "path": canonical_path,
        "model": meta["model"],
        "group": group,
        "pass": pass_name,
        "variant": meta["variant"],
        "target": results.get("settings", {}).get("target", "") if isinstance(results, dict) else "",
        "nSamples": n_samples,
        "stages": stages,
        "metrics": flat,
        "files": files,
        "info": {
            "model": info.get("model", ""),
            "framework": info.get("framework", ""),
            "seconds": model_result.get("seconds"),
        },
    }


H5_METRICS = ("voxel", "spectrum", "history", "observable", "bubble", "morphology", "front")
H5_MAX_ELEMENTS = 4_000_000


def h5_text(value):
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", "replace")
    return str(value)


def h5_json(group, name, default=None):
    if group is None or name not in group:
        return default
    try:
        return json.loads(h5_text(group[name][()]))
    except Exception:
        return default


def h5_flatten(value, prefix, out):
    if isinstance(value, dict):
        for key, child in value.items():
            h5_flatten(child, f"{prefix}.{key}" if prefix else str(key), out)
    elif isinstance(value, list):
        return
    elif isinstance(value, bool):
        out[prefix] = value
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        if value == value and value not in (float("inf"), float("-inf")):
            out[prefix] = float(value)


def h5_group(info, relative_path):
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


def h5_scan_file(path, base):
    import h5py
    with h5py.File(path, "r", locking=False) as handle:
        schema = h5_text(handle.attrs.get("schema", ""))
        if not schema.startswith("eval21-run/") or schema.rsplit("/", 1)[-1].split(".", 1)[0] != "1":
            return None
        relative = os.path.relpath(path, base).replace(os.sep, "/")
        if relative == ".":
            relative = os.path.basename(path)
        model = h5_text(handle.attrs.get("model", "")) or os.path.basename(path).split(".", 1)[0]
        target = h5_text(handle.attrs.get("target", ""))
        dataset_info = h5_json(handle.get("dataset"), "info", {}) or {}
        settings = h5_json(handle.get("meta"), "settings", {}) or {}
        if not target:
            target = str(settings.get("target", "xhi"))
        model_info = h5_json(handle.get("model"), "info", {}) or {}
        model_meta = h5_json(handle.get("model"), "meta", {}) or {}
        sample_ids = []
        ids_node = handle.get("samples/ids")
        if ids_node is not None:
            try:
                sample_ids = [h5_text(value) for value in ids_node[:]]
            except Exception:
                sample_ids = []
        results = {}
        flat = {}
        metrics_node = handle.get("metrics")
        if metrics_node is not None:
            for name in metrics_node:
                result = h5_json(metrics_node.get(name), "result", None)
                if isinstance(result, dict):
                    results[str(name)] = result
                    h5_flatten(result, str(name), flat)
        stages = []
        for metric in ("spectrum", "bubble", "observable", "eft"):
            result = results.get(metric)
            if isinstance(result, dict) and isinstance(result.get("stage_labels"), list):
                stages = [h5_text(value) for value in result["stage_labels"]]
                break
        try:
            n_samples = int(model_meta.get("n_samples") or dataset_info.get("n_samples") or len(sample_ids) or 0)
        except Exception:
            n_samples = 0
        parts = relative.replace(os.sep, "/").split("/")
        seconds = model_meta.get("seconds")
        if not isinstance(seconds, (int, float)) or isinstance(seconds, bool) or seconds != seconds or seconds in (float("inf"), float("-inf")):
            seconds = None
        return {
            "id": relative,
            "path": relative,
            "model": model,
            "group": h5_group(dataset_info, relative),
            "pass": target,
            "variant": "viz" if "viz" in parts else "",
            "target": target,
            "format": "hdf5",
            "nSamples": n_samples,
            "sampleIds": sample_ids,
            "stages": stages,
            "metrics": flat,
            "files": {},
            "schema": schema,
            "created": h5_text(handle.attrs.get("created", "")),
            "info": {
                "model": h5_text(model_info.get("model", "")),
                "framework": h5_text(model_info.get("framework", "")),
                "seconds": seconds,
            },
        }


def h5_jsonable(value):
    import numpy as np
    if isinstance(value, np.ndarray):
        return [h5_jsonable(item) for item in value.tolist()]
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", "replace")
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float):
        return value if value == value and value not in (float("inf"), float("-inf")) else None
    if isinstance(value, (list, tuple)):
        return [h5_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): h5_jsonable(item) for key, item in value.items()}
    return value


def h5_target(root, requested):
    if os.path.isfile(root):
        if not requested or os.path.basename(root) == requested or os.path.realpath(requested) == root:
            return root
        raise ValueError("Path leaves the selected file")
    return safe_path(root, requested)


def h5_read(root, requested, metrics):
    import h5py
    target = h5_target(root, requested or "")
    arrays = {}
    with h5py.File(target, "r", locking=False) as handle:
        schema = h5_text(handle.attrs.get("schema", ""))
        if not schema.startswith("eval21-run/"):
            raise ValueError("Not an eval21 run file: " + schema)
        model = h5_text(handle.attrs.get("model", "")) or os.path.basename(target).split(".", 1)[0]
        prefix = f"{model}__" if model else ""
        for metric in (metrics or list(H5_METRICS)):
            node = handle.get(f"metrics/{metric}/arrays")
            if node is None:
                continue
            for key in node:
                dataset = node[key]
                try:
                    if dataset.size > H5_MAX_ELEMENTS:
                        continue
                    arrays[f"{prefix}{metric}__{key}"] = h5_jsonable(dataset[()])
                except Exception:
                    continue
    return {"arrays": arrays}

def scan(root):
    if not root or not os.path.exists(root):
        return {"error": "Remote folder does not exist: " + (root or "(empty)")}
    base = os.path.dirname(root) if os.path.isfile(root) else root
    if os.path.isfile(root) and os.path.splitext(root)[1].lower() not in (".h5", ".hdf5"):
        return {"error": "Remote path is neither a folder nor an HDF5 file: " + root}
    run_directories = {}
    h5_paths = []
    figures = []
    style = None
    groups = None
    visited = 0
    stack = [(root, 0)] if os.path.isdir(root) else []
    while stack and visited < MAX_ENTRIES:
        directory, depth = stack.pop()
        try:
            entries = sorted(os.scandir(directory), key=lambda entry: entry.name)
        except Exception:
            continue
        for entry in entries:
            visited += 1
            if visited >= MAX_ENTRIES:
                break
            if entry.name.startswith("."):
                continue
            try:
                if entry.is_dir(follow_symlinks=False):
                    if entry.name in SKIP_DIRECTORIES or depth >= MAX_DEPTH:
                        continue
                    stack.append((entry.path, depth + 1))
                    continue
                if not entry.is_file(follow_symlinks=False):
                    continue
            except Exception:
                continue
            extension = os.path.splitext(entry.name)[1].lower()
            if extension in (".h5", ".hdf5"):
                h5_paths.append(entry.path)
                continue
            if entry.name in ("cm21eval_style.json", "style.json"):
                style = load_json(entry.path) or style
                continue
            if entry.name == "groups.json":
                groups = load_json(entry.path) or groups
                continue
            if extension in IMAGE_EXTENSIONS or extension in DOCUMENT_EXTENSIONS:
                if len(figures) < MAX_FIGURES:
                    try:
                        info = entry.stat(follow_symlinks=False)
                        figures.append({
                            "path": os.path.relpath(entry.path, root).replace(os.sep, "/"),
                            "name": entry.name,
                            "dir": os.path.dirname(os.path.relpath(entry.path, root)).replace(os.sep, "/").strip(".") or "",
                            "ext": extension,
                            "size": info.st_size,
                            "mtime": int(info.st_mtime * 1000),
                        })
                    except Exception:
                        pass
                continue
            if entry.name in RUN_FILES:
                bucket = run_directories.setdefault(directory, {"files": {}})
                bucket["files"][entry.name] = os.path.relpath(entry.path, directory).replace(os.sep, "/")
    if os.path.isfile(root) and os.path.splitext(root)[1].lower() in (".h5", ".hdf5"):
        h5_paths.append(root)
    if style is None:
        style = find_upward(base, "cm21eval_style.json") or find_upward(base, "style.json")
    if groups is None:
        groups = find_upward(base, "groups.json")
    runs = []
    for directory, bucket in run_directories.items():
        results = load_json(os.path.join(directory, "results.json"))
        model_keys = list(results.get("models", {}).keys()) if isinstance(results, dict) and isinstance(results.get("models"), dict) else [None]
        for model_key in model_keys:
            runs.append(describe_run(base, directory, results, bucket["files"], model_key))
    if h5_paths:
        try:
            import h5py  # noqa: F401
        except Exception as error:
            return {"error": "The remote host needs h5py to read eval21 HDF5 run files: " + str(error)}
        for path in h5_paths:
            try:
                run = h5_scan_file(path, base)
            except (OSError, ValueError):
                run = None
            if run is not None:
                runs.append(run)
    return {"runs": runs, "figures": figures, "style": style, "groups": groups}


def safe_path(root, requested):
    target = os.path.realpath(requested if os.path.isabs(requested) else os.path.join(root, requested))
    if root:
        prefix = root if root.endswith(os.sep) else root + os.sep
        if target != root and not target.startswith(prefix):
            raise ValueError("Path leaves the selected folder")
    return target


def read_file(root, requested, as_text):
    target = safe_path(root, requested)
    info = os.stat(target)
    if not stat.S_ISREG(info.st_mode):
        raise ValueError("Not a file")
    if info.st_size > 48 * 1024 * 1024:
        raise ValueError("File is too large for the explorer")
    with open(target, "rb") as handle:
        data = handle.read()
    if as_text:
        return {"text": data.decode("utf-8", "replace"), "size": len(data)}
    return {"data": base64.b64encode(data).decode("ascii"), "size": len(data)}


def list_directory(requested):
    target = os.path.realpath(os.path.expanduser(requested or "~"))
    if not os.path.isdir(target):
        return {"error": "Not a directory: " + target}
    entries = []
    try:
        for entry in sorted(os.scandir(target), key=lambda item: item.name.lower()):
            if entry.name.startswith("."):
                continue
            try:
                if entry.is_dir(follow_symlinks=False):
                    entries.append({"name": entry.name, "path": entry.path})
            except Exception:
                continue
            if len(entries) >= 500:
                break
    except Exception as error:
        return {"error": str(error)}
    return {
        "path": target,
        "parent": os.path.dirname(target),
        "dirs": entries,
    }


def main():
    try:
        request = json.load(sys.stdin)
    except Exception as error:
        json.dump({"error": "Invalid request: " + str(error)}, sys.stdout)
        return
    operation = request.get("op")
    root_value = request.get("root") or ""
    root = os.path.realpath(os.path.expanduser(root_value)) if root_value else ""
    try:
        if operation == "scan":
            result = scan(root)
        elif operation == "read_h5":
            result = h5_read(root, request.get("path") or "", request.get("metrics") or [])
        elif operation == "read":
            result = read_file(root, request.get("path") or "", bool(request.get("text")))
        elif operation == "list":
            result = list_directory(request.get("path") or root)
        elif operation == "ping":
            result = {"ok": True, "hostname": os.uname().nodename, "python": sys.version.split()[0]}
        else:
            result = {"error": "Unknown operation"}
    except Exception as error:
        result = {"error": str(error)}
    json.dump(result, sys.stdout, ensure_ascii=True, allow_nan=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
