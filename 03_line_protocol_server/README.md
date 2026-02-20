# 03 Line Protocol Server

1行1JSON(NDJSON)で複数リクエストを処理する常駐サーバーです。

## 実行
```bash
printf '%s\n' \
'{"id":1,"method":"ping"}' \
'{"id":2,"method":"add","params":{"a":2,"b":5}}' \
'{"id":3,"method":"shutdown"}' \
| node 03_line_protocol_server/server.js
```

## 何を確認するか
- 1プロセスで複数要求を扱える
- 1行区切りでメッセージ境界を作る
