# 本番公開の方針（アーキテクチャ・セキュリティ・デプロイ手順）

GitHub Issue #7に対応するドキュメントです。現状はローカルの`server.mjs`とlocalStorage/任意のFirestoreで動くプロトタイプですが、これを実際に公開する場合の方針をまとめます。

## 1. 想定アーキテクチャ

```text
ブラウザ（静的HTML/CSS/JS、ai-interview-prototype/配下）
   │  HTTPS
   ▼
Cloud Run（server.mjsをコンテナ化して実行）
   │  ├─ 静的ファイル配信（index.html, script.js 等）
   │  └─ POST /api/openai → https://api.openai.com/v1/responses への中継
   ▼
Firebase（任意・未設定なら全機能がlocalStorageのみで動く）
   ├─ Authentication（Googleログイン）
   └─ Firestore（ユーザーごとのアプリデータ）
```

- ホスティング先: **Google Cloud Run**。`server.mjs`はNode標準の`http`モジュールのみで書かれており、`process.env.PORT`にも既に対応しているため、コード変更なしでコンテナ化できます。
- DB: 現状の設計をそのまま踏襲します。Firebase未設定ならlocalStorageのみ、設定すればFirestore（ユーザーごとに分離）。本番でも新しいDBを追加する必要はありません。
- 認証: 現状のFirebase Authentication（Googleログイン）をそのまま使います。アプリ自体のログイン必須化（未ログインでは使えない、のような制御）は行いません（既存方針: 未ログインでもlocalStorageで利用可能、というプロトタイプの性質を維持）。

## 2. OpenAI APIキーの扱い（完了条件2への回答）

`server.mjs`の`/api/openai`は、**アプリ側が保持する共有キーを隠すプロキシ**ではありません。ユーザーが「AI設定」画面で入力した**自分自身のOpenAI APIキー**をリクエストボディに含めて送り、サーバーはそれをそのまま`Authorization: Bearer <key>`としてOpenAIへ転送するだけの中継です（`server.mjs`内`handleOpenAiProxy`参照）。

**注意**: 「APIキーが露出しない」というのは、正確には「運営者が持つ共有キーをブラウザに配布しない」という意味です。ユーザー自身のAPIキーは、依然としてブラウザ（`localStorage`/`sessionStorage`、`script.js`の`saveAiSettings`関連処理）とこのサーバーを経由してOpenAIへ送られます。運営者が管理する秘密の共有キーが漏れる経路が無い、という点が本番でも成立する根拠であり、ユーザー自身のキーが本人の端末とこのサーバーの間を通過すること自体は変わりません。

この設計は本番でも成立すると判断した理由:

- ブラウザから直接`https://api.openai.com`を叩かない（CORS回避、リクエスト形式の統一のための最小限の中継）という当初の目的は満たしている。
- 各ユーザーが自分のキーを使う（BYOK: Bring Your Own Key）ため、運営者側の共有キーが存在せず、それが漏洩する経路も無い。運営者がOpenAI利用料を肩代わりする設計にもなっていない。
- サーバー側のコードは`apiKey`を`console.log`等に出力していないことを確認済み（サーバーのログに誤って残る経路はない）。
- 通信はCloud Runが自動発行するHTTPSエンドポイント経由になるため、経路上の盗聴リスクは低い（下記参照）。

ただし、本番公開にあたって以下を追加で対応しました。

- **レート制限の追加**（`server.mjs`、今回のIssue対応で実装）: `/api/openai`には認証が無いため、URLが知られると誰でも（自分のOpenAIキーを使って）このサーバーを中継先として使えてしまいます。`X-Forwarded-For`（先頭値、Cloud Run配下では信頼できる）またはソケットのアドレス単位で1分あたり20リクエストまでの簡易レート制限を追加し、明らかな乱用を抑制します。追跡件数が一定数を超えたら期限切れエントリを掃除する簡易な安全弁も入れていますが、`X-Forwarded-For`を偽装できる直接アクセス環境（Cloud Run以外への転用時など）では回避され得る前提つきの対策です。単一プロセスのメモリ上でのみ有効なため、Cloud Runが複数インスタンスにスケールした場合は制限がインスタンスごとに独立してかかります（トラフィック規模が大きくなった場合はCloud Armorやリバースプロキシ側でのレート制限、あるいはRedis等を使った共有カウンタへの置き換えを検討してください。この規模のアプリでは現状のインメモリ実装で十分と判断しています）。
- **HTTPS**: Cloud Runはデプロイすると自動的にHTTPSエンドポイントが発行されます。アプリ側で追加のTLS設定は不要です。

## 3. Firestoreセキュリティルールのレビュー（完了条件3への回答）

`firestore.rules`は既に本番運用可能な内容です。

```text
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /{document=**} {
  allow read, write: if false;
}
```

- ユーザーは自分の`users/{自分のuid}/`配下にしか読み書きできない。
- 上記以外のパスは明示的に全拒否（デフォルト拒否）になっている。

これは典型的な「ユーザーごとのデータ分離・デフォルト拒否」パターンとして妥当であり、**現時点で追加の変更は不要**と判断しました。ただし今回レビューしたのは「他人のデータを読み書きできないか」という認可の観点のみです。ドキュメントのスキーマ検証（想定外のフィールドを弾く等）、書き込みサイズの上限、書き込み回数の乱用（1ユーザーが大量に書き込んで課金を圧迫する等）までは踏み込んでいません。個人の練習ツールとしての利用規模であれば当面問題にならない想定ですが、利用者が増える場合は追加のレビューを推奨します。

本番公開前に、Firebase Consoleの`Authentication > Settings > Authorized domains`に本番ドメインを追加することも忘れないでください（`docs/google-firebase-setup.md`参照）。

## 4. Cloud Runへのデプロイ手順

このリポジトリには`Dockerfile`を追加済みです。以下の手順は**あなた自身のGoogleアカウント・GCPプロジェクトで実行してください**（Claude Codeはアカウント作成や課金操作を代行しません）。

### 事前準備

1. [Google Cloudのプロジェクト](https://console.cloud.google.com/)を作成（または既存のFirebaseプロジェクトと共通化）する。
2. 課金を有効化する（Cloud Runは無料枠がありますが、プロジェクトへの課金アカウント紐付け自体は必要です）。
3. `gcloud` CLIをインストールし、ログインする。
4. Firebase（Googleログイン・Firestore）を使う場合は、`gcloud run deploy`を実行する**前**に`ai-interview-prototype/firebase-config.js`へFirebase Web app configを設定しておく（`docs/google-firebase-setup.md`参照）。この設定はコンテナイメージのビルド時に静的ファイルとして取り込まれるため、デプロイ後に書き換えても反映されません（再デプロイが必要になります）。

```powershell
gcloud auth login
gcloud config set project <あなたのプロジェクトID>
```

### デプロイ

リポジトリのルート（この`Dockerfile`がある場所）で実行します。

```powershell
gcloud run deploy ai-interview-chatbot `
  --source . `
  --region asia-northeast1 `
  --allow-unauthenticated `
  --set-env-vars HOST=0.0.0.0
```

- `--source .`: リポジトリを元にCloud Buildが自動でコンテナをビルドします（`Dockerfile`を使用）。
- `--allow-unauthenticated`: 誰でもアクセスできる公開URLにします（このアプリはユーザーごとの認証をアプリ内で行う設計のため、Cloud Run自体の認証は不要です）。
- `--region`: 東京リージョンの例です。必要に応じて変更してください。

デプロイが完了すると`https://ai-interview-chatbot-xxxxx-an.a.run.app`のようなURLが発行されます。

### デプロイ後に確認すること

- 発行されたURLで実際にアプリが開けるか。
- Firebaseを使う場合は、そのURLのドメインを`Authorized domains`に追加したか。
- `/api/openai`が想定通り応答するか（AI設定画面で自分のOpenAI APIキーを入力し、接続テストを行う）。

### カスタムドメインを使う場合

```powershell
gcloud run domain-mappings create --service ai-interview-chatbot --domain your-domain.example.com --region asia-northeast1
```

DNS側の設定はコマンド実行後に案内される内容に従ってください。

## 5. 今回の完了条件との対応まとめ

| 完了条件 | 対応状況 |
|---|---|
| 本番想定アーキテクチャのドキュメント化 | 本ドキュメント（1章） |
| OpenAI APIキーが本番でも露出しない構成の確認 | 2章。BYOK方式は本番でも成立、レート制限を追加 |
| Firebase認証・Firestoreルールのレビュー | 3章。追加変更不要と判断 |
| デプロイ先候補の選定・環境構築手順 | Cloud Runを選定（4章）。`Dockerfile`を追加 |

## 6. 今回はスコープ外とした事項

- 実際のCloud Runへのデプロイ実行（GCPアカウント・課金・ドメインの設定はユーザー自身が行う必要があります）。
- Vercel/Render等、他のホスティング先の詳細な比較検証（Cloud Runを選定したため見送り）。
- `/api/openai`の認証必須化（APIキー自体がユーザー入力のBYOK方式のため、現時点では優先度低と判断。将来的にアプリ側でユーザーアカウント認証を必須にする場合は再検討してください）。
