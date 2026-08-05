import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./helpers/browser-env.js";

describe("永続化: CRUDの保存・読込ラウンドトリップ", () => {
  test("アカウント: 保存前は空配列、保存後は内容が一致する", async () => {
    var app = await loadApp({ fresh: true });
    assert.deepEqual(app.window.loadAccounts(), []);
    var accounts = [
      { id: "acct_1", displayName: "アカウント1" },
      { id: "acct_2", displayName: "アカウント2" }
    ];
    app.window.saveAccounts(accounts);
    assert.deepEqual(app.window.loadAccounts(), accounts);
  });

  test("企業: 保存前は空配列、保存後は内容が一致する", async () => {
    var app = await loadApp({ fresh: true });
    assert.deepEqual(app.window.loadCompanies(), []);
    var companies = [
      { id: "company_1", accountId: "acct_1", companyName: "テスト企業1" },
      { id: "company_2", accountId: "acct_1", companyName: "テスト企業2" }
    ];
    app.window.saveCompanies(companies);
    assert.deepEqual(app.window.loadCompanies(), companies);
  });

  test("ES回答: 保存前は空配列、保存後は内容が一致する", async () => {
    var app = await loadApp({ fresh: true });
    assert.deepEqual(app.window.loadEsEntries(), []);
    var esEntries = [
      { id: "es_1", accountId: "acct_1", companyId: "company_1", questionText: "自己PRを教えてください" }
    ];
    app.window.saveEsEntries(esEntries);
    assert.deepEqual(app.window.loadEsEntries(), esEntries);
  });

  test("面接履歴: 保存前は空配列、saveInterviewLogsで保存した内容がloadInterviewLogsで読める", async () => {
    var app = await loadApp({ fresh: true });
    assert.deepEqual(app.window.loadInterviewLogs(), []);
    var logs = [{ id: "log_1", accountId: "acct_1", finished: true }];
    app.window.saveInterviewLogs(logs);
    assert.deepEqual(app.window.loadInterviewLogs(), logs);
  });
});

describe("永続化: 削除動作", () => {
  test("deleteCompany: 指定した企業だけが削除され、他の企業は残る", async () => {
    var app = await loadApp({ fresh: true });
    var accountId = "acct_1";
    app.window.appState.activeAccountId = accountId;
    // deleteCompanyはwindow.confirmで確認を取るため、テストでは常に許可する形にモックする。
    app.window.confirm = function () {
      return true;
    };

    var companyA = { id: "company_a", accountId: accountId, companyName: "企業A" };
    var companyB = { id: "company_b", accountId: accountId, companyName: "企業B" };
    app.window.saveCompanies([companyA, companyB]);

    app.window.deleteCompany("company_a");

    var remaining = app.window.loadCompanies();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, "company_b");
  });

  test("deleteEsEntry: 指定したES回答だけが削除され、他のES回答は残る", async () => {
    var app = await loadApp({ fresh: true });
    var accountId = "acct_1";
    app.window.appState.activeAccountId = accountId;
    app.window.confirm = function () {
      return true;
    };

    var esA = { id: "es_a", accountId: accountId, companyId: "company_a", questionText: "設問A" };
    var esB = { id: "es_b", accountId: accountId, companyId: "company_a", questionText: "設問B" };
    app.window.saveEsEntries([esA, esB]);

    app.window.deleteEsEntry("es_a");

    var remaining = app.window.loadEsEntries();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, "es_b");
  });

  test("deleteAccountCascade: アカウント削除で紐づく企業・ES・面接履歴も連動して削除される（他アカウントのデータは残る）", async () => {
    var app = await loadApp({ fresh: true });
    app.window.confirm = function () {
      return true;
    };

    var accountA = { id: "acct_a", displayName: "アカウントA" };
    var accountB = { id: "acct_b", displayName: "アカウントB" };
    app.window.saveAccounts([accountA, accountB]);

    app.window.saveCompanies([
      { id: "company_a1", accountId: "acct_a", companyName: "A社の企業" },
      { id: "company_b1", accountId: "acct_b", companyName: "B社の企業" }
    ]);
    app.window.saveEsEntries([
      { id: "es_a1", accountId: "acct_a", companyId: "company_a1", questionText: "AのES" },
      { id: "es_b1", accountId: "acct_b", companyId: "company_b1", questionText: "BのES" }
    ]);
    app.window.saveInterviewLogs([
      { id: "log_a1", accountId: "acct_a" },
      { id: "log_b1", accountId: "acct_b" }
    ]);

    // activeAccountIdは削除対象と別（もしくは未設定）にしておき、
    // deleteAccountCascade内部でselectAccount(null)経由の画面遷移処理に入らないようにする。
    app.window.appState.activeAccountId = null;

    app.window.deleteAccountCascade("acct_a");

    // アカウント自体が削除される
    var remainingAccountIds = app.window.loadAccounts().map(function (a) {
      return a.id;
    });
    assert.deepEqual(remainingAccountIds, ["acct_b"]);

    // acct_aに紐づく企業・ES・面接履歴が連動して削除される
    assert.deepEqual(app.window.getAccountCompanies("acct_a"), []);
    assert.deepEqual(app.window.getAccountEsEntries("acct_a"), []);
    assert.deepEqual(app.window.getAccountInterviewLogs("acct_a"), []);

    // acct_bのデータは影響を受けず残っている
    assert.equal(app.window.getAccountCompanies("acct_b").length, 1);
    assert.equal(app.window.getAccountEsEntries("acct_b").length, 1);
    assert.equal(app.window.getAccountInterviewLogs("acct_b").length, 1);
  });

  test("deleteInterviewLog: 指定したid・accountIdの面接履歴だけが削除される", async () => {
    var app = await loadApp({ fresh: true });
    var logA = { id: "log_a", accountId: "acct_1" };
    var logB = { id: "log_b", accountId: "acct_1" };
    app.window.saveInterviewLogs([logA, logB]);

    app.window.deleteInterviewLog("log_a", "acct_1");

    var remaining = app.window.loadInterviewLogs();
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, "log_b");
  });
});

describe("永続化: アカウント間のデータ分離（回帰テスト: 過去に発生したアカウント間データ漏洩の再発防止）", () => {
  test("getAccountCompanies: accountAとaccountBの企業データが互いに混ざらない", async () => {
    var app = await loadApp({ fresh: true });
    app.window.saveCompanies([
      { id: "company_a", accountId: "accountA", companyName: "A社" },
      { id: "company_b", accountId: "accountB", companyName: "B社" }
    ]);

    var companiesA = app.window.getAccountCompanies("accountA");
    var companiesB = app.window.getAccountCompanies("accountB");

    assert.equal(companiesA.length, 1);
    assert.equal(companiesA[0].id, "company_a");
    assert.equal(companiesA.some(function (c) { return c.accountId === "accountB"; }), false);

    assert.equal(companiesB.length, 1);
    assert.equal(companiesB[0].id, "company_b");
    assert.equal(companiesB.some(function (c) { return c.accountId === "accountA"; }), false);
  });

  test("getAccountEsEntries: accountAとaccountBのES回答データが互いに混ざらない", async () => {
    var app = await loadApp({ fresh: true });
    app.window.saveEsEntries([
      { id: "es_a", accountId: "accountA", companyId: "company_a", questionText: "AのES" },
      { id: "es_b", accountId: "accountB", companyId: "company_b", questionText: "BのES" }
    ]);

    var esA = app.window.getAccountEsEntries("accountA");
    var esB = app.window.getAccountEsEntries("accountB");

    assert.equal(esA.length, 1);
    assert.equal(esA[0].id, "es_a");
    assert.equal(esA.some(function (e) { return e.accountId === "accountB"; }), false);

    assert.equal(esB.length, 1);
    assert.equal(esB[0].id, "es_b");
    assert.equal(esB.some(function (e) { return e.accountId === "accountA"; }), false);
  });

  test("getAccountInterviewLogs: accountAとaccountBの面接履歴データが互いに混ざらない", async () => {
    var app = await loadApp({ fresh: true });
    app.window.saveInterviewLogs([
      { id: "log_a", accountId: "accountA" },
      { id: "log_b", accountId: "accountB" }
    ]);

    var logsA = app.window.getAccountInterviewLogs("accountA");
    var logsB = app.window.getAccountInterviewLogs("accountB");

    assert.equal(logsA.length, 1);
    assert.equal(logsA[0].id, "log_a");
    assert.equal(logsA.some(function (l) { return l.accountId === "accountB"; }), false);

    assert.equal(logsB.length, 1);
    assert.equal(logsB[0].id, "log_b");
    assert.equal(logsB.some(function (l) { return l.accountId === "accountA"; }), false);
  });
});

describe("isEsAnswerWithinLimit: 文字数制限の判定", () => {
  test("maxCharsがnull（無制限）のときは常にtrue", async () => {
    var app = await loadApp({ fresh: true });
    assert.equal(app.window.isEsAnswerWithinLimit("a".repeat(100000), null), true);
    assert.equal(app.window.isEsAnswerWithinLimit("", null), true);
  });

  test("maxCharsが0（制限なし扱い）のときは常にtrue", async () => {
    var app = await loadApp({ fresh: true });
    assert.equal(app.window.isEsAnswerWithinLimit("a".repeat(100000), 0), true);
    assert.equal(app.window.isEsAnswerWithinLimit("", 0), true);
  });

  test("maxCharsが正の数のとき、ちょうどの文字数はtrue、1文字超過はfalse", async () => {
    var app = await loadApp({ fresh: true });
    var exact = "a".repeat(10);
    var overByOne = "a".repeat(11);
    assert.equal(app.window.isEsAnswerWithinLimit(exact, 10), true);
    assert.equal(app.window.isEsAnswerWithinLimit(overByOne, 10), false);
  });
});

describe("normalizeCategory: カテゴリ値の正規化", () => {
  // script.js実装（1121行目付近）を確認したところ、normalizeCategoryは
  // エイリアス辞書（"self-pr"→"self_pr"、"general"→"default"、
  // "experience"→"student_life"、"stress"→"strength_weakness"）による変換のみを行い、
  // それ以外の文字列はエイリアス辞書に一致しない限りそのまま返す。
  // DEFAULT_SETTINGS.category（"self_pr"）へのフォールバックは、値がfalsy
  // （undefined/null/空文字）の場合にのみ発生する。
  test("既知のカテゴリ文字列（エイリアス辞書に無いもの）はそのまま返る", async () => {
    var app = await loadApp({ fresh: true });
    assert.equal(app.window.normalizeCategory("self_pr"), "self_pr");
    assert.equal(app.window.normalizeCategory("student_life"), "student_life");
  });

  test("エイリアス対象の文字列は正規化された値に変換される", async () => {
    var app = await loadApp({ fresh: true });
    assert.equal(app.window.normalizeCategory("general"), "default");
    assert.equal(app.window.normalizeCategory("self-pr"), "self_pr");
  });

  test("undefinedや空文字はデフォルト値（self_pr）にフォールバックする", async () => {
    var app = await loadApp({ fresh: true });
    assert.equal(app.window.normalizeCategory(undefined), "self_pr");
    assert.equal(app.window.normalizeCategory(""), "self_pr");
  });
});

describe("makeId: ID生成", () => {
  test("返り値が指定したprefixで始まる", async () => {
    var app = await loadApp({ fresh: true });
    var id = app.window.makeId("company");
    assert.equal(id.startsWith("company_"), true);
  });

  test("複数回呼び出すと異なるIDが返る（重複しない）", async () => {
    var app = await loadApp({ fresh: true });
    var ids = new Set();
    for (var i = 0; i < 50; i++) {
      ids.add(app.window.makeId("es"));
    }
    assert.equal(ids.size, 50);
  });
});

// Googleサインイン中（isCloudSignedIn()がtrue）は、保存・読込がlocalStorageではなく
// cloudState.<stateKey>（Firestoreへの書き込みをキューする経路）に切り替わる。
// cloudState.service.replaceCollection(...)は本物のFirestore呼び出しの代わりに
// フェイクのサービスオブジェクトで受け止め、正しいuid/collectionName/itemsで
// 呼ばれることだけを検証する（実際のFirestore通信はしない）。
describe("永続化: サインイン中はFirestore（cloudState）経路に切り替わる", () => {
  test("サインインしていない場合はlocalStorage経路のまま（cloudStateは更新されない）", async () => {
    var app = await loadApp({ fresh: true });
    var accounts = [{ id: "acct_1", displayName: "ローカル保存" }];
    app.window.saveAccounts(accounts);
    assert.deepEqual(app.window.loadAccounts(), accounts);
    assert.equal(app.window.cloudState.accounts, null);
  });

  test("サインイン中はsaveAccountsがcloudState.accountsを更新し、loadAccountsもそこから読む", async () => {
    var app = await loadApp({ fresh: true });
    app.window.cloudState.service = { replaceCollection: async () => {} };
    app.window.cloudState.user = { uid: "test-uid" };
    app.window.cloudState.ready = true;

    var accounts = [{ id: "acct_cloud", displayName: "クラウド保存" }];
    app.window.saveAccounts(accounts);

    assert.deepEqual(app.window.cloudState.accounts, accounts);
    assert.deepEqual(app.window.loadAccounts(), accounts);
    // localStorageには書き込まれていない（ローカル経路を通っていないことの確認）。
    assert.equal(app.localStorage.getItem("aiInterviewPrototype.accounts"), null);
  });

  test("サインイン中の保存は、デバウンス後にcloudState.service.replaceCollectionへ渡される", async () => {
    var app = await loadApp({ fresh: true });
    var calls = [];
    app.window.cloudState.service = {
      replaceCollection: async (uid, collectionName, items) => {
        calls.push({ uid, collectionName, items });
      }
    };
    app.window.cloudState.user = { uid: "test-uid" };
    app.window.cloudState.ready = true;

    var companies = [{ id: "company_cloud", accountId: "test-uid", companyName: "クラウド企業" }];
    app.window.saveCompanies(companies);

    // queueCloudCollectionSaveは250ms後にreplaceCollectionを呼ぶ設計のため待つ。
    await new Promise((resolve) => setTimeout(resolve, 400));

    assert.equal(calls.length, 1);
    assert.equal(calls[0].uid, "test-uid");
    assert.equal(calls[0].collectionName, "companies");
    assert.deepEqual(calls[0].items, companies);
  });
});
