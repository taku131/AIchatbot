# Googleログイン / Firebase設定手順

このアプリで「Googleログイン + Firestoreクラウド保存 + localStorage移行」を使うための設定メモです。

## 無料で使う前提

- FirebaseのSpark planから開始できます。支払い方法の登録は不要です。
- GoogleログインはFirebase AuthenticationのGoogle providerを使います。電話認証は使いません。
- Cloud Firestoreの無料枠は、保存容量1GiB、読み取り50,000回/日、書き込み20,000回/日、削除20,000回/日が目安です。
- Firebase Hostingを使う場合も無料枠があります。小規模な面接練習アプリなら十分収まる想定です。

## Firebase Consoleで行うこと

1. Firebase Consoleでプロジェクトを作成します。
2. Webアプリを追加し、表示されたFirebase Web app configを控えます。
3. `Authentication` > `Sign-in method` で `Google` を有効化します。
4. `Authentication` > `Settings` > `Authorized domains` に利用ドメインを追加します。
   - ローカル確認: `localhost`
   - 本番: デプロイ先ドメイン
5. `Firestore Database` を作成します。
6. このリポジトリの `firestore.rules` をFirestore Rulesとしてデプロイします。

## あなたが操作する箇所

ここまでのアプリ側実装は完了しています。あなたが操作する必要があるのは次の4つです。

1. Firebase Consoleでプロジェクトを作る。
2. AuthenticationでGoogleログインを有効化する。
3. Firestore Databaseを作る。
4. Firebase Web app configを [ai-interview-prototype/firebase-config.js](../ai-interview-prototype/firebase-config.js) に貼る。

## Web app configの設定場所

[ai-interview-prototype/firebase-config.js](../ai-interview-prototype/firebase-config.js) の `null` を、Firebase Consoleで取得したconfigに差し替えます。

変更前:

```js
window.AI_INTERVIEW_FIREBASE_CONFIG = null;
```

変更後:

```js
window.AI_INTERVIEW_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

未設定、または `null` のままなら、アプリは従来どおりlocalStorageのみで動きます。

## 保存先の切り替え

- 未ログイン時: `localStorage` に保存します。
- Googleログイン中: Firestoreと画面内メモリに保存します。ログイン中に取得したクラウドデータで既存localStorageを上書きしません。
- ログアウト後: その端末にもともと残っていたlocalStorageデータだけを表示します。

## Firestore Rulesのデプロイ

Firebase CLIを使う場合は、Firebaseプロジェクトを選択したうえで次を実行します。

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
npm run firebase:deploy:rules
```

Firebase Consoleから手動で設定する場合は、[firestore.rules](../firestore.rules) の内容をFirestore Rules画面に貼り付けて公開します。

## Firestoreの保存先

ログインユーザーごとに以下へ保存します。

```text
users/{uid}/profile/main
users/{uid}/settings/main
users/{uid}/accounts/{accountId}
users/{uid}/companies/{companyId}
users/{uid}/esEntries/{esEntryId}
users/{uid}/interviewLogs/{logId}
```

`uid` はFirebase AuthenticationのユーザーIDです。

## localStorage移行

Googleログイン後、アカウント画面の「この端末のデータをクラウドへ移行」を押すと、以下のlocalStorageデータをFirestoreへコピーします。

- `aiInterviewPrototype.accounts`
- `aiInterviewPrototype.companies`
- `aiInterviewPrototype.esEntries`
- `aiInterviewPrototype.logs`
- `aiInterviewPrototype.activeAccountId`
- `aiInterviewPrototype.questionSpeechSettings`

既存のクラウドデータがある場合は、同じIDのデータを重複させずにマージします。

## OpenAI APIキーの扱い

OpenAI APIキーはFirestoreへ保存しません。

- `aiInterviewPrototype.openAiSettings.apiKey` は移行対象外です。
- `aiInterviewPrototype.openAiSessionKey` も移行対象外です。
- 共有PCではAPIキーをブラウザに保存せず、必要なセッションだけ入力する運用を推奨します。

## 確認項目

- 未ログイン状態で従来どおりlocalStorage保存できる。
- Googleログイン後、Firestoreからデータが読み込まれる。
- localStorage移行後、別ブラウザで同じGoogleアカウントにログインしてデータが見える。
- 他ユーザーの `users/{otherUid}` には読み書きできない。
