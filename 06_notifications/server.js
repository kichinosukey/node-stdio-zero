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

function notify(method, params) {
  write({ jsonrpc: "2.0", method, params });
}

let tickerRunning = false;

function handleSubscribe(id, params) {
  if (tickerRunning) {
    write(failure(id, -32000, "Ticker already running"));
    return;
  }

  const maxTicks = Number(params.maxTicks ?? 3);
  const intervalMs = Number(params.intervalMs ?? 250);

  if (!Number.isInteger(maxTicks) || maxTicks <= 0) {
    write(failure(id, -32602, "Invalid params", "maxTicks must be a positive integer"));
    return;
  }

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    write(failure(id, -32602, "Invalid params", "intervalMs must be a positive number"));
    return;
  }

  tickerRunning = true;
  let tick = 0;

  const timer = setInterval(() => {
    tick += 1;
    notify("tick", { tick, maxTicks });

    if (tick >= maxTicks) {
      clearInterval(timer);
      tickerRunning = false;
      write(success(id, { subscribed: true, maxTicks, intervalMs }));
    }
  }, intervalMs);
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

  if (method === "subscribe_ticks") {
    handleSubscribe(id, params);
    return;
  }

  if (method === "shutdown") {
    write(success(id, { bye: true }));
    setImmediate(() => process.exit(0));
    return;
  }

  write(failure(id, -32601, "Method not found", { method }));
});
