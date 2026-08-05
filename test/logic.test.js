import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./helpers/browser-env.js";

// ============================================================
// countFillerWords(text)
//   実装(ai-interview-prototype/script.js:4237)を読んだ要点:
//   - 戻り値は { total: number, breakdown: [{ word, count }, ...] } の形。
//   - FILLER_WORDS = ["えーと","えっと","ええと","あのー","そのー","まあ",
//     "なんか","あー","うーんと","うーん"]（script.js:4217-4228）。
//   - 「うーんと」が「うーん」を部分文字列として含むなど、短い語が長い語の
//     一部と誤って重複カウントされないよう、出現位置(range)ベースで
//     非重複マッチングしている（長い語から優先的にclaimし、既にclaimされた
//     範囲と重なる短い語の出現はカウントしない）。
//   - breakdownはFILLER_WORDS本来の並び順でフィルタしたあと、countの降順で
//     安定ソートされる（同数の場合は元の並び順を維持）。
// ============================================================

test("countFillerWords: 複数の異なるフィラーワードが混在するテキストを正しくカウントする", async () => {
  var app = await loadApp({ fresh: true });
  var result = app.window.countFillerWords("えーと、あのー、今日はなんかいい天気ですね。");
  assert.equal(result.total, 3);
  assert.deepEqual(result.breakdown, [
    { word: "えーと", count: 1 },
    { word: "あのー", count: 1 },
    { word: "なんか", count: 1 }
  ]);
});

test("countFillerWords: 「うーんと」は「うーん」との重複カウントをしない（回帰テスト）", async () => {
  var app = await loadApp({ fresh: true });
  // 「うーんと」は「うーん」を部分文字列として含む。
  // 非重複マッチングが正しく動いていれば「うーんと」1件のみとなり、
  // 「うーん」が別途1件として二重にカウントされることはない。
  var result = app.window.countFillerWords("うーんと");
  assert.equal(result.total, 1);
  assert.deepEqual(result.breakdown, [{ word: "うーんと", count: 1 }]);
});

test("countFillerWords: 同じフィラーワードが連続しても正しく複数件カウントする（回帰テスト）", async () => {
  var app = await loadApp({ fresh: true });
  // 「えーとえーと」は「えーと」(3文字)が隣接して2回出現するケース。
  // 範囲ベースのclaim処理で、1回目のマッチが2回目のマッチの検出を
  // 妨げない（=誤って1件や3件になったりしない）ことを確認する。
  var result = app.window.countFillerWords("えーとえーと");
  assert.equal(result.total, 2);
  assert.deepEqual(result.breakdown, [{ word: "えーと", count: 2 }]);
});

test("countFillerWords: フィラーワードを含まないテキストは0件になる", async () => {
  var app = await loadApp({ fresh: true });
  var result = app.window.countFillerWords("今日は良い天気です。");
  assert.equal(result.total, 0);
  assert.deepEqual(result.breakdown, []);
});

test("countFillerWords: 空文字列でもエラーにならず0件になる", async () => {
  var app = await loadApp({ fresh: true });
  var result = app.window.countFillerWords("");
  assert.equal(result.total, 0);
  assert.deepEqual(result.breakdown, []);
});

// ============================================================
// calculateSpeakingPace(text, durationMs)
//   実装(script.js:4290)を読んだ要点:
//   - durationMsが number型でない／有限でない／0以下の場合はnullを返す
//     （typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0）。
//   - minutes = durationMs / 60000、charCount = text文字数として
//     Math.round(charCount / minutes) を「1分あたりの文字数」として返す。
// ============================================================

test("calculateSpeakingPace: 1分(60000ms)の場合、文字数がそのままpaceになる", async () => {
  var app = await loadApp({ fresh: true });
  var text = "あ".repeat(100);
  var pace = app.window.calculateSpeakingPace(text, 60000);
  assert.equal(pace, 100);
});

test("calculateSpeakingPace: 30000ms(0.5分)の場合、文字数の2倍がpaceになる", async () => {
  var app = await loadApp({ fresh: true });
  var text = "あ".repeat(100);
  var pace = app.window.calculateSpeakingPace(text, 30000);
  assert.equal(pace, 200);
});

test("calculateSpeakingPace: durationMsが不正な場合はnullを返す", async () => {
  var app = await loadApp({ fresh: true });
  var text = "テスト用のテキストです。";
  assert.equal(app.window.calculateSpeakingPace(text, 0), null);
  assert.equal(app.window.calculateSpeakingPace(text, -1000), null);
  assert.equal(app.window.calculateSpeakingPace(text, NaN), null);
  assert.equal(app.window.calculateSpeakingPace(text, undefined), null);
});

// ============================================================
// scoreAnswer(answer, settings)
//   実装(script.js:3628)を読んだ要点:
//   - 引数は (answer: string, settings: { company?, role? }) の形。
//   - 空白除去後の文字数(length)、「結論|理由|まず|最初に|強み|志望理由|第一に」等の
//     結論語の有無、数字・実績を示す語の有無、settings.company/roleへの言及、
//     振り返り語の有無から base=45 を加減算し、最終的に
//     Math.max(20, Math.min(95, base)) でクランプして返す（数値）。
//   - length < 40 の場合は -12 のペナルティがあるため、極端に短い回答ほど
//     スコアが下がる構造になっている。
// ============================================================

test("scoreAnswer: 極端に短い回答は、ある程度の長さと具体性のある回答よりスコアが低くなる", async () => {
  var app = await loadApp({ fresh: true });
  var settings = { company: "サンプル株式会社", role: "エンジニア" };
  var shortAnswer = "はい。";
  var longAnswer =
    "結論として、私の強みはチームをまとめて成果を出す実行力です。" +
    "学生時代の部活動では50人規模のチームをまとめ、練習メニューを改善し、" +
    "大会で成果を出しました。この経験で得た学びを、サンプル株式会社のエンジニアとしても活かしたいです。";

  var shortScore = app.window.scoreAnswer(shortAnswer, settings);
  var longScore = app.window.scoreAnswer(longAnswer, settings);

  assert.ok(longScore > shortScore, `longScore(${longScore}) should be greater than shortScore(${shortScore})`);
  assert.ok(shortScore >= 20 && shortScore <= 95);
  assert.ok(longScore >= 20 && longScore <= 95);
});

test("scoreAnswer: 空文字列の回答でもエラーにならず、範囲内の数値を返す", async () => {
  var app = await loadApp({ fresh: true });
  var score = app.window.scoreAnswer("", { company: "", role: "" });
  assert.equal(typeof score, "number");
  assert.ok(score >= 20 && score <= 95);
});

// ============================================================
// pickBankQuestion(settings)
//   実装(script.js:3194)を読んだ要点:
//   - settings.category を normalizeCategory() で正規化し、
//     STAR_QUESTION_BANK_TYPE_OVERRIDES[settings.interviewType][category]（あれば）を
//     STAR_QUESTION_BANK[category] の「前」に連結したpoolを作る
//     （= interviewTypeに応じたオーバーライドの質問が優先される）。
//   - poolを先頭から走査し、wasQuestionAsked()で「既出でない」最初の質問を返す。
//   - wasQuestionAsked() は getAskedQuestions()（=
//     appState.interviewLog.entries[].question の一覧。interviewLogがnull/未設定
//     の場合は空配列）の中から isSimilarQuestion() で類似判定して既出かどうかを見る。
//   - pool内の質問がすべて既出の場合はnullを返す。
// ============================================================

test("pickBankQuestion: 該当カテゴリの質問が返る(self_pr, interviewType=first)", async () => {
  var app = await loadApp({ fresh: true });
  var settings = { category: "self_pr", interviewType: "first" };
  var question = app.window.pickBankQuestion(settings);
  assert.equal(question, "自己PRをしてください。");
});

test("pickBankQuestion: interviewLogに既出として記録されていれば別の質問が返る", async () => {
  var app = await loadApp({ fresh: true });
  var settings = { category: "self_pr", interviewType: "first" };

  // wasQuestionAsked()はappState.interviewLog.entries[].questionを見るため、
  // ここに1問目を「既出」として直接積んでおく。
  app.window.appState.interviewLog = {
    entries: [{ question: "自己PRをしてください。" }]
  };

  var question = app.window.pickBankQuestion(settings);
  assert.equal(question, "あなたの強みを、エピソードを交えて教えてください。");
});

test("pickBankQuestion: interviewTypeのオーバーライド質問が通常カテゴリ質問より優先される", async () => {
  var app = await loadApp({ fresh: true });
  // STAR_QUESTION_BANK_TYPE_OVERRIDES.technical.development が存在するケース。
  var settings = { category: "development", interviewType: "technical" };
  var question = app.window.pickBankQuestion(settings);
  assert.equal(
    question,
    "技術面接の観点で伺います。今の技術スタックを選んだ理由と、代替案との比較を教えてください。"
  );
});

test("pickBankQuestion: カテゴリの全質問を使い切るとnullが返る", async () => {
  var app = await loadApp({ fresh: true });
  var settings = { category: "self_pr", interviewType: "first" };
  // interviewType=firstにはself_prのオーバーライドがないため、
  // STAR_QUESTION_BANK.self_pr の5問すべてを既出にすれば尽きる。
  var allSelfPrQuestions = [
    "自己PRをしてください。",
    "あなたの強みを、エピソードを交えて教えてください。",
    "その強みは、当社のどんな場面で活かせると思いますか。",
    "周囲の人から、あなたはどんな人だと言われますか。",
    "自己PRの中で、特に自信を持っているエピソードを一つ詳しく教えてください。"
  ];
  app.window.appState.interviewLog = {
    entries: allSelfPrQuestions.map(function (q) {
      return { question: q };
    })
  };

  var question = app.window.pickBankQuestion(settings);
  assert.equal(question, null);
});

// ============================================================
// isSimilarQuestion(candidate, existingQuestion)
//   実装(script.js:3165)を読んだ要点:
//   - normalizeQuestionForCompare()で小文字化・記号/空白除去などの正規化を行い、
//     完全一致 or 一方が他方を包含する場合は類似と判定してtrueを返す。
//   - それ以外は、正規化後の短い方の文字列長が16未満なら即false。
//     16以上ある場合のみ、2文字ずつのbigram共有率が0.72を超えるかで判定する。
// ============================================================

test("isSimilarQuestion: 完全に同じ文字列は類似と判定される", async () => {
  var app = await loadApp({ fresh: true });
  var q = "自己PRをしてください。";
  assert.equal(app.window.isSimilarQuestion(q, q), true);
});

test("isSimilarQuestion: 明らかに内容が異なる2つの質問は類似と判定されない", async () => {
  var app = await loadApp({ fresh: true });
  var a = "自己PRをしてください。";
  var b = "当社を志望する理由を教えてください。";
  assert.equal(app.window.isSimilarQuestion(a, b), false);
});

// ============================================================
// evaluateAnswer(question, answer, settings, expectedAnswerData)
//   実装(script.js:3776)を読んだ要点:
//   - 戻り値には score, axisScores, goodPoints, improvements, issues,
//     missingElements, unverifiedClaims, fairnessFlags, shouldAskDeepDive,
//     deepDiveQuestion, nextQuestion 等が含まれる。
//   - 回答に数字・%・実績語（優勝/受賞/売上/利益 等）が含まれ、かつ
//     settings.sourceEsEntriesに証跡が無い場合にunverifiedClaimsへ追加。
//   - 回答に家族・出身地等の個人属性語が含まれる場合にfairnessFlagsへ追加。
//   - shouldAskDeepDiveは「回答が50文字未満」「unverifiedClaimsがある」
//     「scoreが65未満」のいずれかでtrueになる。
// ============================================================

test("evaluateAnswer: 戻り値に評価結果一式のキーが揃っている", async () => {
  var app = await loadApp({ fresh: true });
  var result = app.window.evaluateAnswer(
    "自己PRをしてください。",
    "前職では新規事業の立ち上げを担当し、課題を分析して改善策を実行し、チームで成果を出しました。",
    { company: "サンプル株式会社", role: "営業職" }
  );
  assert.equal(typeof result.score, "number");
  assert.equal(typeof result.axisScores, "object");
  assert.ok(Array.isArray(result.goodPoints));
  assert.ok(Array.isArray(result.improvements));
  assert.ok(Array.isArray(result.missingElements));
  assert.ok(Array.isArray(result.unverifiedClaims));
  assert.ok(Array.isArray(result.fairnessFlags));
  assert.equal(typeof result.shouldAskDeepDive, "boolean");
  assert.equal(typeof result.nextQuestion, "string");
});

test("evaluateAnswer: 短い回答（50文字未満）はshouldAskDeepDiveがtrueになる", async () => {
  var app = await loadApp({ fresh: true });
  var result = app.window.evaluateAnswer("自己PRをしてください。", "頑張りました。", {});
  assert.equal(result.shouldAskDeepDive, true);
});

test("evaluateAnswer: sourceEsEntriesの裏付けが無い状態で数字・実績語を含む回答はunverifiedClaimsに入る", async () => {
  var app = await loadApp({ fresh: true });
  var longAnswerWithNumbers = "前職では売上を20%改善し、社内表彰で優勝しました。".repeat(2);
  var result = app.window.evaluateAnswer("自己PRをしてください。", longAnswerWithNumbers, {});
  assert.ok(result.unverifiedClaims.length > 0);
});

test("evaluateAnswer: sourceEsEntriesの裏付けがあれば同じ内容でもunverifiedClaimsに入らない", async () => {
  var app = await loadApp({ fresh: true });
  var longAnswerWithNumbers = "前職では売上を20%改善し、社内表彰で優勝しました。".repeat(2);
  var result = app.window.evaluateAnswer("自己PRをしてください。", longAnswerWithNumbers, {
    sourceEsEntries: [{ questionText: "自己PR", answerText: "売上20%改善の実績があります。" }]
  });
  assert.equal(result.unverifiedClaims.length, 0);
});

test("evaluateAnswer: 個人属性に触れる回答はfairnessFlagsに入る", async () => {
  var app = await loadApp({ fresh: true });
  var answerMentioningFamily = "父が経営者で、その影響を受けて事業に関心を持ちました。".repeat(2);
  var result = app.window.evaluateAnswer("志望動機を教えてください。", answerMentioningFamily, {});
  assert.ok(result.fairnessFlags.length > 0);
});
