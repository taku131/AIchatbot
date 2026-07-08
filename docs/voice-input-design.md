# 音声入力・一時録音設計

## 現状

- 文字起こしはブラウザ標準の `SpeechRecognition` / `webkitSpeechRecognition` を使う。
- 言語は `ja-JP`、`continuous = true`、`interimResults = true`。
- 確定した文字起こしは回答欄 `answerInput` に反映する。
- 暫定文字起こしは `voiceTranscriptPreview` にだけ表示する。
- 回答評価AIへ渡すのは、送信時点の `answerInput.value` のテキスト。

## 方針

- 生音声データは長期保存しない。
- 生音声は `MediaRecorder` で取得し、`Blob` と `ObjectURL` を実行中ページのメモリだけに保持する。
- 音声本体、Blob、ObjectURL、Base64音声は `localStorage`、`sessionStorage`、履歴JSON、Gitには保存しない。
- 履歴に残すのは文字起こしテキスト、入力方法、音声メタ情報だけ。
- 面接終了直後のフィードバック画面では、現在のページを開いている間だけ録音を確認できる。
- 再練習、アカウント切替、ページ離脱時に `URL.revokeObjectURL()` で一時音声を破棄する。

## 保存する履歴データ

```json
{
  "answer": "送信時点の回答テキスト",
  "answerInputMode": "voice",
  "transcript": {
    "text": "送信時点の文字起こしテキスト",
    "source": "speech_recognition",
    "confidence": null,
    "editedByUser": false,
    "finalizedAt": "2026-07-08T00:00:00.000Z"
  },
  "audio": {
    "stored": false,
    "reviewAvailableDuringSession": true,
    "clipId": "audio_xxx",
    "mimeType": "audio/webm",
    "durationMs": 30000,
    "sizeBytes": 240000,
    "discardedAt": null
  }
}
```

`clipId` は現在ページ内の一時メモリ参照用で、再読み込み後の復元には使わない。

## 実装状況

- `MediaRecorder` による一時録音を追加。
- 録音Blobは `appState.audioClips` にだけ保持。
- 回答送信時に文字起こしテキストを評価AIへ渡し、履歴には `transcript` と音声メタ情報だけ保存。
- フィードバック画面に「音声確認」セクションを追加。
- 履歴詳細では音声を再生せず、文字起こしと「音声は保存なし」を表示。
- `SpeechRecognition` の結果処理は `event.resultIndex` 以降を見るようにし、確定済み文字起こしの重複リスクを下げた。
