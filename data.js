/**
 * Local data access for the 21cmEVAL explorer.
 *
 * The explorer is deliberately independent of the installed 21cmEVAL package:
 * a run directory is valid when it contains the files `eval21 run` writes, so
 * the same code reads a checkout, a copied results tree, or a remote tree.
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { hdf5Read, hdf5Scan, PLUGIN_H5_METRICS } from './hdf5.js';
export { PLUGIN_H5_METRICS } from './hdf5.js';

export const RUN_FILE_NAMES = new Set([
  'results.json',
  'curves.npz',
  'summary.csv',
  'stages.csv',
  'report.md',
]);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const DOCUMENT_EXTENSIONS = new Set(['.pdf']);
const SKIP_DIRECTORIES = new Set(['node_modules', '__pycache__', '.git', '.hg', '.svn']);

const MAX_DEPTH = 4;
const MAX_ENTRIES = 30000;
const MAX_FIGURES = 500;


const DATASET_LABELS = {
  '21cmfast_199': '21cmFAST 199',
  '21cmfast_200': '21cmFAST 200',
  'loreli': 'LoReLi',
  legacy: 'Legacy results',
};

const MODEL_LABELS = {
  fno_cnn_whno_es: 'fno-21cm (CNN)',
};

function prettyLabel(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function datasetIdForRun(run) {
  if (run.dataset) return run.dataset;
  if (run.format === 'hdf5') {
    const top = String(run.path || '').split('/')[0];
    return top && /^(21cmfast|loreli)/i.test(top) ? top : 'data';
  }
  return 'legacy';
}

function datasetLabelForRun(run, id, source) {
  const top = String(run.path || '').split('/')[0];
  if (DATASET_LABELS[top]) return DATASET_LABELS[top];
  const sourceRoot = source && source.root ? String(source.root).replace(/\/+$/, '') : '';
  const sourceBase = sourceRoot ? path.posix.basename(sourceRoot) : '';
  if (DATASET_LABELS[sourceBase]) return DATASET_LABELS[sourceBase];
  if (/loreli/i.test(id)) return 'LoReLi';
  if (/21cmfast/i.test(id)) {
    if (/200/.test(id)) return '21cmFAST 200';
    if (/199/.test(id)) return '21cmFAST 199';
    return '21cmFAST';
  }
  if (DATASET_LABELS[id]) return DATASET_LABELS[id];
  return prettyLabel(id) || 'Data';
}

const PALETTE = [
  '#4c78a8', '#f58518', '#54a24b', '#e45756', '#72b7b2',
  '#eeca3b', '#b279a2', '#ff9da6', '#9d755d', '#bab0ac',
  '#86bcb6', '#d67195', '#8cd17d', '#b6992d', '#499894',
];

/** Convert a matplotlib grayscale style value ("0.15") to a CSS colour. */
function generatedColor(index) {
  const hue = Math.round((index * 137.508 + 210) % 360);
  return `hsl(${hue} 46% 48%)`;
}

function normalizeColor(value, fallback) {
  if (typeof value === 'string') {
    const gray = /^\s*(0|1|0?\.\d+)\s*$/.exec(value);
    if (gray) {
      const level = Math.max(0, Math.min(255, Math.round(Number(gray[1]) * 255)));
      const hex = level.toString(16).padStart(2, '0');
      return `#${hex}${hex}${hex}`;
    }
    if (value.trim()) return value.trim();
  }
  return fallback;
}

function normalizeDash(value) {
  switch (value) {
    case '--': return '6 4';
    case ':': return '1.5 3.5';
    case '-.': return '7 3 2 3';
    case '-': return '';
    default: return typeof value === 'string' ? value : '';
  }
}

function normalizeStyle(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [key, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    out[key] = {
      label: typeof entry.label === 'string' ? entry.label : key,
      color: normalizeColor(entry.color, null),
      dash: normalizeDash(entry.ls),
    };
  }
  return out;
}

/** Turn a metrics object into the flat map the panel reads. */
function flattenNumbers(value, prefix, out) {
  if (value === null || value === undefined) return;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) out[prefix] = value;
    return;
  }
  if (typeof value === 'boolean') {
    out[prefix] = value;
    return;
  }
  if (Array.isArray(value)) return;
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flattenNumbers(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
}

function splitRunPath(relativePath, modelKey) {
  const parts = relativePath.split('/').filter(Boolean);
  const groupIndex = parts.findIndex((part) => /^G\d+([_.]|$)/i.test(part));
  const last = parts[parts.length - 1] || '';
  const pass = last === 'xhi' || last === 'tb' ? last : '';
  const modelFromPath = parts[0] || '';
  const group = groupIndex >= 0
    ? parts[groupIndex]
    : (parts.length >= 2 ? parts[parts.length - 2] : '');
  const variant = groupIndex > 1 ? parts.slice(1, groupIndex).join('/') : '';
  return {
    model: modelKey || modelFromPath,
    group,
    pass,
    variant,
  };
}

function describeRun(root, directory, results, files, modelKey) {
  const relativePath = path.relative(root, directory).split(path.sep).join('/');
  const modelEntries = results && results.models && typeof results.models === 'object'
    ? Object.keys(results.models)
    : [];
  const effectiveModel = modelKey || modelEntries[0] || null;
  const meta = splitRunPath(relativePath, effectiveModel);
  let group = meta.group;
  let pass = meta.pass;
  if (!pass && results?.settings && (results.settings.target === 'xhi' || results.settings.target === 'tb')) {
    pass = results.settings.target;
  }
  if (!group && typeof results?.dataset?.root === 'string') {
    const datasetParts = results.dataset.root.split('/').filter(Boolean);
    const groupPart = datasetParts.find((part) => /^G\d+([_.]|$)/i.test(part));
    if (groupPart) group = groupPart;
  }
  const modelResult = effectiveModel && results?.models ? results.models[effectiveModel] : undefined;
  const metrics = modelResult?.metrics && typeof modelResult.metrics === 'object'
    ? modelResult.metrics
    : {};
  const flat = {};
  flattenNumbers(metrics, '', flat);
  const stages = Array.isArray(metrics.spectrum?.stage_labels)
    ? metrics.spectrum.stage_labels.map(String)
    : Array.isArray(metrics.bubble?.stage_labels)
      ? metrics.bubble.stage_labels.map(String)
      : [];
  const nSamples = Number(modelResult?.n_samples ?? results?.dataset?.n_samples ?? 0) || 0;
  const canonicalPath = relativePath || '.';
  const id = modelEntries.length > 1 ? `${canonicalPath}::${effectiveModel}` : canonicalPath;
  return {
    id,
    path: canonicalPath,
    model: meta.model,
    group,
    pass,
    variant: meta.variant,
    target: results?.settings?.target || '',
    nSamples,
    stages,
    metrics: flat,
    files,
    info: {
      model: modelResult?.info?.model || '',
      framework: modelResult?.info?.framework || '',
      seconds: Number(modelResult?.seconds ?? 0) || null,
    },
  };
}

function makeFigure(root, absolutePath, stat) {
  const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
  const directory = path.posix.dirname(relativePath);
  return {
    path: relativePath,
    name: path.posix.basename(relativePath),
    dir: directory === '.' ? '' : directory,
    ext: path.extname(relativePath).toLowerCase(),
    size: stat.size,
    mtime: Math.round(stat.mtimeMs),
  };
}

async function readJsonIfPresent(file) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function findUpward(start, names) {
  let directory = start;
  for (let depth = 0; depth < 3; depth += 1) {
    for (const name of names) {
      const candidate = path.join(directory, name);
      const value = await readJsonIfPresent(candidate);
      if (value) return { value, file: candidate };
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return null;
}

async function walkLocal(root) {
  const runDirectories = new Map();
  const h5Files = [];
  const figures = [];
  let styleRaw = null;
  let groupsRaw = null;
  let visited = 0;
  const stack = [{ directory: root, depth: 0 }];
  while (stack.length > 0 && visited < MAX_ENTRIES) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fsp.readdir(current.directory, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      visited += 1;
      if (visited >= MAX_ENTRIES) break;
      if (entry.name.startsWith('.')) continue;
      const absolute = path.join(current.directory, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name) || current.depth >= MAX_DEPTH) continue;
        stack.push({ directory: absolute, depth: current.depth + 1 });
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (extension === '.h5' || extension === '.hdf5') {
        if (h5Files.length < 500) h5Files.push(absolute);
        continue;
      }
      if (entry.name === 'cm21eval_style.json' || entry.name === 'style.json') {
        styleRaw = await readJsonIfPresent(absolute) || styleRaw;
        continue;
      }
      if (entry.name === 'groups.json') {
        groupsRaw = await readJsonIfPresent(absolute) || groupsRaw;
        continue;
      }
      if (IMAGE_EXTENSIONS.has(extension) || DOCUMENT_EXTENSIONS.has(extension)) {
        if (figures.length < MAX_FIGURES) {
          try {
            figures.push(makeFigure(root, absolute, await fsp.stat(absolute)));
          } catch {
            // A file that disappears during a scan is simply not listed.
          }
        }
        continue;
      }
      if (RUN_FILE_NAMES.has(entry.name)) {
        let bucket = runDirectories.get(current.directory);
        if (!bucket) {
          bucket = { directory: current.directory, files: {} };
          runDirectories.set(current.directory, bucket);
        }
        bucket.files[entry.name] = path.relative(current.directory, absolute).split(path.sep).join('/');
      }
    }
  }
  if (!styleRaw) {
    styleRaw = (await findUpward(root, ['cm21eval_style.json', 'style.json']))?.value || null;
  }
  if (!groupsRaw) {
    groupsRaw = (await findUpward(root, ['groups.json']))?.value || null;
  }
  return { runDirectories, h5Files, figures, styleRaw, groupsRaw };
}

async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function scanLocal(source) {
  const root = source.root;
  let stat;
  try {
    stat = await fsp.stat(root);
  } catch (error) {
    throw new Error(`Cannot open ${root}: ${error.message}`);
  }
  const realRoot = await fsp.realpath(root);
  if (!stat.isDirectory()) {
    if (path.extname(realRoot).toLowerCase() !== '.h5' && path.extname(realRoot).toLowerCase() !== '.hdf5') {
      throw new Error(`${root} is neither a folder nor an HDF5 file`);
    }
    const parent = path.dirname(realRoot);
    const h5 = await hdf5Scan(parent, [realRoot]);
    return {
      runs: Array.isArray(h5.runs) ? h5.runs : [],
      figures: [],
      style: (await findUpward(parent, ['cm21eval_style.json', 'style.json']))?.value || null,
      groups: (await findUpward(parent, ['groups.json']))?.value || null,
    };
  }
  const walked = await walkLocal(realRoot);
  const runList = await mapLimit([...walked.runDirectories.values()], 8, async (bucket) => {
    const resultsPath = path.join(bucket.directory, 'results.json');
    const results = await readJsonIfPresent(resultsPath);
    const modelKeys = results?.models && typeof results.models === 'object'
      ? Object.keys(results.models)
      : [null];
    return modelKeys.map((modelKey) => describeRun(realRoot, bucket.directory, results, bucket.files, modelKey));
  });
  let hdf5Runs = [];
  if (walked.h5Files.length > 0) {
    const h5 = await hdf5Scan(realRoot, walked.h5Files);
    hdf5Runs = Array.isArray(h5.runs) ? h5.runs : [];
  }
  return {
    runs: [...runList.flat().filter(Boolean), ...hdf5Runs],
    figures: walked.figures,
    style: walked.styleRaw,
    groups: walked.groupsRaw,
  };
}

/** Attach display metadata and stable order to a raw scan from local or SSH. */
export function finalizeManifest(raw, source) {
  const style = normalizeStyle(raw.style);
  const runs = Array.isArray(raw.runs) ? raw.runs.filter((run) => run && run.path) : [];
  const groupsRaw = raw.groups && typeof raw.groups === 'object' ? raw.groups : {};
  const datasetMap = new Map();
  for (const run of runs) {
    const id = datasetIdForRun(run);
    run.dataset = id;
    run.datasetLabel = datasetLabelForRun(run, id, source);
    if (!datasetMap.has(id)) {
      datasetMap.set(id, { id, label: run.datasetLabel, runs: 0, models: new Set(), groups: new Set(), passes: new Set() });
    }
    const entry = datasetMap.get(id);
    entry.runs += 1;
    entry.models.add(run.model);
    if (run.group) entry.groups.add(run.group);
    if (run.pass) entry.passes.add(run.pass);
  }
  const modelKeys = [];
  for (const run of runs) {
    if (!modelKeys.includes(run.model)) modelKeys.push(run.model);
  }
  const styleOrder = Object.keys(style);
  modelKeys.sort((a, b) => {
    const ai = styleOrder.indexOf(a);
    const bi = styleOrder.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });
  const models = modelKeys.map((key, index) => {
    const entry = style[key];
    return {
      key,
      label: entry?.label || MODEL_LABELS[key] || key,
      color: entry?.color || (index < PALETTE.length ? PALETTE[index] : generatedColor(index)),
      dash: entry?.dash || '',
    };
  });
  const groupOrder = new Map(modelKeys.map((key, index) => [key, index]));
  runs.sort((a, b) => {
    const model = (groupOrder.get(a.model) ?? 999) - (groupOrder.get(b.model) ?? 999);
    if (model !== 0) return model;
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    if (a.pass !== b.pass) return a.pass.localeCompare(b.pass);
    return a.variant.localeCompare(b.variant);
  });
  const groups = {};
  for (const [id, value] of Object.entries(groupsRaw)) {
    groups[id] = {
      id,
      cones: Array.isArray(value?.cones) ? value.cones : [],
      z: Array.isArray(value?.z) ? value.z : [],
      note: typeof value?.note === 'string' ? value.note : '',
    };
  }
  for (const run of runs) {
    if (!run.group) continue;
    if (!groups[run.group]) {
      groups[run.group] = { id: run.group, cones: [], z: [], note: '' };
    }
    if (run.format === 'hdf5' && Array.isArray(run.sampleIds) && run.sampleIds.length > 0) {
      groups[run.group].cones = run.sampleIds;
    } else if ((!groups[run.group].cones || groups[run.group].cones.length === 0)
        && Array.isArray(run.sampleIds) && run.sampleIds.length > 0) {
      groups[run.group].cones = run.sampleIds;
    }
  }
  const figures = (Array.isArray(raw.figures) ? raw.figures : [])
    .filter((figure) => figure && figure.path)
    .sort((a, b) => (a.dir || '').localeCompare(b.dir || '') || a.name.localeCompare(b.name));
  const kind = runs.length > 0
    ? (figures.length > 0 ? 'mixed' : 'runs')
    : (figures.length > 0 ? 'figures' : 'empty');
  const datasets = [...datasetMap.values()]
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      runs: entry.runs,
      models: entry.models.size,
      groups: entry.groups.size,
      passes: [...entry.passes].sort(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  return {
    version: 1,
    source: { kind: source.kind, root: source.root, host: source.host || null },
    scannedAt: new Date().toISOString(),
    kind,
    models,
    groups,
    runs,
    figures,
    datasets,
    counts: {
      models: models.length,
      groups: Object.keys(groups).length,
      runs: runs.length,
      figures: figures.length,
      datasets: datasets.length,
    },
  };
}

export async function localDefaults() {
  const definitions = [];
  const add = (raw) => {
    if (!raw || !Array.isArray(raw.roots)) return;
    for (const entry of raw.roots) {
      if (!entry || typeof entry.path !== 'string') continue;
      const target = expandHome(entry.path);
      if (!definitions.some((item) => item.path === target)) {
        definitions.push({ label: entry.label || path.basename(target), path: target });
      }
    }
  };
  try {
    add(JSON.parse(await fsp.readFile(new URL('./defaults.json', import.meta.url), 'utf8')));
  } catch {
    // A bundle without suggested roots is still usable.
  }
  const userDefaults = path.join(os.homedir(), '.dsh', 'eval21-explorer', 'defaults.json');
  try {
    add(JSON.parse(await fsp.readFile(userDefaults, 'utf8')));
  } catch {
    // User defaults are optional.
  }
  const roots = [];
  for (const entry of definitions) {
    try {
      const real = await fsp.realpath(entry.path);
      const stat = await fsp.stat(real);
      if (stat.isDirectory()) roots.push({ label: entry.label, path: real, kind: 'local' });
    } catch {
      // A default that is not present on this machine is not offered.
    }
  }
  return { roots, home: os.homedir() };
}

export function expandHome(value) {
  if (typeof value !== 'string') return '';
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

export function resolveInside(root, relativePath) {
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative !== '' && (relative.startsWith('..') || path.isAbsolute(relative))) {
    throw new Error('Path leaves the selected folder');
  }
  return target;
}

export async function readLocalFile(source, relativePath, asText) {
  const root = await fsp.realpath(source.root);
  const target = await fsp.realpath(resolveInside(root, relativePath));
  const relative = path.relative(root, target);
  if (relative !== '' && (relative.startsWith('..') || path.isAbsolute(relative))) {
    throw new Error('Path leaves the selected folder');
  }
  const stat = await fsp.stat(target);
  if (!stat.isFile()) throw new Error('Not a file');
  if (stat.size > 80 * 1024 * 1024) throw new Error('File is too large for the explorer');
  const buffer = await fsp.readFile(target);
  return asText
    ? { text: buffer.toString('utf8'), size: stat.size }
    : { buffer, size: stat.size };
}

export async function loadLocalRun(source, runPath) {
  if (/\.(h5|hdf5)$/i.test(runPath)) {
    let base = source.root;
    try {
      if ((await fsp.stat(base)).isFile()) base = path.dirname(base);
    } catch {
      // Keep the configured root; the absolute path below will report the error.
    }
    const absolute = resolveInside(base, runPath);
    const result = await hdf5Read(absolute, PLUGIN_H5_METRICS);
    return result.arrays || {};
  }
  const result = await readLocalFile(source, path.posix.join(runPath, 'curves.npz'), false);
  return parseNpz(result.buffer);
}

export function mimeFor(file) {
  switch (path.extname(file).toLowerCase()) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.pdf': return 'application/pdf';
    case '.json': return 'application/json; charset=utf-8';
    case '.md': return 'text/markdown; charset=utf-8';
    case '.csv': return 'text/csv; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.npz': return 'application/octet-stream';
    default: return 'application/octet-stream';
  }
}

/* ------------------------------------------------------------------ */
/* NPY / NPZ decoding                                                   */
/* ------------------------------------------------------------------ */

function dtypeFor(descriptor) {
  const match = /^([<>=|])([a-zA-Z])(\d+)$/.exec(descriptor);
  if (!match) return null;
  const [, endian, kind, widthText] = match;
  const width = Number(widthText);
  const big = endian === '>';
  const little = endian === '<' || endian === '=';
  const key = `${kind}${width}`;
  const table = {
    f2: { get: little ? 'readUInt16LE' : 'readUInt16BE', ctor: null },
    f4: { get: little ? 'readFloatLE' : 'readFloatBE', ctor: Float32Array },
    f8: { get: little ? 'readDoubleLE' : 'readDoubleBE', ctor: Float64Array },
    i1: { get: 'readInt8', ctor: Int8Array },
    i2: { get: little ? 'readInt16LE' : 'readInt16BE', ctor: Int16Array },
    i4: { get: little ? 'readInt32LE' : 'readInt32BE', ctor: Int32Array },
    i8: { get: little ? 'readBigInt64LE' : 'readBigInt64BE', ctor: BigInt64Array, bigint: true },
    u1: { get: 'readUInt8', ctor: Uint8Array },
    u2: { get: little ? 'readUInt16LE' : 'readUInt16BE', ctor: Uint16Array },
    u4: { get: little ? 'readUInt32LE' : 'readUInt32BE', ctor: Uint32Array },
    u8: { get: little ? 'readBigUInt64LE' : 'readBigUInt64BE', ctor: BigUint64Array, bigint: true },
  };
  if (key === 'f2') {
    return { size: 2, read: (buffer, offset) => {
      const half = buffer[little ? 'readUInt16LE' : 'readUInt16BE'](offset);
      const sign = half & 0x8000 ? -1 : 1;
      const exponent = (half >> 10) & 0x1f;
      const fraction = half & 0x3ff;
      if (exponent === 0) return sign * fraction * 2 ** -24;
      if (exponent === 31) return fraction ? NaN : sign * Infinity;
      return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
    } };
  }
  const entry = table[key];
  if (!entry) return null;
  return {
    size: width,
    big,
    bigint: Boolean(entry.bigint),
    read: (buffer, offset) => {
      const value = buffer[entry.get](offset);
      return typeof value === 'bigint' ? Number(value) : value;
    },
  };
}

function parseNpy(buffer) {
  if (buffer.length < 10) return null;
  if (buffer[0] !== 0x93 || buffer.toString('latin1', 1, 6) !== 'NUMPY') return null;
  const major = buffer[6];
  const headerLength = major === 1 ? buffer.readUInt16LE(8) : buffer.readUInt32LE(8);
  const headerStart = major === 1 ? 10 : 12;
  const header = buffer.toString('latin1', headerStart, headerStart + headerLength);
  const descr = /'descr'\s*:\s*'([^']+)'/.exec(header)?.[1];
  const fortran = /'fortran_order'\s*:\s*(True|False)/.exec(header)?.[1] === 'True';
  const shapeMatch = /'shape'\s*:\s*\(([^)]*)\)/.exec(header);
  if (!descr || !shapeMatch) return null;
  const shape = shapeMatch[1].split(',').map((part) => part.trim()).filter(Boolean).map(Number);
  if (shape.some((part) => !Number.isFinite(part) || part < 0)) return null;
  const dtype = dtypeFor(descr);
  if (!dtype) return null;
  const total = shape.reduce((product, part) => product * part, 1);
  if (!Number.isFinite(total) || total > 4_000_000) return null;
  const dataStart = headerStart + headerLength;
  if (buffer.length < dataStart + total * dtype.size) return null;
  const values = new Array(total);
  for (let index = 0; index < total; index += 1) {
    values[index] = dtype.read(buffer, dataStart + index * dtype.size);
  }
  if (shape.length === 0) return values[0];
  if (fortran && shape.length > 1) {
    // Materialise Fortran order into a nested C-order array.
    const strides = new Array(shape.length).fill(1);
    for (let axis = shape.length - 2; axis >= 0; axis -= 1) {
      strides[axis] = strides[axis + 1] * shape[axis + 1];
    }
    const output = new Array(total);
    for (let index = 0; index < total; index += 1) {
      let remainder = index;
      let cIndex = 0;
      for (let axis = 0; axis < shape.length; axis += 1) {
        const coordinate = Math.floor(remainder / strides[axis]);
        remainder %= strides[axis];
        cIndex = cIndex * shape[axis] + coordinate;
      }
      output[cIndex] = values[index];
    }
    return nest(output, shape);
  }
  return nest(values, shape);
}

function nest(flat, shape) {
  if (shape.length === 1) return flat;
  if (shape.length === 2) {
    const [rows, columns] = shape;
    const output = new Array(rows);
    for (let row = 0; row < rows; row += 1) {
      output[row] = flat.slice(row * columns, (row + 1) * columns);
    }
    return output;
  }
  const [head, ...tail] = shape;
  const stride = tail.reduce((product, part) => product * part, 1);
  const output = new Array(head);
  for (let index = 0; index < head; index += 1) {
    output[index] = nest(flat.slice(index * stride, (index + 1) * stride), tail);
  }
  return output;
}

export function parseNpz(buffer) {
  const arrays = {};
  const eocd = findEndOfCentralDirectory(buffer);
  if (eocd < 0) throw new Error('Not a readable NPZ archive');
  let entryCount = buffer.readUInt16LE(eocd + 10);
  let centralOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || centralOffset === 0xffffffff) {
    const zip64 = readZip64EndOfCentralDirectory(buffer, eocd);
    if (zip64) {
      entryCount = zip64.entryCount;
      centralOffset = zip64.centralOffset;
    }
  }
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Malformed NPZ central directory');
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    let compressedSize = buffer.readUInt32LE(offset + 20);
    let uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    let localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const extraStart = offset + 46 + nameLength;
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
      const sizes = readZip64Extra(buffer, extraStart, extraLength, {
        uncompressedSize: uncompressedSize === 0xffffffff,
        compressedSize: compressedSize === 0xffffffff,
        localOffset: localOffset === 0xffffffff,
      });
      if (sizes.uncompressedSize !== undefined) uncompressedSize = sizes.uncompressedSize;
      if (sizes.compressedSize !== undefined) compressedSize = sizes.compressedSize;
      if (sizes.localOffset !== undefined) localOffset = sizes.localOffset;
    }
    if (flags & 0x01) throw new Error('Encrypted NPZ archives are not supported');
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error('Malformed NPZ local header');
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > buffer.length) throw new Error('Truncated NPZ archive');
    if (name.endsWith('.npy')) {
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      let raw;
      if (method === 0) {
        raw = compressed;
      } else if (method === 8) {
        raw = zlib.inflateRawSync(compressed);
      } else {
        throw new Error(`Unsupported NPZ compression method ${method}`);
      }
      const key = name.slice(0, -4);
      const parsed = parseNpy(raw);
      if (parsed !== null) arrays[key] = parsed;
    }
    offset = extraStart + extraLength + commentLength;
  }
  return arrays;
}

function findEndOfCentralDirectory(buffer) {
  const minimum = Math.max(0, buffer.length - 70000);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function readZip64EndOfCentralDirectory(buffer, eocd) {
  if (eocd < 20 || buffer.readUInt32LE(eocd - 20) !== 0x07064b50) return null;
  const zip64Offset = Number(buffer.readBigUInt64LE(eocd - 20 + 8));
  if (zip64Offset + 56 > buffer.length || buffer.readUInt32LE(zip64Offset) !== 0x06064b50) return null;
  return {
    entryCount: Number(buffer.readBigUInt64LE(zip64Offset + 32)),
    centralOffset: Number(buffer.readBigUInt64LE(zip64Offset + 48)),
  };
}

function readZip64Extra(buffer, extraStart, extraLength, needed) {
  let cursor = extraStart;
  const end = extraStart + extraLength;
  const result = {};
  while (cursor + 4 <= end) {
    const id = buffer.readUInt16LE(cursor);
    const size = buffer.readUInt16LE(cursor + 2);
    const dataStart = cursor + 4;
    if (id === 0x0001) {
      let position = dataStart;
      if (needed.uncompressedSize && position + 8 <= dataStart + size) {
        result.uncompressedSize = Number(buffer.readBigUInt64LE(position));
        position += 8;
      }
      if (needed.compressedSize && position + 8 <= dataStart + size) {
        result.compressedSize = Number(buffer.readBigUInt64LE(position));
        position += 8;
      }
      if (needed.localOffset && position + 8 <= dataStart + size) {
        result.localOffset = Number(buffer.readBigUInt64LE(position));
        position += 8;
      }
    }
    cursor = dataStart + size;
  }
  return result;
}
