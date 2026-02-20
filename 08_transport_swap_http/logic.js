export function makeSuccess(id, result) {
  return { jsonrpc: "2.0", id, result };
}

export function makeError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return { jsonrpc: "2.0", id, error };
}

export function makeParseError(detail) {
  return makeError(null, -32700, "Parse error", { detail });
}

export function handleRpcRequest(request) {
  if (typeof request !== "object" || request === null) {
    return makeError(null, -32600, "Invalid Request", "request must be an object");
  }

  const id = "id" in request ? request.id : null;
  const method = request.method;
  const params = request.params ?? {};

  if (typeof method !== "string") {
    return makeError(id, -32600, "Invalid Request", "method must be a string");
  }

  if (method === "ping") {
    return makeSuccess(id, { pong: true, transportIndependent: true });
  }

  if (method === "add") {
    const a = Number(params.a);
    const b = Number(params.b);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return makeError(id, -32602, "Invalid params", "a and b must be numbers");
    }

    return makeSuccess(id, { sum: a + b, transportIndependent: true });
  }

  if (method === "now") {
    return makeSuccess(id, { iso: new Date().toISOString() });
  }

  if (method === "shutdown") {
    return makeSuccess(id, { shuttingDown: true });
  }

  return makeError(id, -32601, "Method not found", { method });
}
