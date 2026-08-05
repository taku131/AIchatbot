import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./helpers/browser-env.js";

// getHistoryLogTimestamp(log) / getHistoryLogScore(log)
// 実装: ai-interview-prototype/script.js
//   function getHistoryLogTimestamp(log) {
//     var value = log.savedAt || log.finishedAt || log.startedAt;
//     var date = value ? new Date(value) : null;
//     return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
//   }
//   function getHistoryLogScore(log) {
//     return log.finalFeedback && typeof log.finalFeedback.finalScore === "number" ?
//       log.finalFeedback.finalScore : -1;
//   }

test("getHistoryLogTimestamp: savedAtが優先的に使われる", async () => {
  var app = await loadApp({ fresh: true });
  var log = {
    savedAt: "2026-01-05T10:00:00.000Z",
    finishedAt: "2026-01-01T00:00:00.000Z",
    startedAt: "2025-12-31T00:00:00.000Z"
  };
  assert.equal(
    app.window.getHistoryLogTimestamp(log),
    new Date("2026-01-05T10:00:00.000Z").getTime()
  );
});

test("getHistoryLogTimestamp: savedAtが無ければfinishedAt、それも無ければstartedAtにフォールバックする", async () => {
  var app = await loadApp({ fresh: true });
  var logWithFinishedOnly = {
    finishedAt: "2026-01-02T00:00:00.000Z",
    startedAt: "2025-12-31T00:00:00.000Z"
  };
  assert.equal(
    app.window.getHistoryLogTimestamp(logWithFinishedOnly),
    new Date("2026-01-02T00:00:00.000Z").getTime()
  );

  var logWithStartedOnly = { startedAt: "2025-12-31T00:00:00.000Z" };
  assert.equal(
    app.window.getHistoryLogTimestamp(logWithStartedOnly),
    new Date("2025-12-31T00:00:00.000Z").getTime()
  );
});

test("getHistoryLogTimestamp: 日時情報が全く無い、または不正な場合は0を返す", async () => {
  var app = await loadApp({ fresh: true });
  assert.equal(app.window.getHistoryLogTimestamp({}), 0);
  assert.equal(app.window.getHistoryLogTimestamp({ savedAt: "not-a-date" }), 0);
});

test("getHistoryLogScore: finalFeedback.finalScoreが数値ならその値を返す", async () => {
  var app = await loadApp({ fresh: true });
  var log = { finalFeedback: { finalScore: 82 } };
  assert.equal(app.window.getHistoryLogScore(log), 82);
});

test("getHistoryLogScore: finalFeedbackが無い、またはfinalScoreが数値でない場合は-1を返す", async () => {
  var app = await loadApp({ fresh: true });
  assert.equal(app.window.getHistoryLogScore({}), -1);
  assert.equal(app.window.getHistoryLogScore({ finalFeedback: {} }), -1);
  assert.equal(
    app.window.getHistoryLogScore({ finalFeedback: { finalScore: "82" } }),
    -1
  );
});

// applyHistoryFilterAndSort(logs)
// 実装: appState.historyFilter の companyName / category / sort を見て
// フィルタとソートを行う。companyNameは getLogCompanyName(log) と、
// categoryは normalizeCategory(settings.category) と normalizeCategory(filter.category)
// を比較する。companyIdが解決できない場合、getLogCompanyName は
// settings.company（無ければ「企業未設定」）を返す（findCompanyはlocalStorageの
// 企業一覧を参照するが、テスト環境では常に空なのでcompanyId解決は行われない）。

function makeLog(overrides) {
  return Object.assign(
    {
      id: "log_" + Math.random().toString(36).slice(2),
      settings: { company: "A社", category: "self_pr" },
      savedAt: "2026-01-01T00:00:00.000Z"
    },
    overrides
  );
}

test("applyHistoryFilterAndSort: companyNameで絞り込むと該当企業のログだけが残る", async () => {
  var app = await loadApp({ fresh: true });
  var logA1 = makeLog({ settings: { company: "A社", category: "self_pr" } });
  var logB1 = makeLog({ settings: { company: "B社", category: "self_pr" } });
  var logA2 = makeLog({ settings: { company: "A社", category: "motivation" } });

  app.window.appState.historyFilter.companyName = "A社";
  var result = app.window.applyHistoryFilterAndSort([logA1, logB1, logA2]);

  assert.equal(result.length, 2);
  assert.ok(result.every((log) => log.settings.company === "A社"));
});

test("applyHistoryFilterAndSort: categoryで絞り込むと該当カテゴリのログだけが残る", async () => {
  var app = await loadApp({ fresh: true });
  var logSelfPr = makeLog({ settings: { company: "A社", category: "self_pr" } });
  var logMotivation = makeLog({ settings: { company: "A社", category: "motivation" } });

  app.window.appState.historyFilter.category = "motivation";
  var result = app.window.applyHistoryFilterAndSort([logSelfPr, logMotivation]);

  assert.equal(result.length, 1);
  assert.equal(result[0].settings.category, "motivation");
});

test("applyHistoryFilterAndSort: categoryのエイリアス（self-pr等）も正規化して比較される", async () => {
  var app = await loadApp({ fresh: true });
  // normalizeCategory: "self-pr" -> "self_pr"
  var logAliased = makeLog({ settings: { company: "A社", category: "self-pr" } });
  var logOther = makeLog({ settings: { company: "A社", category: "motivation" } });

  app.window.appState.historyFilter.category = "self_pr";
  var result = app.window.applyHistoryFilterAndSort([logAliased, logOther]);

  assert.equal(result.length, 1);
  assert.equal(result[0], logAliased);
});

test("applyHistoryFilterAndSort: companyNameとcategoryを両方指定するとAND条件になる", async () => {
  var app = await loadApp({ fresh: true });
  var match = makeLog({ settings: { company: "A社", category: "self_pr" } });
  var wrongCompany = makeLog({ settings: { company: "B社", category: "self_pr" } });
  var wrongCategory = makeLog({ settings: { company: "A社", category: "motivation" } });

  app.window.appState.historyFilter.companyName = "A社";
  app.window.appState.historyFilter.category = "self_pr";
  var result = app.window.applyHistoryFilterAndSort([match, wrongCompany, wrongCategory]);

  assert.equal(result.length, 1);
  assert.equal(result[0], match);
});

test("applyHistoryFilterAndSort: sort=date_desc（デフォルト）で日付が新しい順に並ぶ", async () => {
  var app = await loadApp({ fresh: true });
  var older = makeLog({ savedAt: "2026-01-01T00:00:00.000Z" });
  var newer = makeLog({ savedAt: "2026-01-10T00:00:00.000Z" });

  var result = app.window.applyHistoryFilterAndSort([older, newer]);
  assert.deepEqual(result, [newer, older]);
});

test("applyHistoryFilterAndSort: sort=date_ascで日付が古い順に並ぶ", async () => {
  var app = await loadApp({ fresh: true });
  var older = makeLog({ savedAt: "2026-01-01T00:00:00.000Z" });
  var newer = makeLog({ savedAt: "2026-01-10T00:00:00.000Z" });

  app.window.appState.historyFilter.sort = "date_asc";
  var result = app.window.applyHistoryFilterAndSort([newer, older]);
  assert.deepEqual(result, [older, newer]);
});

test("applyHistoryFilterAndSort: sort=score_descで点数が高い順に並ぶ", async () => {
  var app = await loadApp({ fresh: true });
  var low = makeLog({ finalFeedback: { finalScore: 40 } });
  var high = makeLog({ finalFeedback: { finalScore: 90 } });

  app.window.appState.historyFilter.sort = "score_desc";
  var result = app.window.applyHistoryFilterAndSort([low, high]);
  assert.deepEqual(result, [high, low]);
});

test("applyHistoryFilterAndSort: sort=score_ascで点数が低い順に並ぶ", async () => {
  var app = await loadApp({ fresh: true });
  var low = makeLog({ finalFeedback: { finalScore: 40 } });
  var high = makeLog({ finalFeedback: { finalScore: 90 } });

  app.window.appState.historyFilter.sort = "score_asc";
  var result = app.window.applyHistoryFilterAndSort([high, low]);
  assert.deepEqual(result, [low, high]);
});

// computeAchievements(logs)
// 実装: ai-interview-prototype/script.js の ACHIEVEMENT_DEFINITIONS（practice/streak/score/improvement）
// completedログ = finalFeedback.finalScoreが数値のログ。
// - practice: completedCount >= threshold で earned
// - streak: 完了ログのローカル日付（savedAt/finishedAt/startedAtから求めた暦日）の
//   最長連続日数 >= threshold で earned
// - score: completedCount > 0 && maxScore >= threshold で earned
// - improvement (score_improve_10): completedCount >= 2 かつ (maxScore - firstScore) >= 10 で earned

function makeCompletedLog(savedAt, finalScore) {
  return {
    id: "log_" + savedAt + "_" + Math.random().toString(36).slice(2),
    settings: { company: "A社", category: "self_pr" },
    savedAt: savedAt,
    finalFeedback: { finalScore: finalScore }
  };
}

function getAchievement(achievements, id) {
  var found = achievements.find((item) => item.id === id);
  assert.ok(found, "achievement " + id + " should exist");
  return found;
}

test("computeAchievements: 練習回数バッジは閾値以上の完了件数でearned:trueになる", async () => {
  var app = await loadApp({ fresh: true });
  // practice_1(1), practice_5(5) の間、3件だけ完了させる
  var logs = [
    makeCompletedLog("2026-01-01T00:00:00.000Z", 60),
    makeCompletedLog("2026-01-02T00:00:00.000Z", 60),
    makeCompletedLog("2026-01-03T00:00:00.000Z", 60)
  ];
  var achievements = app.window.computeAchievements(logs);

  assert.equal(getAchievement(achievements, "practice_1").earned, true);
  assert.equal(getAchievement(achievements, "practice_5").earned, false);
  assert.equal(getAchievement(achievements, "practice_10").earned, false);
});

test("computeAchievements: 完了扱いされないログ（finalScoreが数値でない）はカウントされない", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    makeCompletedLog("2026-01-01T00:00:00.000Z", 60),
    { id: "unfinished", settings: {}, savedAt: "2026-01-02T00:00:00.000Z" }
  ];
  var achievements = app.window.computeAchievements(logs);
  assert.equal(getAchievement(achievements, "practice_1").earned, true);
  // 2件目は未完了扱いなのでpractice_5等はまだ解禁されない
  assert.equal(getAchievement(achievements, "practice_5").earned, false);
});

test("computeAchievements: 3日連続のログでstreak_3がearned:trueになる", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    makeCompletedLog("2026-01-01T09:00:00.000Z", 60),
    makeCompletedLog("2026-01-02T09:00:00.000Z", 60),
    makeCompletedLog("2026-01-03T09:00:00.000Z", 60)
  ];
  var achievements = app.window.computeAchievements(logs);

  assert.equal(getAchievement(achievements, "streak_3").earned, true);
  assert.equal(getAchievement(achievements, "streak_7").earned, false);
});

test("computeAchievements: 日付が飛び飛びの場合は連続と判定されない", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    makeCompletedLog("2026-01-01T09:00:00.000Z", 60),
    makeCompletedLog("2026-01-03T09:00:00.000Z", 60),
    makeCompletedLog("2026-01-05T09:00:00.000Z", 60)
  ];
  var achievements = app.window.computeAchievements(logs);

  assert.equal(getAchievement(achievements, "streak_3").earned, false);
});

test("computeAchievements: 同じ日に複数回練習しても連続日数は1日としてしかカウントされない", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    makeCompletedLog("2026-01-01T09:00:00.000Z", 60),
    makeCompletedLog("2026-01-01T15:00:00.000Z", 60),
    makeCompletedLog("2026-01-02T09:00:00.000Z", 60)
  ];
  var achievements = app.window.computeAchievements(logs);

  // 実質2暦日分なので3日連続には届かない
  assert.equal(getAchievement(achievements, "streak_3").earned, false);
});

test("computeAchievements: スコア到達バッジは閾値以上のfinalScoreがあればearned:trueになる", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    makeCompletedLog("2026-01-01T00:00:00.000Z", 75),
    makeCompletedLog("2026-01-02T00:00:00.000Z", 60)
  ];
  var achievements = app.window.computeAchievements(logs);

  assert.equal(getAchievement(achievements, "score_70").earned, true);
  assert.equal(getAchievement(achievements, "score_90").earned, false);
});

test("computeAchievements: スコア向上バッジは最初のスコアから10点以上向上でearned:trueになる", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    makeCompletedLog("2026-01-01T00:00:00.000Z", 50),
    makeCompletedLog("2026-01-02T00:00:00.000Z", 65)
  ];
  var achievements = app.window.computeAchievements(logs);

  assert.equal(getAchievement(achievements, "score_improve_10").earned, true);
});

test("computeAchievements: 完了2件未満、または向上幅が10点未満ならscore_improve_10はearned:falseになる", async () => {
  var app = await loadApp({ fresh: true });
  var singleLog = [makeCompletedLog("2026-01-01T00:00:00.000Z", 80)];
  var singleAchievements = app.window.computeAchievements(singleLog);
  assert.equal(getAchievement(singleAchievements, "score_improve_10").earned, false);

  var smallImprovementLogs = [
    makeCompletedLog("2026-01-01T00:00:00.000Z", 50),
    makeCompletedLog("2026-01-02T00:00:00.000Z", 55)
  ];
  var smallImprovementAchievements = app.window.computeAchievements(smallImprovementLogs);
  assert.equal(getAchievement(smallImprovementAchievements, "score_improve_10").earned, false);
});

// generateFinalFeedback(interviewLog)
// 実装: interviewLog.entries（各entryはevaluation: { score, axisScores, goodPoints,
// improvements, deepDiveQuestion }を持つ）から平均点・軸別平均・良い点・改善点等を集計する。

test("generateFinalFeedback: entriesのevaluationからfinalScoreとscoreBreakdownを集計する", async () => {
  var app = await loadApp({ fresh: true });
  var interviewLog = {
    entries: [
      {
        evaluation: {
          score: 80,
          axisScores: { "結論の明確さ": 8, "論理性": 7 },
          goodPoints: ["結論が明確でした"],
          improvements: ["具体例を増やしましょう"],
          deepDiveQuestion: "その経験で最も苦労した点は？"
        }
      },
      {
        evaluation: {
          score: 60,
          axisScores: { "結論の明確さ": 6, "論理性": 5 },
          goodPoints: ["熱意が伝わりました"],
          improvements: ["結論を先に述べましょう"],
          deepDiveQuestion: "チームでの役割は？"
        }
      }
    ]
  };

  var feedback = app.window.generateFinalFeedback(interviewLog);

  assert.equal(feedback.finalScore, 70); // (80+60)/2
  assert.equal(feedback.scoreBreakdown["結論の明確さ"], 7); // (8+6)/2
  assert.equal(feedback.scoreBreakdown["論理性"], 6); // (7+5)/2
  assert.deepEqual(feedback.goodPoints, ["結論が明確でした", "熱意が伝わりました"]);
  assert.deepEqual(feedback.improvements, ["具体例を増やしましょう", "結論を先に述べましょう"]);
  assert.deepEqual(feedback.deepDiveQuestions, [
    "その経験で最も苦労した点は？",
    "チームでの役割は？"
  ]);
  assert.equal(typeof feedback.revisionDirection, "string");
  assert.ok(Array.isArray(feedback.nextPracticeList) && feedback.nextPracticeList.length > 0);
  assert.equal(typeof feedback.generatedAt, "string");
});

test("generateFinalFeedback: entriesが空、またはinterviewLogが未指定の場合はデフォルトのフィードバックを返す", async () => {
  var app = await loadApp({ fresh: true });

  var emptyFeedback = app.window.generateFinalFeedback({ entries: [] });
  assert.equal(emptyFeedback.finalScore, 0);
  assert.deepEqual(emptyFeedback.goodPoints, [
    "回答ログを残せています。練習を重ねる土台ができています。"
  ]);
  assert.deepEqual(emptyFeedback.improvements, [
    "応募先との接点をさらに具体化すると、より強い回答になります。"
  ]);

  var noArgFeedback = app.window.generateFinalFeedback(undefined);
  assert.equal(noArgFeedback.finalScore, 0);
});

test("generateFinalFeedback: evaluationを持たないentryはスコア0として扱われる", async () => {
  var app = await loadApp({ fresh: true });
  var interviewLog = {
    entries: [
      { evaluation: { score: 100, axisScores: {}, goodPoints: [], improvements: [] } },
      { evaluation: null }
    ]
  };

  var feedback = app.window.generateFinalFeedback(interviewLog);
  assert.equal(feedback.finalScore, 50); // (100+0)/2
});

// buildHistoryScoreChartPoints(logs)
// スコア推移グラフ描画（renderHistoryScoreChart）からDOM非依存部分を抽出した純粋関数。
// finalFeedback.finalScoreが数値のログだけを対象に、日時の古い順へ並べ替え、
// {score, dateLabel}の配列を返す。

test("buildHistoryScoreChartPoints: finalScoreが数値のログだけを対象にする", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    { savedAt: "2026-01-01T00:00:00.000Z", finalFeedback: { finalScore: 60 } },
    { savedAt: "2026-01-02T00:00:00.000Z", finalFeedback: null },
    { savedAt: "2026-01-03T00:00:00.000Z" },
    { savedAt: "2026-01-04T00:00:00.000Z", finalFeedback: { finalScore: "80" } }
  ];
  var points = app.window.buildHistoryScoreChartPoints(logs);
  assert.equal(points.length, 1);
  assert.equal(points[0].score, 60);
});

test("buildHistoryScoreChartPoints: 日時の古い順に並び替えられる", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    { savedAt: "2026-03-01T00:00:00.000Z", finalFeedback: { finalScore: 90 } },
    { savedAt: "2026-01-01T00:00:00.000Z", finalFeedback: { finalScore: 50 } },
    { savedAt: "2026-02-01T00:00:00.000Z", finalFeedback: { finalScore: 70 } }
  ];
  var points = app.window.buildHistoryScoreChartPoints(logs);
  assert.deepEqual(points.map(function (point) { return point.score; }), [50, 70, 90]);
});

test("buildHistoryScoreChartPoints: savedAtが無ければfinishedAt/startedAtにフォールバックして日時を決める", async () => {
  var app = await loadApp({ fresh: true });
  var logs = [
    { finishedAt: "2026-01-05T00:00:00.000Z", finalFeedback: { finalScore: 40 } },
    { startedAt: "2026-01-01T00:00:00.000Z", finalFeedback: { finalScore: 30 } }
  ];
  var points = app.window.buildHistoryScoreChartPoints(logs);
  assert.deepEqual(points.map(function (point) { return point.score; }), [30, 40]);
});

test("buildHistoryScoreChartPoints: 空配列やlogsがnull/undefinedでもエラーにならず空配列を返す", async () => {
  var app = await loadApp({ fresh: true });
  assert.deepEqual(app.window.buildHistoryScoreChartPoints([]), []);
  assert.deepEqual(app.window.buildHistoryScoreChartPoints(null), []);
  assert.deepEqual(app.window.buildHistoryScoreChartPoints(undefined), []);
});
