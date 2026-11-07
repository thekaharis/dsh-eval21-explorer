# 21cmEVAL explorer

An interactive explorer for **21cmEVAL** lightcone evaluation results,
packaged as a persistent [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI
bundle. It adds a **21cmEVAL** panel to the sidebar and reads new-style
`eval21-run/1` HDF5 run files, legacy result directories, and folders of result
figures.

## Features

- **Overview** — scorecard over all models for one target and group
  (RMSE, R², coherence, power ratio, IoU, bubble W₁, history, front width),
  with selectable model rows.
- **Charts** — spectra (power ratio, coherence, Δ²), global history error,
  neutral-fraction PDF, bubble mass distribution, and reionization-front
  profiles. Wheel zoom, drag pan, double-click reset, legend toggles, hover
  values.
- **Cones** — per-cone scatter plots (RMSE, R², IoU, front width, τ, Δz,
  mean |Δx̄_HI|). Hover identifies a cone; click pins it.
- **JPG export** — the `JPG` button on any chart or cone plot writes a
  standalone 3200 px-wide JPEG on a white background. It captures the current
  models, statistic, pass, group, stage, zoom and hidden-series state, and adds
  a centered title, legend, axes, method note, source and date. Text is sized
  for projection; truth is a solid slate line with larger markers, clearly
  distinct from the dashed model curves.
- **Figures** — PNG/GIF/WebP/SVG under the selected folder with a pan/zoom
  viewer. PDFs open in a new tab.

## Requirements

- A DeepSeek Harness profile with the Web UI (tested with `0.2.2-rc.1`).
- For **new-style HDF5** data: Python 3 with `h5py`.
  - Local: any Python on `PATH`, in the standard Homebrew/Framework locations,
    or named by `DSH_EVAL21_PYTHON`.
  - SSH: `python3` + `h5py` on the remote host, plus key-based, non-interactive
    SSH access.
- For **legacy** `results.json` + `curves.npz` directories: no Python needed.
- No build step, npm dependencies, or Node toolchain is required.

```bash
python3 -m pip install h5py       # if it is not already installed
```

## Installation

This repository root is the bundle package.

1. Install it through DSH's plugin manager. Either point the manager at the
   GitHub spec:

   ```text
   github:thekaharis/dsh-eval21-explorer
   ```

   or clone the repository and install that checkout directory.
2. Refresh the Harness Web UI. The **21cmEVAL** icon appears in the left rail,
   between Plugins and Automation tasks.
3. Open the panel and choose the folder containing your run files.

The same package can be installed from a release tarball:

```bash
npm pack            # or use the attached .tgz release asset
```

## Opening data

The source can be:

- a folder containing `eval21-run/1` `.h5`/`.hdf5` files,
- a single `.h5` run file (type its absolute path in the source field),
- a legacy run directory containing `results.json` and `curves.npz`,
- or a folder of result figures.

For HDF5 data the panel reads `/dataset/info`, `/samples/ids`,
`/model/meta`, `/metrics/*/result`, and only the plotted
`/metrics/{voxel,spectrum,history,observable,bubble,morphology,front}/arrays/*`
datasets. Cube caches, prediction stores and raw lightcones are not required.
The run-file group comes from the dataset path and cone labels from
`/samples/ids` when `groups.json` is absent.

## Suggested folders

The package intentionally ships an empty [`defaults.json`](defaults.json) so a
checkout contains no personal paths. Add local suggestions in your own profile:

```bash
mkdir -p ~/.dsh/eval21-explorer
cat > ~/.dsh/eval21-explorer/defaults.json <<'JSON'
{
  "roots": [
    { "label": "My eval21 results", "path": "/absolute/path/to/results" },
    { "label": "Example figures", "path": "/absolute/path/to/figures" }
  ]
}
JSON
```

Paths may start with `~/`. Missing folders are ignored. The last opened source
and recent sources are also remembered in the Web UI.

## SSH / clusters

Choose **SSH**, fill in the optional **User**, the host alias or hostname, and
the remote folder or `.h5` file. Leave **User** empty to use the user from your
`~/.ssh/config`; an explicit `user@host` typed in the host field still works.
The Host runs the bundled `remote.py` with your normal `ssh` client, so
`~/.ssh/config`, agent, keys, jump hosts and known_hosts keep working. Only
key-based, non-interactive login is supported (`BatchMode=yes`).

```text
user: hd_id260
host: binac
path: /pfs/10/work/.../runs/cm21eval
```

HDF5 reading on the cluster uses its `python3` and `h5py`; legacy data still
needs only the standard library. The remote reader refuses paths outside the
selected tree and transfers only the metrics the panel plots.

## Architecture

| File | Role |
|---|---|
| `index.js` | Host plugin: read-only `/eval21-api` route, caching |
| `data.js` | Local scan/merge of HDF5 and legacy runs, metric flattening, NPZ/NPY decoding |
| `hdf5.js` | Local Python bridge, including interpreter discovery |
| `hdf5_reader.py` | h5py scan/read helper for `eval21-run/1` |
| `ssh.js` | SSH transport, including remote HDF5 reads |
| `remote.py` | Remote scan/read/list helper, h5py for new run files |
| `client.js` | Plain-JS Client plugin: slots, scorecard, SVG charts, viewer |
| `defaults.json` | Empty shipped suggestions; user suggestions live under `~/.dsh/` |

The Client half imports only React from the Harness module table; it does not
import other Harness Client packages. HDF5 parsing stays on the Host, so the
browser never needs an HDF5/WASM dependency.

## Development

The bundle is plain JavaScript and Python; there is no bundler. Edit the files
in place, then restart or toggle the bundle in the plugin manager to reload the
Host half. The Client bundle is reloaded with the profile's normal HMR/restart
path. A syntax check is enough for the JavaScript files:

```bash
node --check index.js data.js hdf5.js ssh.js client.js
python3 -m py_compile hdf5_reader.py remote.py
```

## License

MIT — see [LICENSE](LICENSE).
