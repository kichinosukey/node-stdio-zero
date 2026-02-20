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

function handleRequest(rawInput) {
  let request;
  try {
    request = JSON.parse(rawInput);
  } catch (error) {
    return failure(null, -32700, "Parse error", {
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  if (typeof request !== "object" || request === null) {
    return failure(null, -32600, "Invalid Request");
  }

  const id = "id" in request ? request.id : null;
  const method = request.method;
  const params = request.params ?? {};

  if (typeof method !== "string") {
    return failure(id, -32600, "Invalid Request", "method must be a string");
  }

  if (method === "ping") {
    return success(id, { pong: true });
  }

  if (method === "add") {
    const a = Number(params.a);
    const b = Number(params.b);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return failure(id, -32602, "Invalid params", "a and b must be numbers");
    }

    return success(id, { sum: a + b });
  }

  return failure(id, -32601, "Method not found", { method });
}

process.stdin.setEncoding("utf8");

let rawInput = "";

process.stdin.on("data", (chunk) => {
  rawInput += chunk;
});

process.stdin.on("end", () => {
  const response = handleRequest(rawInput.trim());
  process.stdout.write(`${JSON.stringify(response)}\n`);
});
