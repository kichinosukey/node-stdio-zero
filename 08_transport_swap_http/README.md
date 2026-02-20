# 08 Transport Swap HTTP

同じ業務ロジックを `stdio` と `HTTP` の両方で使う例です。

## 実行
```bash
node 08_transport_swap_http/compare_client.js
```

HTTPの`listen`が禁止された環境では、`note` に理由を出して `stdio` 側だけ確認します。

## 何を確認するか
- 本質は `handleRpcRequest` のような共通ロジック
- `stdio` と `HTTP` は輸送(transport)差し替えに過ぎない
