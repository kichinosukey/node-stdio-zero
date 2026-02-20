import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RpcClient } from "./rpc_client.js";

const baseDir = dirname(fileURLToPath(import.meta.url));
const serverPath = join(baseDir, "server.js");

const child = spawn(process.execPath, [serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
});

const rpc = new RpcClient(child);

const jobs = [
  rpc.call("add", { a: 1, b: 2, delayMs: 800 }),
  rpc.call("add", { a: 10, b: 20, delayMs: 100 }),
  rpc.call("ping"),
];

const results = await Promise.all(jobs);
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);

await rpc.call("shutdown");
rpc.close();
await rpc.waitForExit();
