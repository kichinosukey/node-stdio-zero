# 02 One Shot Server

1回だけJSONリクエストを受け、1回だけJSONレスポンスを返します。

## 実行例
```bash
echo '{"id":1,"method":"ping"}' | node learning/node-stdio-zero/02_one_shot_server/server.js
```

```bash
echo '{"id":2,"method":"add","params":{"a":3,"b":5}}' | node learning/node-stdio-zero/02_one_shot_server/server.js
```

## 何を確認するか
- JSON-RPC風の `id/method/params` 構造
- 失敗時もJSONで返す設計
