import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import readline from "node:readline";

class RpcClient {
  constructor(child, onNotification) {
    this.child = child;
    this.onNotification = onNotification;
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

    if (!("id" in message)) {
      this.onNotification(message);
      return;
    }

    const entry = this.pending.get(message.id);
    if (!entry) {
      process.stdout.write(`[client] untracked response: ${line}\n`);
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

const notifications = [];
const rpc = new RpcClient(child, (message) => {
  notifications.push(message);
  process.stdout.write(`[notification] ${JSON.stringify(message)}\n`);
});

const result = await rpc.call("subscribe_ticks", { maxTicks: 3, intervalMs: 200 }, 5_000);
process.stdout.write(`[client] subscribe result: ${JSON.stringify(result)}\n`);
process.stdout.write(`[client] notification count: ${notifications.length}\n`);

await rpc.call("shutdown");
rpc.close();
await rpc.waitForExit();
