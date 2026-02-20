# Node stdio サーバー写経コース

`stdin/stdout` を使ったサーバーの理解を、8ステップで手を動かして学ぶコースです。

## 前提
- Node.js 20+
- 実行場所: `/Users/kichinosukey-mba/node-stdio-zero`

## 進め方
1. `01_pipe_basics`: まずはパイプで値を受けて返す。
2. `02_one_shot_server`: 1リクエストだけ処理するJSONサーバー。
3. `03_line_protocol_server`: 1行1JSONで常駐サーバー化。
4. `04_spawn_client`: クライアント側がサーバープロセスを起動する。
5. `05_request_id_and_promise`: `id`でレスポンス対応づけ。
6. `06_notifications`: サーバーから通知を送る。
7. `07_error_timeout`: エラー処理とタイムアウト。
8. `08_transport_swap_http`: 同じロジックを`stdio`と`HTTP`で動かす。

## 実行例
```bash
node 01_pipe_basics/main.js
```

各ステップの詳細はそれぞれの `README.md` を参照してください。

## 完走チェック
- `stdoutだけ` でなく、`stdin(受信) + stdout(送信)` であることを説明できる。
- `id` で並列レスポンスを対応づけられる。
- 同じ業務ロジックを `stdio` / `HTTP` で差し替えできる。
