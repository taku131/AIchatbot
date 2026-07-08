# AI Interview Chatbot

AI 面接練習用の Web アプリプロトタイプです。現状は外部 AI API や Google 連携を使わず、ブラウザ内の JavaScript と `localStorage` で動作します。

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
- ES設問・回答・文字数・カテゴリ・ステータス管理
- 保存済み ES を起点にした面接開始
- 質問数設定、回答送信、深掘り質問、会話タイムライン、途中終了
- モック採点と最終フィードバック
- 履歴一覧、詳細表示、個別削除、全削除
- レスポンシブ CSS

## 未実装

- Gemini/OpenAI などの実 AI API 連携
- Google Sign-In、Firebase、クラウド同期
- ES の本格 AI 分析
- PDF、Word、画像、履歴書などのファイル取込
- 本番向け認証、DB、APIキー保護、サーバー側処理
- 自動テスト

## Backlog

GitHub Issues 用の起票案は [docs/github-issues.md](docs/github-issues.md) にまとめています。
