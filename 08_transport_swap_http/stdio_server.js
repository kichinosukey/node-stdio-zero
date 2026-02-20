import readline from "node:readline";
import { handleRpcRequest, makeParseError } from "./logic.js";

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
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
    const detail = error instanceof Error ? error.message : String(error);
    write(makeParseError(detail));
    return;
  }

  const response = handleRpcRequest(request);
  write(response);

  if (request.method === "shutdown") {
    setImmediate(() => process.exit(0));
  }
});
