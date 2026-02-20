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

function handleRequest(request) {
  const id = "id" in request ? request.id : null;
  const method = request.method;
  const params = request.params ?? {};

  if (method === "ping") {
    return success(id, { pong: true });
  }

  if (method === "mul") {
    const a = Number(params.a);
    const b = Number(params.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return failure(id, -32602, "Invalid params", "a and b must be numbers");
    }

    return success(id, { product: a * b });
  }

  if (method === "shutdown") {
    return success(id, { bye: true });
  }

  return failure(id, -32601, "Method not found", { method });
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

  const response = handleRequest(request);
  write(response);

  if (request.method === "shutdown") {
    setImmediate(() => process.exit(0));
  }
});
