# AI Interview Chatbot

AI 面接練習用の Web アプリプロトタイプです。OpenAI API を任意で使えます。アカウント、企業、ES、面接ログなどのアプリ内データは、現状ブラウザの `localStorage` に保存します。

## 起動方法

Node.js 18 以上が入っていれば、追加の依存インストールなしで起動できます。

```powershell
npm start
```

起動後、ブラウザで以下を開きます。

```text
http://localhost:8000/
```

別のポートで起動する場合:

```powershell
$env:PORT=8080
npm start
```

## チェック

JavaScript の構文確認:

```powershell
npm run check
```

## 実装済み

- アカウント、企業・ES管理、面接設定、面接チャット、最終フィードバック、履歴画面
- `localStorage` によるアカウント、企業、ES、面接ログ、選択中アカウントの保存
- OpenAI APIキー設定画面、接続テスト、ローカルサーバー経由のOpenAI呼び出し
- OpenAIを使った面接質問生成、回答評価、深掘り質問生成、最終フィードバック生成
- ES設問・回答・文字数・カテゴリ・ステータス管理
- 保存済み企業を起点に、その企業に紐づく全ESを使った面接開始
- 質問数設定、回答送信、深掘り質問、会話タイムライン、途中終了
- モック採点と最終フィードバック
- 履歴一覧、詳細表示、個別削除、全削除
- レスポンシブ CSS

## 未実装

- Google Sign-In、Firebase、クラウド同期
- PDF、Word、画像、履歴書などのファイル取込
- 本番向け認証、DB、APIキー保護、サーバー側処理
- 自動テスト

## OpenAI API設定

画面右上の `AI設定` から、使用者自身の OpenAI APIキーを入力します。`OpenAIを使う` を選び、接続テストが成功すると以下でAIを利用します。

- 面接質問生成
- 回答評価と深掘り質問生成
- 最終フィードバック生成

APIキーはローカルサーバーの `/api/openai` 経由でOpenAIへ送信されます。`APIキーをこのブラウザに保存する` を有効にした場合のみ `localStorage` に保存します。共有PCでは保存しない運用を推奨します。

## 設計資料

- GitHub Issues 起票案: [docs/github-issues.md](docs/github-issues.md)
- AI回答評価・正解データ設計: [docs/answer-evaluation-design.md](docs/answer-evaluation-design.md)
- 音声入力・一時録音設計: [docs/voice-input-design.md](docs/voice-input-design.md)
