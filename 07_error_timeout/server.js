import readline from "node:readline";

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function success(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function failure(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return { jsonrpc: "2.0", id, error };
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }

  process.stderr.write(`[server] received: ${line}\n`);

  let request;
  try {
    request = JSON.parse(line);
  } catch (error) {
    write(
      failure(null, -32700, "Parse error", {
        detail: error instanceof Error ? error.message : String(error),
      }),
    );
    return;
  }

  const id = "id" in request ? request.id : null;
  const method = request.method;
  const params = request.params ?? {};

  if (method === "fast") {
    write(success(id, { ok: true, mode: "fast" }));
    return;
  }

  if (method === "slow") {
    const delayMs = Number(params.delayMs ?? 1000);
    setTimeout(() => {
      write(success(id, { ok: true, mode: "slow", delayMs }));
    }, delayMs);
    return;
  }

  if (method === "shutdown") {
    write(success(id, { bye: true }));
    setImmediate(() => process.exit(0));
    return;
  }

  write(failure(id, -32601, "Method not found", { method }));
});
