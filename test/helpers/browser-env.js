// ai-interview-prototype/script.js はブラウザ専用のIIFEとして書かれており、
// window/document/localStorageをグローバルとして直接参照する（モジュールとしての
// import/exportは持たない）。このヘルパーは、Node上でそれらの最小限のモックを
// 用意してからscript.jsを読み込み、script.js側がwindowへ公開しているテスト用の
// 関数・appStateにアクセスできるようにする。

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SCRIPT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../ai-interview-prototype/script.js"
);

export function createMockStorage() {
  var store = new Map();
  return {
    getItem: function (key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem: function (key, value) {
      store.set(key, String(value));
    },
    removeItem: function (key) {
      store.delete(key);
    },
    clear: function () {
      store.clear();
    },
    key: function (index) {
      var keys = Array.from(store.keys());
      return index >= 0 && index < keys.length ? keys[index] : null;
    },
    get length() {
      return store.size;
    }
  };
}

function createMockElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    className: "",
    classList: {
      add: function () {},
      remove: function () {},
      toggle: function () {},
      contains: function () {
        return false;
      }
    },
    style: {},
    dataset: {},
    children: [],
    appendChild: function () {},
    removeChild: function () {},
    setAttribute: function () {},
    getAttribute: function () {
      return null;
    },
    addEventListener: function () {},
    removeEventListener: function () {},
    querySelector: function () {
      return null;
    },
    querySelectorAll: function () {
      return [];
    },
    focus: function () {},
    click: function () {}
  };
}

function createMockDocument() {
  return {
    readyState: "loading",
    body: createMockElement(),
    getElementById: function () {
      return null;
    },
    querySelector: function () {
      return null;
    },
    querySelectorAll: function () {
      return [];
    },
    createElement: function () {
      return createMockElement();
    },
    addEventListener: function () {},
    removeEventListener: function () {}
  };
}

var instanceCounter = 0;

// script.jsを読み込み、テストに必要な最小限のwindow/document/localStorageを用意する。
// script.js末尾の`window.readyState === "loading"`分岐により、init()（DOM全体を
// 触る初期化処理）は実行されずDOMContentLoadedへの登録だけで止まるため、
// pure関数・データ操作関数だけを安全に呼び出せる状態になる。
//
// options.fresh: true を渡すと、NodeのESMモジュールキャッシュを迂回して
// script.jsを再評価し、appStateを含めて完全に新しいインスタンスを作る
// （テスト間の状態共有を避けたい場合に使う）。省略時は同一プロセス内で
// 一度読み込んだインスタンスを使い回す（呼び出し側でlocalStorage.clear()等の
// リセットを行うこと）。
export async function loadApp(options) {
  var opts = options || {};
  var localStorage = createMockStorage();
  var document = createMockDocument();

  globalThis.window = globalThis;
  globalThis.document = document;
  globalThis.localStorage = localStorage;
  if (typeof globalThis.navigator === "undefined") {
    globalThis.navigator = { userAgent: "node-test" };
  }

  var specifier = opts.fresh
    ? pathToFileURL(SCRIPT_PATH).href + "?instance=" + instanceCounter++
    : pathToFileURL(SCRIPT_PATH).href;

  await import(specifier);

  return {
    window: globalThis.window,
    document: document,
    localStorage: localStorage
  };
}
