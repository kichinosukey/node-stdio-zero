# 05 Request ID And Promise

`id` と `Promise` でレスポンスを呼び出し元に対応づけます。

## 実行
```bash
node 05_request_id_and_promise/client.js
```

## 何を確認するか
- レスポンスが順不同でも問題なく対応づけできる
- `id -> pending Promise` の管理が基本パターン
