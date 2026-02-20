import readline from "node:readline";

export class RpcClient {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();

    this.rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    this.rl.on("line", (line) => this.onLine(line));
    this.child.on("exit", () => {
      for (const entry of this.pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error("Server exited before response"));
      }
      this.pending.clear();
    });

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
      process.stdout.write(`[client] notification: ${line}\n`);
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
    const raw = JSON.stringify(request);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout waiting for id=${id}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${raw}\n`);
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
