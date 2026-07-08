# AI Interview Chatbot

面接練習用のWebアプリケーションプロトタイプです。現在は外部AI APIやGoogle連携を使わず、ブラウザ内のJavaScriptと`localStorage`で動作します。

## 起動方法

Node.js 18以上が入っていれば、追加のインストールなしで起動できます。

```powershell
npm start
```

起動後、ブラウザで以下を開きます。

```text
http://localhost:8000/
```

別のポートで起動したい場合:

```powershell
$env:PORT=8080
npm start
```

## チェック

JavaScriptの構文確認:

```powershell
npm run check
```

## 現在の仕様

- 画面、面接ロジック、評価ロジックは`ai-interview-prototype`配下にあります。
- 面接履歴やアカウント情報はブラウザの`localStorage`に保存されます。
- Google連携は未実装です。
- AI API連携は未実装で、現在はモックロジックです。
- 音声入力はWeb Speech API対応ブラウザでのみ利用できます。

## 今後Webアプリとして強化する場合

次の段階では、バックエンド、データベース、認証、AI API接続を追加できます。

- Expressなどのバックエンドを追加する
- SQLiteやPostgreSQLに履歴を保存する
- Googleログインを実装する
- OpenAI APIなどをサーバー側から呼び出す
- Vercel、Render、Fly.ioなどにデプロイする
