import http from "node:http";
import { handleRpcRequest, makeParseError } from "./logic.js";

const desiredPort = Number(process.env.PORT ?? 0);

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/rpc") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  let body = "";

  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    let request;
    try {
      request = JSON.parse(body);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify(makeParseError(detail)));
      return;
    }

    const response = handleRpcRequest(request);

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(response));

    if (request.method === "shutdown") {
      setTimeout(() => {
        server.close();
      }, 10);
    }
  });
});

server.on("error", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[http] server error: ${message}\n`);
  process.exit(1);
});

server.listen(desiredPort, "127.0.0.1", () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : desiredPort;
  process.stderr.write(`[http] listening on http://127.0.0.1:${actualPort}\n`);
});
