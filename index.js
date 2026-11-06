/**
 * 21cmEVAL explorer: Host half.
 *
 * The Host serves a tiny read-only JSON API for the Explorer panel at
 * /eval21-api/. It reads the folder the user selected, or runs the bundled
 * remote.py over SSH when the selected source is a cluster. The panel is a
 * separate Client module; no evaluation code is executed here.
 */
import path from 'node:path';
import {
  expandHome,
  finalizeManifest,
  loadLocalRun,
  localDefaults,
  mimeFor,
  parseNpz,
  readLocalFile,
  scanLocal,
  PLUGIN_H5_METRICS,
} from './data.js';
import { sshH5Read, sshList, sshRead, sshScan, validateHost } from './ssh.js';

const API_PREFIX = '/eval21-api';
const MANIFEST_TTL = 15_000;
const RUN_TTL = 120_000;
const DEFAULT_TTL = 30_000;
const REMOTE_FILE_TTL = 120_000;
const REMOTE_FILE_BUDGET = 64 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf',
  '.md', '.csv', '.txt', '.json',
]);

const manifests = new Map();
const runs = new Map();
const remoteFiles = new Map();
let defaultsCache = null;

export const inject = ['webServer', 'connection'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function failure(error, status = 400) {
  const message = error instanceof Error ? error.message : String(error);
  return json({ error: message }, status);
}

function decodeSource(raw) {
  if (!raw) throw new Error('Missing source');
  let value;
  try {
    value = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed source');
  }
  if (!value || typeof value !== 'object') throw new Error('Malformed source');
  if (value.kind === 'local') {
    if (typeof value.root !== 'string' || !value.root.trim()) throw new Error('Missing local folder');
    const root = expandHome(value.root.trim());
    if (!path.isAbsolute(root)) throw new Error('The local folder must be an absolute path');
    return { kind: 'local', root: path.normalize(root) };
  }
  if (value.kind === 'ssh') {
    const host = validateHost(value.host);
    if (typeof value.root !== 'string' || !value.root.trim()) throw new Error('Missing remote folder');
    return { kind: 'ssh', host, root: value.root.trim() };
  }
  throw new Error('Unknown source kind');
}

function sourceKey(source) {
  return JSON.stringify(source);
}

function safeRelative(value) {
  if (typeof value !== 'string' || !value) throw new Error('Missing path');
  const normalized = path.posix.normalize(value);
  if (normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new Error('Path leaves the selected folder');
  }
  return normalized;
}

function runPathFromId(id) {
  const relative = safeRelative(id);
  const markup = relative.indexOf('::');
  return markup >= 0 ? relative.slice(0, markup) : relative;
}

function remember(map, key, value, ttl) {
  map.set(key, { value, at: Date.now(), ttl });
  if (map.size > 16) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  return value;
}

function recall(map, key) {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > entry.ttl) {
    map.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheRemoteFile(key, value) {
  let total = 0;
  for (const entry of remoteFiles.values()) total += entry.value.buffer.length;
  while (remoteFiles.size > 0 && total + value.buffer.length > REMOTE_FILE_BUDGET) {
    const oldest = remoteFiles.keys().next().value;
    if (oldest === undefined) break;
    total -= remoteFiles.get(oldest).value.buffer.length;
    remoteFiles.delete(oldest);
  }
  remoteFiles.set(key, { value, at: Date.now(), ttl: REMOTE_FILE_TTL });
  if (remoteFiles.size > 24) {
    const oldest = remoteFiles.keys().next().value;
    if (oldest !== undefined) remoteFiles.delete(oldest);
  }
}

function getRemoteFile(key) {
  const entry = remoteFiles.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > entry.ttl) {
    remoteFiles.delete(key);
    return undefined;
  }
  return entry.value;
}

async function readSourceFile(source, relativePath, asText, signal) {
  if (source.kind === 'local') return readLocalFile(source, relativePath, asText);
  const key = `${sourceKey(source)}::${relativePath}::${asText ? 'text' : 'bytes'}`;
  const cached = getRemoteFile(key);
  if (cached) return cached;
  const value = await sshRead(source, relativePath, asText, signal);
  if (!asText) cacheRemoteFile(key, value);
  return value;
}

async function buildManifest(source, signal) {
  const key = sourceKey(source);
  const cached = recall(manifests, key);
  if (cached) return cached;
  let raw;
  let result;
  if (source.kind === 'local') {
    raw = await scanLocal(source);
    result = finalizeManifest(raw, source);
  } else {
    raw = await sshScan(source, signal);
    result = finalizeManifest(raw, source);
  }
  return remember(manifests, key, result, MANIFEST_TTL);
}

async function loadRun(source, id, signal) {
  const relativePath = runPathFromId(id);
  const key = `${sourceKey(source)}::${relativePath}`;
  const cached = recall(runs, key);
  if (cached) return cached;
  const hdf5 = /\.(h5|hdf5)$/i.test(relativePath);
  const file = path.posix.join(relativePath, 'curves.npz');
  let arrays;
  if (source.kind === 'local') {
    arrays = await loadLocalRun(source, relativePath);
  } else if (hdf5) {
    const result = await sshH5Read(source, relativePath, PLUGIN_H5_METRICS, signal);
    arrays = result.arrays || {};
  } else {
    const result = await readSourceFile(source, file, false, signal);
    arrays = parseNpz(result.buffer);
  }
  const value = { id, arrays };
  return remember(runs, key, value, RUN_TTL);
}

function fileResponse(buffer, file, source) {
  const headers = {
    'content-type': mimeFor(file),
    'content-length': String(buffer.length),
    'cache-control': 'private, max-age=60',
    'x-content-type-options': 'nosniff',
  };
  if (path.extname(file).toLowerCase() === '.svg') {
    headers['content-security-policy'] = "script-src 'none'";
  }
  return new Response(buffer, { status: 200, headers });
}

async function handle(request, connection) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return failure('The explorer API only answers same-origin requests', 403);
  }
  let admission;
  try {
    admission = connection.admit(request);
  } catch {
    admission = { rejection: 401 };
  }
  if (admission && admission.rejection) {
    return failure('Authentication required', admission.rejection);
  }
  const url = new URL(request.url);
  if (!url.pathname.startsWith(API_PREFIX)) return failure('Unknown endpoint', 404);
  const action = url.pathname.slice(API_PREFIX.length).replace(/^\/+|\/+$/g, '') || 'defaults';
  const signal = request.signal;

  if (action === 'defaults') {
    if (!defaultsCache || Date.now() - defaultsCache.at > DEFAULT_TTL) {
      defaultsCache = { value: await localDefaults(), at: Date.now() };
    }
    return json(defaultsCache.value);
  }

  if (action === 'list') {
    try {
      const host = validateHost(url.searchParams.get('host') || '');
      const result = await sshList(host, url.searchParams.get('path') || '', signal);
      return json(result);
    } catch (error) {
      return failure(error);
    }
  }

  let source;
  try {
    source = decodeSource(url.searchParams.get('source'));
  } catch (error) {
    return failure(error);
  }

  if (action === 'scan') {
    try {
      const refresh = url.searchParams.get('refresh') === '1';
      if (refresh) {
        const key = sourceKey(source);
        manifests.delete(key);
        for (const cached of [...runs.keys()]) {
          if (cached.startsWith(`${key}::`)) runs.delete(cached);
        }
        for (const cached of [...remoteFiles.keys()]) {
          if (cached.startsWith(`${key}::`)) remoteFiles.delete(cached);
        }
      }
      return json(await buildManifest(source, signal));
    } catch (error) {
      return failure(error);
    }
  }

  if (action === 'run') {
    try {
      const id = url.searchParams.get('id') || '';
      return json(await loadRun(source, id, signal));
    } catch (error) {
      return failure(error);
    }
  }

  if (action === 'file') {
    try {
      const relativePath = safeRelative(url.searchParams.get('path') || '');
      const extension = path.posix.extname(relativePath).toLowerCase();
      if (!ALLOWED_FILE_EXTENSIONS.has(extension)) throw new Error('That file type is not served by the explorer');
      const result = await readSourceFile(source, relativePath, false, signal);
      return fileResponse(result.buffer, relativePath, source);
    } catch (error) {
      return failure(error);
    }
  }

  if (action === 'text') {
    try {
      const relativePath = safeRelative(url.searchParams.get('path') || '');
      const extension = path.posix.extname(relativePath).toLowerCase();
      if (!['.md', '.csv', '.txt', '.json'].includes(extension)) {
        throw new Error('That file type is not readable as text');
      }
      const result = await readSourceFile(source, relativePath, true, signal);
      return new Response(result.text, {
        status: 200,
        headers: {
          'content-type': mimeFor(relativePath),
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        },
      });
    } catch (error) {
      return failure(error);
    }
  }

  return failure('Unknown endpoint', 404);
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: API_PREFIX,
    resource: (request) => handle(request, ctx.connection),
  }), 'eval21: read-only data API');
}
