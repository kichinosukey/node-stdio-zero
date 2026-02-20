process.stdin.setEncoding("utf8");

let rawInput = "";

process.stdin.on("data", (chunk) => {
  rawInput += chunk;
});

process.stdin.on("end", () => {
  const text = rawInput.trimEnd();
  const response = {
    type: "pipe-basics",
    received: text,
    upper: text.toUpperCase(),
    bytes: Buffer.byteLength(rawInput, "utf8"),
  };

  process.stdout.write(`${JSON.stringify(response)}\n`);
});

if (process.stdin.isTTY) {
  process.stderr.write(
    "stdin が接続されていません。例: echo 'hello' | node main.js\n",
  );
}
