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
      process.stderr.write(`[server stderr] ${String(chunk)}`);
    });
  }

  onLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      process.stderr.write(`[client] invalid JSON from server: ${line}\n`);
      return;
    }

    if (!("id" in message) || message.id === null) {
      process.stdout.write(`[client] server-level error: ${line}\n`);
      return;
    }

    const entry = this.pending.get(message.id);
    if (!entry) {
      process.stdout.write(`[client] late/untracked response: ${line}\n`);
      return;
    }

    clearTimeout(entry.timer);
    this.pending.delete(message.id);

    if (message.error) {
      entry.reject(
        new Error(
          `[${message.error.code}] ${message.error.message}: ${JSON.stringify(
            message.error.data,
          )}`,
        ),
      );
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

  sendRaw(line) {
    this.child.stdin.write(`${line}\n`);
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

const baseDir = dirname(fileURLToPath(import.meta.url));
const serverPath = join(baseDir, "server.js");

const child = spawn(process.execPath, [serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
});

const rpc = new RpcClient(child);

rpc.sendRaw('{"id":999,"method":"broken"');

try {
  await rpc.call("unknown_method", {}, 1_000);
} catch (error) {
  process.stdout.write(`[client] unknown method error: ${String(error)}\n`);
}

try {
  await rpc.call("slow", { delayMs: 1_000 }, 300);
} catch (error) {
  process.stdout.write(`[client] timeout error: ${String(error)}\n`);
}

const fast = await rpc.call("fast", {}, 1_000);
process.stdout.write(`[client] fast result: ${JSON.stringify(fast)}\n`);

await rpc.call("shutdown");
rpc.close();
await rpc.waitForExit();
