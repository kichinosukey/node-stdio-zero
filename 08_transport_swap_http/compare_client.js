import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import readline from "node:readline";

class RpcClient {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();

    this.rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    this.rl.on("line", (line) => this.onLine(line));
    this.child.stderr.on("data", (chunk) => {
      process.stderr.write(`[stdio server stderr] ${String(chunk)}`);
    });
  }

  onLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      process.stderr.write(`[stdio client] invalid JSON: ${line}\n`);
      return;
    }

    const entry = this.pending.get(message.id);
    if (!entry) {
      process.stdout.write(`[stdio client] untracked: ${line}\n`);
      return;
    }

    clearTimeout(entry.timer);
    this.pending.delete(message.id);

    if (message.error) {
      entry.reject(new Error(`[${message.error.code}] ${message.error.message}`));
      return;
    }

    entry.resolve(message.result);
  }

  call(method, params = {}, timeoutMs = 2_000) {
    const id = this.nextId;
    this.nextId += 1;
    const request = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for id=${id}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  close() {
    this.child.stdin.end();
  }

  waitForExit() {
    return new Promise((resolve, reject) => {
      this.child.on("exit", (code) => {
        if (code === 0) {
          resolve(undefined);
          return;
        }

        reject(new Error(`Server exited with code ${code}`));
      });
      this.child.on("error", reject);
    });
  }
}

function waitForHttpReady(child, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: child.stderr,
      crlfDelay: Infinity,
    });
    let settled = false;

    const cleanup = () => {
      rl.close();
      child.removeListener("exit", onExit);
      child.removeListener("error", onProcessError);
    };

    const succeed = (port) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(port);
    };

    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(error);
    };

    const onExit = (code) => {
      fail(new Error(`HTTP server exited before ready (code=${code})`));
    };

    const onProcessError = (error) => {
      fail(error);
    };

    const timer = setTimeout(() => {
      fail(new Error("HTTP server did not start in time"));
    }, timeoutMs);

    child.on("exit", onExit);
    child.on("error", onProcessError);

    rl.on("line", (line) => {
      process.stderr.write(`[http server stderr] ${line}\n`);
      if (line.includes("[http] server error:")) {
        fail(new Error(`HTTP server start failed: ${line}`));
        return;
      }

      const match = line.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (!match) {
        return;
      }

      succeed(Number(match[1]));
    });

    rl.on("error", (error) => {
      fail(error);
    });
  });
}

function waitForExit(child, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Child process exit timeout"));
    }, timeoutMs);

    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Child process exited with code ${code}`));
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function rpcOverHttp(port, request) {
  const response = await fetch(`http://127.0.0.1:${port}/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  return response.json();
}

const baseDir = dirname(fileURLToPath(import.meta.url));
const stdioServerPath = join(baseDir, "stdio_server.js");
const httpServerPath = join(baseDir, "http_server.js");

const stdioChild = spawn(process.execPath, [stdioServerPath], {
  stdio: ["pipe", "pipe", "pipe"],
});
const stdioClient = new RpcClient(stdioChild);

const stdioAdd = await stdioClient.call("add", { a: 4, b: 8 });
await stdioClient.call("shutdown");
stdioClient.close();
await stdioClient.waitForExit();

let httpAddResult = null;
let httpNote = null;

const httpChild = spawn(process.execPath, [httpServerPath], {
  stdio: ["ignore", "ignore", "pipe"],
  env: { ...process.env, PORT: "0" },
});

try {
  const port = await waitForHttpReady(httpChild);
  const httpAdd = await rpcOverHttp(port, {
    jsonrpc: "2.0",
    id: 1,
    method: "add",
    params: { a: 4, b: 8 },
  });
  httpAddResult = httpAdd.result;

  await rpcOverHttp(port, {
    jsonrpc: "2.0",
    id: 2,
    method: "shutdown",
    params: {},
  });

  await waitForExit(httpChild);
} catch (error) {
  httpNote =
    error instanceof Error
      ? error.message
      : "HTTP transport test failed for an unknown reason";

  if (httpChild.exitCode === null) {
    httpChild.kill("SIGTERM");
    await waitForExit(httpChild).catch(() => {});
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      stdio: stdioAdd,
      http: httpAddResult,
      same: httpAddResult ? JSON.stringify(stdioAdd) === JSON.stringify(httpAddResult) : null,
      note: httpNote,
    },
    null,
    2,
  )}\n`,
);
