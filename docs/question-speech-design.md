# 質問読み上げ設計

## 方針

- 面接官の質問は、画面表示に加えてブラウザ標準の `speechSynthesis` で読み上げる。
- OpenAI TTS は使わないため、追加のAPI課金は発生しない。
- 質問文が確定して画面へ表示された直後に、自動で一度読み上げる。
- ユーザーは「質問をもう一度聞く」「読み上げ停止」「音声ON/OFF」を操作できる。
- 音声入力・録音中は質問読み上げを開始しない。
- 音声入力を開始する前に、質問読み上げは停止する。

## 保存

設定は `localStorage` の `aiInterviewPrototype.questionSpeechSettings` に保存する。

保存するもの:

- `isMuted`
- `rate`
- `pitch`
- `volume`

面接官タイプごとの声質はコード上の `voiceProfile` で定義し、利用可能な日本語音声から近いものを実行時に選ぶ。固定の `voiceURI` は保存しない。
履歴ログには読み上げ音声、再生状態、`SpeechSynthesisUtterance`、`SpeechSynthesisVoice` は保存しない。

## フォールバック

- `speechSynthesis` または `SpeechSynthesisUtterance` がない場合は、質問テキスト表示だけで動作する。
- 日本語音声が見つからない場合は、利用可能な音声にフォールバックする。
- 面接官タイプごとに `rate`、`pitch`、`voiceHints` を切り替える。
- `voiceschanged` に対応し、ブラウザ側で音声一覧が遅延ロードされるケースを吸収する。

## 実装状況

- `questionSpeechState` を追加。
- 質問カード下に読み上げ操作UIを追加。
- 初回質問・次質問の表示直後に `speakQuestion()` を呼ぶ。
- 読み上げ中は音声入力開始を無効化。
- 音声入力開始、回答送信、画面離脱、ページ離脱時に読み上げを停止。
