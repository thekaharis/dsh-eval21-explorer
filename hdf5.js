/**
 * Local HDF5 transport.  The Host runs the bundled hdf5_reader.py with the
 * system Python; h5py is already an eval21 dependency and no HDF5 code needs to
 * live in the browser or in Node.
 */
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const READER = fileURLToPath(new URL('./hdf5_reader.py', import.meta.url));
const MAX_OUTPUT = 128 * 1024 * 1024;
let pythonPromise = null;

export const PLUGIN_H5_METRICS = ['voxel', 'spectrum', 'history', 'observable', 'bubble', 'morphology', 'front'];

function probePython(python) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };
    let child;
    try {
      child = spawn(python, ['-c', 'import h5py'], { stdio: ['ignore', 'ignore', 'ignore'] });
    } catch {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(false);
    }, 5000);
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
  });
}

async function pythonCandidates() {
  const candidates = [];
  const add = (value) => {
    if (typeof value === 'string' && value.trim() && !candidates.includes(value.trim())) candidates.push(value.trim());
  };
  add(process.env.DSH_EVAL21_PYTHON);
  add(process.env.VIRTUAL_ENV ? `${process.env.VIRTUAL_ENV}/bin/python3` : null);
  add(process.env.CONDA_PREFIX ? `${process.env.CONDA_PREFIX}/bin/python3` : null);
  add('python3');
  add('python');
  for (const candidate of [
    '/usr/local/bin/python3',
    '/opt/homebrew/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/Current/bin/python3',
    '/usr/bin/python3',
  ]) add(candidate);
  try {
    const versions = await readdir('/Library/Frameworks/Python.framework/Versions');
    for (const version of versions.sort().reverse()) {
      add(`/Library/Frameworks/Python.framework/Versions/${version}/bin/python3`);
    }
  } catch {
    // Framework Python is not installed; other candidates remain.
  }
  return candidates;
}

async function pickPython(signal) {
  if (!pythonPromise) {
    pythonPromise = (async () => {
      for (const candidate of await pythonCandidates()) {
        if (signal?.aborted) throw new Error('HDF5 request cancelled');
        if (await probePython(candidate)) return candidate;
      }
      throw new Error('No Python with h5py found. Set DSH_EVAL21_PYTHON to the interpreter used by 21cmEVAL.');
    })();
    pythonPromise.catch(() => { pythonPromise = null; });
  }
  return pythonPromise;
}

async function runPython(request, signal, timeoutMs = 60000) {
  const python = await pickPython(signal);
  return new Promise((resolve, reject) => {
    const child = spawn(python, [READER], { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`HDF5 reader timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    const abort = () => {
      child.kill('SIGKILL');
      finish(new Error('HDF5 request cancelled'));
    };
    if (signal) {
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener('abort', abort, { once: true });
    }
    child.on('error', (error) => {
      finish(new Error(`Could not start Python for HDF5 reading: ${error.message}`));
    });
    child.stdout.on('data', (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT) {
        child.kill('SIGKILL');
        finish(new Error('HDF5 response exceeded the explorer size limit'));
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 32) stderr.push(chunk);
    });
    child.on('close', (code) => {
      if (settled) return;
      const errorText = Buffer.concat(stderr).toString('utf8').trim();
      const output = Buffer.concat(stdout).toString('utf8');
      if (code !== 0) {
        finish(new Error(errorText || `HDF5 reader exited with code ${code}`));
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(output);
      } catch {
        finish(new Error(`HDF5 reader returned invalid JSON${errorText ? `: ${errorText}` : ''}`));
        return;
      }
      if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
        finish(new Error(parsed.error));
        return;
      }
      finish(null, parsed);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(request));
  });
}

export async function hdf5Scan(root, paths, signal) {
  return runPython({ op: 'scan', root, paths }, signal, 120000);
}

export async function hdf5Read(file, metrics, signal) {
  return runPython({ op: 'read', path: file, metrics: metrics || PLUGIN_H5_METRICS }, signal, 60000);
}
