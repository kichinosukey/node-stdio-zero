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

function respondAdd(id, params) {
  const a = Number(params.a);
  const b = Number(params.b);
  const delayMs = Number(params.delayMs ?? 0);

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    write(failure(id, -32602, "Invalid params", "a and b must be numbers"));
    return;
  }

  const send = () => write(success(id, { sum: a + b, delayMs }));
  if (delayMs > 0) {
    setTimeout(send, delayMs);
  } else {
    send();
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) {
    return;
  }

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

  if (method === "ping") {
    write(success(id, { pong: true }));
    return;
  }

  if (method === "add") {
    respondAdd(id, params);
    return;
  }

  if (method === "shutdown") {
    write(success(id, { bye: true }));
    setImmediate(() => process.exit(0));
    return;
  }

  write(failure(id, -32601, "Method not found", { method }));
});
