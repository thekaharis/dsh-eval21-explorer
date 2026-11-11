/**
 * @-reference catalog for the explorer.
 *
 * The composer's @ menu is backed by ctx.fileReferences.  Only one provider can
 * own that service, so this module wraps the existing local provider and adds
 * absolute paths to generated reference files: one JSON summary per run,
 * dataset and group, plus the source figures.  Picking a candidate inserts an
 * ordinary @path; the agent's read/read_image tools then inspect the file.
 */
import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const MAX_CANDIDATES = 20;
const MAX_REMOTE_FIGURES_PER_QUERY = 3;
const MAX_FIGURE_BYTES = 32 * 1024 * 1024;
const CACHE_ROOT = process.env.DSH_EVAL21_REFERENCE_DIR
  || path.join(os.homedir(), '.dsh', 'eval21-explorer', 'references');

function slug(value, fallback = 'item') {
  const text = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .slice(0, 96);
  return text || fallback;
}

function shortHash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 10);
}

function sourceKey(source) {
  return JSON.stringify(source);
}

function sourceHash(source) {
  return shortHash(sourceKey(source));
}

function sourceBase(source) {
  const root = String(source.root || '');
  if (source.kind === 'local') {
    return /\.(h5|hdf5)$/i.test(root) ? path.dirname(root) : root;
  }
  return /\.(h5|hdf5)$/i.test(root) ? path.posix.dirname(root) : root;
}

function sourcePath(source, relative) {
  if (source.kind === 'local') return path.resolve(sourceBase(source), ...relative.split('/'));
  return path.posix.join(sourceBase(source), relative);
}

function normalizeQuery(value) {
  return String(value || '').trim().toLowerCase().replace(/^["']+|["']+$/g, '');
}

function subsequenceScore(text, query) {
  let cursor = 0;
  let gap = 0;
  for (const character of query) {
    const found = text.indexOf(character, cursor);
    if (found < 0) return -1;
    gap += found - cursor;
    cursor = found + 1;
  }
  return Math.max(0, 120 - gap);
}

function candidateScore(entry, query) {
  const text = entry.search;
  if (text === query) return 1200;
  const words = text.split(/[\s/._-]+/).filter(Boolean);
  if (words.includes(query)) return 1000;
  if (words.some((word) => word.startsWith(query))) return 900;
  if (text.startsWith(query)) return 860;
  if (text.includes(query)) return 700;
  const fuzzy = subsequenceScore(text, query);
  return fuzzy >= 0 ? 300 + fuzzy : -1;
}

function runFileName(run) {
  return `${slug(run.model, 'model')}.${slug(run.pass, 'target')}.${shortHash(run.id)}.json`;
}

function runRecord(manifest, run) {
  return {
    schema: 'eval21-reference/1',
    kind: 'run',
    source: manifest.source,
    dataset: { id: run.dataset, label: run.datasetLabel },
    group: run.group,
    model: { key: run.model, label: run.modelLabel || run.model },
    target: run.pass,
    nSamples: run.nSamples,
    stages: run.stages || [],
    metrics: run.metrics || {},
    sampleIds: run.sampleIds || [],
    format: run.format || 'legacy',
    sourcePath: sourcePath(manifest.source, run.path),
    info: run.info || {},
  };
}

export class ReferenceCatalog {
  constructor(options = {}) {
    this.root = options.root || CACHE_ROOT;
    this.log = typeof options.log === 'function' ? options.log : () => {};
    this.state = { dir: '', entries: [], source: null, readFigure: null };
    this.signature = null;
    this.queue = Promise.resolve();
  }

  /** Rebuild the catalog after a scan. Serialized so two scans cannot interleave. */
  update(manifest, source, readFigure) {
    const task = this.queue.then(() => this.rebuild(manifest, source, readFigure));
    this.queue = task.catch(() => {});
    return task;
  }

  clear() {
    this.signature = null;
    this.state = { dir: '', entries: [], source: null, readFigure: null };
  }

  async rebuild(manifest, source, readFigure) {
    if (!manifest || (!manifest.runs?.length && !manifest.figures?.length)) {
      this.clear();
      return;
    }
    const signature = JSON.stringify([
      sourceKey(source),
      manifest.scannedAt,
      manifest.counts?.runs,
      manifest.counts?.figures,
      (manifest.datasets || []).map((entry) => [entry.id, entry.runs]),
    ]);
    if (signature === this.signature) return;

    this.state = { dir: '', entries: [], source: null, readFigure: null };
    const dir = path.join(this.root, sourceHash(source));
    await fsp.rm(dir, { recursive: true, force: true });
    await fsp.mkdir(dir, { recursive: true });
    const entries = [];

    const writeJson = async (relativePath, value) => {
      const absolute = path.join(dir, ...relativePath.split('/'));
      await fsp.mkdir(path.dirname(absolute), { recursive: true });
      await fsp.writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
      return absolute;
    };

    const runs = manifest.runs || [];
    const datasets = Array.isArray(manifest.datasets) && manifest.datasets.length
      ? manifest.datasets
      : [...new Set(runs.map((run) => run.dataset || 'data'))].map((id) => ({
        id,
        label: runs.find((run) => (run.dataset || 'data') === id)?.datasetLabel || id,
        runs: runs.filter((run) => (run.dataset || 'data') === id).length,
      }));

    for (const dataset of datasets) {
      const datasetRuns = runs.filter((run) => (run.dataset || 'data') === dataset.id);
      if (!datasetRuns.length) continue;
      const datasetSlug = slug(dataset.id, 'dataset');
      const datasetDir = `data/${datasetSlug}`;
      const models = [...new Map(datasetRuns.map((run) => [run.model, run.modelLabel || run.model])).entries()]
        .map(([key, label]) => ({ key, label }));
      const groups = [...new Set(datasetRuns.map((run) => run.group).filter(Boolean))].sort();
      const passes = [...new Set(datasetRuns.map((run) => run.pass).filter(Boolean))].sort();
      const datasetAbsolute = await writeJson(`${datasetDir}/_dataset.json`, {
        schema: 'eval21-reference/1',
        kind: 'dataset',
        source: manifest.source,
        dataset: { id: dataset.id, label: dataset.label },
        counts: { runs: datasetRuns.length, models: models.length, groups: groups.length },
        models,
        groups,
        passes,
      });
      entries.push({
        path: datasetAbsolute,
        priority: 1,
        search: `dataset ${dataset.id} ${dataset.label} ${models.map((model) => `${model.key} ${model.label}`).join(' ')}`.toLowerCase(),
      });

      for (const group of groups) {
        const groupRuns = datasetRuns.filter((run) => run.group === group);
        if (!groupRuns.length) continue;
        const groupSlug = slug(group, 'group');
        const groupAbsolute = await writeJson(`${datasetDir}/${groupSlug}/_group.json`, {
          schema: 'eval21-reference/1',
          kind: 'group',
          source: manifest.source,
          dataset: { id: dataset.id, label: dataset.label },
          group,
          counts: { runs: groupRuns.length },
          runs: groupRuns.map((run) => ({
            id: run.id,
            model: run.model,
            modelLabel: run.modelLabel || run.model,
            target: run.pass,
            nSamples: run.nSamples,
            metrics: run.metrics || {},
          })),
        });
        entries.push({
          path: groupAbsolute,
          priority: 1,
          search: `group ${group} dataset ${dataset.label} ${dataset.id} ${groupRuns.map((run) => `${run.model} ${run.modelLabel || ''}`).join(' ')}`.toLowerCase(),
        });

        for (const run of groupRuns) {
          const absolute = await writeJson(`${datasetDir}/${groupSlug}/${runFileName(run)}`, runRecord(manifest, run));
          entries.push({
            path: absolute,
            priority: 2,
            search: `run data ${dataset.label} ${dataset.id} ${group} ${run.model} ${run.modelLabel || ''} ${run.pass} ${run.id}`.toLowerCase(),
          });
        }
      }
    }

    for (const figure of manifest.figures || []) {
      const relative = String(figure.path || '');
      if (!relative) continue;
      const search = `figure image ${figure.name || ''} ${figure.dir || ''} ${relative}`.toLowerCase();
      if (source.kind === 'local') {
        entries.push({ path: sourcePath(source, relative), priority: 2, search });
      } else {
        const absolute = path.join(dir, 'figures', ...relative.split('/').filter(Boolean));
        entries.push({
          path: absolute,
          priority: 2,
          search,
          remoteFigure: figure,
          ready: false,
          failed: false,
        });
      }
    }

    this.state = { dir, entries, source, readFigure };
    this.signature = signature;
  }

  async ensureFigure(entry, signal) {
    if (entry.ready) return true;
    if (entry.failed) return false;
    if ((Number(entry.remoteFigure.size) || 0) > MAX_FIGURE_BYTES) {
      entry.failed = true;
      return false;
    }
    if (!this.state.readFigure) {
      entry.failed = true;
      return false;
    }
    const result = await this.state.readFigure(entry.remoteFigure.path, signal);
    if (!result || !result.buffer) throw new Error('Figure read returned no data');
    await fsp.mkdir(path.dirname(entry.path), { recursive: true });
    await fsp.writeFile(entry.path, result.buffer);
    entry.ready = true;
    return true;
  }

  async list(rawQuery, signal) {
    const query = normalizeQuery(rawQuery);
    if (!query || !this.state.entries.length) return [];
    const ranked = [];
    for (const entry of this.state.entries) {
      if (entry.remoteFigure && entry.failed) continue;
      const score = candidateScore(entry, query);
      if (score >= 0) ranked.push({ entry, score });
    }
    ranked.sort((left, right) => right.score - left.score || (right.entry.priority || 0) - (left.entry.priority || 0) || left.entry.path.length - right.entry.path.length
      || left.entry.path.localeCompare(right.entry.path));
    const candidates = [];
    let remoteFetches = 0;
    for (const { entry } of ranked) {
      signal?.throwIfAborted?.();
      if (entry.remoteFigure && !entry.ready) {
        if (remoteFetches >= MAX_REMOTE_FIGURES_PER_QUERY) continue;
        remoteFetches += 1;
        try {
          if (!(await this.ensureFigure(entry, signal))) continue;
        } catch (error) {
          if (signal?.aborted) throw error;
          this.log(`eval21 references: could not cache ${entry.remoteFigure.path}: ${error.message}`);
          entry.failed = true;
          continue;
        }
      }
      candidates.push({ path: entry.path, kind: 'file' });
      if (candidates.length >= MAX_CANDIDATES) break;
    }
    return candidates;
  }
}

/**
 * Merge this catalog into the one existing file-reference provider.  The
 * shipped provider remains responsible for ordinary workspace @file rows; the
 * catalog contributes candidates only for a non-empty query.
 */
export function attachFileReferences(ctx, catalog) {
  ctx.inject(['fileReferences'], (scope) => {
    const service = scope.fileReferences;
    if (!service || typeof service.list !== 'function') return;
    const original = service.list;
    const patched = async function list(agent, query, signal) {
      let local = [];
      try {
        local = await original.call(service, agent, query, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        catalog.log(`eval21 references: local provider failed: ${error.message}`);
      }
      let extra = [];
      try {
        extra = await catalog.list(query, signal);
      } catch (error) {
        if (signal?.aborted) throw error;
        catalog.log(`eval21 references: catalog lookup failed: ${error.message}`);
      }
      if (!extra.length) return local;
      const seen = new Set();
      const merged = [];
      for (const candidate of [...extra, ...local]) {
        if (!candidate || typeof candidate.path !== 'string' || seen.has(candidate.path)) continue;
        seen.add(candidate.path);
        merged.push(candidate);
        if (merged.length >= MAX_CANDIDATES) break;
      }
      return merged;
    };
    patched.__eval21ReferenceSource = true;
    let assigned = false;
    try {
      service.list = patched;
      assigned = service.list === patched;
    } catch {
      // Some service wrappers expose non-writable properties; fall through.
    }
    if (!assigned) {
      try {
        Object.defineProperty(service, 'list', { value: patched, configurable: true, writable: true });
        assigned = service.list === patched;
      } catch (error) {
        catalog.log(`eval21 references: could not attach @ source: ${error.message}`);
        return;
      }
    }
    scope.effect(() => () => {
      if (service.list !== patched) return;
      try {
        service.list = original;
      } catch {
        try { delete service.list; } catch { /* keep the old patch if the wrapper forbids both */ }
      }
    }, 'eval21: @ reference candidates');
  });
}
