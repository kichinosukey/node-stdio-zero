# 04 Spawn Client

クライアントがサーバーを `spawn` で起動し、`stdin/stdout` で通信します。

## 実行
```bash
node 04_spawn_client/client.js
```

## 何を確認するか
- サーバーは待受ポート不要で起動できる
- 親プロセス(クライアント)が子プロセス(サーバー)を管理できる
