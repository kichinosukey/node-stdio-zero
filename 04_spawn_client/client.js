import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import readline from "node:readline";

const baseDir = dirname(fileURLToPath(import.meta.url));
const serverPath = join(baseDir, "server.js");

const child = spawn(process.execPath, [serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
});

const rl = readline.createInterface({
  input: child.stdout,
  crlfDelay: Infinity,
});

const responses = [];

rl.on("line", (line) => {
  const message = JSON.parse(line);
  responses.push(message);
  process.stdout.write(`[client] <= ${line}\n`);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(`[server stderr] ${String(chunk)}`);
});

function send(message) {
  const line = JSON.stringify(message);
  process.stdout.write(`[client] => ${line}\n`);
  child.stdin.write(`${line}\n`);
}

send({ id: 1, method: "ping" });
send({ id: 2, method: "mul", params: { a: 6, b: 7 } });
send({ id: 3, method: "shutdown" });
child.stdin.end();

await new Promise((resolve, reject) => {
  child.on("exit", (code) => {
    if (code === 0) {
      resolve(undefined);
      return;
    }

    reject(new Error(`Server exited with code ${code}`));
  });
  child.on("error", reject);
});

process.stdout.write(`[client] responses received: ${responses.length}\n`);
