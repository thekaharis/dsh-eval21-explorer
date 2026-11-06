/**
 * SSH transport for the explorer. Every request runs the bundled, dependency
 * free remote.py through the user's normal ssh client: ssh config aliases,
 * agent forwarding, jump hosts, and known_hosts all keep working.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const REMOTE_SCRIPT = readFileSync(new URL('./remote.py', import.meta.url), 'utf8');
const REMOTE_SCRIPT_B64 = Buffer.from(REMOTE_SCRIPT, 'utf8').toString('base64');
const HOST_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:@[A-Za-z0-9][A-Za-z0-9._-]*)?$/;
const MAX_OUTPUT = 96 * 1024 * 1024;

export function validateHost(host) {
  if (typeof host !== 'string' || !HOST_PATTERN.test(host.trim())) {
    throw new Error('SSH host must be an ssh config alias, a hostname, or user@hostname');
  }
  return host.trim();
}

function sshCommand(python) {
  return `${python} -c "import base64;exec(base64.b64decode('${REMOTE_SCRIPT_B64}'))"`;
}

function runSsh(host, command, payload, signal, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', [
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=8',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=3',
      '-T',
      host,
      command,
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`SSH command timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    const abort = () => {
      child.kill('SIGKILL');
      finish(new Error('SSH request cancelled'));
    };
    if (signal) {
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener('abort', abort, { once: true });
    }
    child.on('error', (error) => {
      finish(new Error(`Could not start ssh: ${error.message}`));
    });
    child.stdout.on('data', (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT) {
        child.kill('SIGKILL');
        finish(new Error('SSH response exceeded the explorer size limit'));
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 64) stderr.push(chunk);
    });
    child.on('close', (code) => {
      if (signal) signal.removeEventListener('abort', abort);
      if (settled) return;
      const errorText = Buffer.concat(stderr).toString('utf8').trim();
      const outputText = Buffer.concat(stdout).toString('utf8');
      if (code !== 0) {
        finish(new Error(errorText || `ssh exited with code ${code}`));
        return;
      }
      try {
        finish(null, JSON.parse(outputText));
      } catch {
        finish(new Error(`Remote reader returned invalid JSON${errorText ? `: ${errorText}` : ''}`));
      }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}

export async function sshRequest(source, payload, signal, timeoutMs = 90000) {
  const host = validateHost(source.host);
  let result;
  try {
    result = await runSsh(host, sshCommand('python3'), payload, signal, timeoutMs);
  } catch (error) {
    // Some smaller clusters only expose `python`. Retry once when that is the
    // only reason the first attempt failed.
    const message = String(error?.message || error);
    if (!/python3[^\n]*(not found|No such file)|command not found/i.test(message)) throw error;
    result = await runSsh(host, sshCommand('python'), payload, signal, timeoutMs);
  }
  if (result && typeof result === 'object' && typeof result.error === 'string') {
    throw new Error(result.error);
  }
  return result;
}

export async function sshScan(source, signal) {
  return sshRequest(source, { op: 'scan', root: source.root }, signal, 120000);
}

export async function sshRead(source, relativePath, asText, signal) {
  const result = await sshRequest(source, {
    op: 'read',
    root: source.root,
    path: relativePath,
    text: asText,
  }, signal, 90000);
  if (asText) return { text: String(result.text || ''), size: Number(result.size) || 0 };
  return { buffer: Buffer.from(String(result.data || ''), 'base64'), size: Number(result.size) || 0 };
}

export async function sshH5Read(source, relativePath, metrics, signal) {
  return sshRequest(source, {
    op: 'read_h5',
    root: source.root,
    path: relativePath,
    metrics,
  }, signal, 90000);
}

export async function sshList(host, directory, signal) {
  return sshRequest({ host }, { op: 'list', path: directory }, signal, 45000);
}
