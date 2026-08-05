import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./helpers/browser-env.js";

test("script.js loads under Node and exposes test hooks", async () => {
  var app = await loadApp({ fresh: true });
  assert.equal(typeof app.window.countFillerWords, "function");
  assert.equal(typeof app.window.appState, "object");
});

test("countFillerWords counts unambiguous filler words", async () => {
  var app = await loadApp({ fresh: true });
  var result = app.window.countFillerWords("えーと、それでですね、えーと困りました");
  assert.equal(result.total, 2);
});

test("loadAccounts/saveAccounts round-trip through the mocked localStorage", async () => {
  var app = await loadApp({ fresh: true });
  assert.deepEqual(app.window.loadAccounts(), []);
  var account = { id: "acct_test1", displayName: "テストアカウント" };
  app.window.saveAccounts([account]);
  assert.deepEqual(app.window.loadAccounts(), [account]);
});

test("isEsAnswerWithinLimit respects maxChars", async () => {
  var app = await loadApp({ fresh: true });
  assert.equal(app.window.isEsAnswerWithinLimit("12345", 5), true);
  assert.equal(app.window.isEsAnswerWithinLimit("123456", 5), false);
  assert.equal(app.window.isEsAnswerWithinLimit("123456", null), true);
});
