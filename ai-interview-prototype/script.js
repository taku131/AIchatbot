(function () {
  "use strict";

  var STORAGE_KEY = "aiInterviewPrototype.logs";
  var ACCOUNT_STORAGE_KEY = "aiInterviewPrototype.accounts";
  var COMPANY_STORAGE_KEY = "aiInterviewPrototype.companies";
  var ES_STORAGE_KEY = "aiInterviewPrototype.esEntries";
  var ACTIVE_ACCOUNT_STORAGE_KEY = "aiInterviewPrototype.activeAccountId";

  var DEFAULT_SETTINGS = {
    company: "",
    role: "",
    interviewType: "first",
    targetType: "",
    category: "self_pr",
    interviewerType: "friendly",
    questionCount: 5,
    userProfile: ""
  };

  var EVALUATION_AXES = [
    "結論の明確さ",
    "論理性",
    "具体性",
    "一貫性",
    "企業理解",
    "職種理解",
    "自分の経験との接続",
    "深掘りへの耐性",
    "話の分かりやすさ",
    "改善余地"
  ];

  var questionBank = {
    self_pr: [
      "あなたの強みを、応募先でどのように活かせるかを含めて教えてください。",
      "これまで最も成果を出した経験について、背景と行動を具体的に説明してください。",
      "周囲からどのような人だと言われますか。その理由も含めて教えてください。",
      "あなたらしさが最も表れた経験を一つ挙げてください。"
    ],
    motivation: [
      "当社を志望する理由を、事業や職種との接点を含めて教えてください。",
      "この業界を選んだ理由と、その中で当社に関心を持った理由を教えてください。",
      "入社後に実現したいことを、具体的な役割と結び付けて説明してください。",
      "他社ではなく当社を選ぶ理由は何ですか。"
    ],
    student_life: [
      "学生時代に最も力を入れたことを教えてください。",
      "チームで取り組んだ経験と、その中でのあなたの役割を教えてください。",
      "困難に直面した経験と、そこから学んだことを説明してください。",
      "継続して取り組んできたことと、その成果を教えてください。"
    ],
    career: [
      "これまでの経験を踏まえ、今後どのようなキャリアを築きたいですか。",
      "希望職種で成果を出すために、今のあなたに足りない力は何だと思いますか。",
      "3年後にどのような状態になっていたいですか。",
      "仕事で大切にしたい価値観を教えてください。"
    ],
    weakness: [
      "あなたの弱みと、それを改善するために取り組んでいることを教えてください。",
      "失敗経験を一つ挙げ、原因と改善策を説明してください。",
      "苦手なタイプの人と協働する際、どのように対応しますか。",
      "最近受けた指摘やフィードバックから、何を改善しましたか。"
    ],
    strength_weakness: [
      "あなたの長所と短所を、それぞれ具体的な経験と合わせて説明してください。",
      "短所が出やすい場面と、それを補うために意識している行動を教えてください。",
      "周囲から評価される強みと、今後改善したい点を一つずつ教えてください。",
      "長所を応募先の仕事でどう活かし、短所をどう管理しますか。"
    ],
    research: [
      "研究テーマの概要を、専門外の面接官にも分かるように説明してください。",
      "なぜその研究テーマを選んだのか、背景と課題意識を教えてください。",
      "既存手法と比べて、あなたの研究の違いや工夫は何ですか。",
      "実験結果や考察から何が言えるのか、限界も含めて説明してください。"
    ],
    development: [
      "開発経験の中で、技術的に最も苦労した点と解決方法を教えてください。",
      "担当した機能、使用技術、あなたの役割を具体的に説明してください。",
      "設計や実装で工夫した点を、なぜその方法にしたのかを含めて説明してください。",
      "その開発経験を希望職種でどのように活かせますか。"
    ],
    team: [
      "チームで取り組んだ経験について、あなたの役割と貢献を教えてください。",
      "意見が割れた場面で、どのように合意形成しましたか。",
      "チームの成果を高めるために、自分から働きかけたことは何ですか。",
      "チーム経験から学んだことを、入社後どう活かしますか。"
    ],
    failure: [
      "失敗経験を一つ挙げ、原因、対応、学びを順番に説明してください。",
      "その失敗を繰り返さないために、今はどのような行動を取っていますか。",
      "失敗したとき、周囲にどのように共有し、立て直しましたか。",
      "その経験は、希望職種で働くうえでどのように活きますか。"
    ],
    reverse_question: [
      "面接官に確認したい逆質問を一つ挙げ、その意図も説明してください。",
      "企業理解を深めるために、どのような質問をしますか。",
      "希望職種で成果を出すために、入社前に確認したいことは何ですか。",
      "逆質問を通じて、自分の関心や強みをどう伝えますか。"
    ],
    default: [
      "自己紹介を1分程度でお願いします。",
      "あなたが面接で最も伝えたいことは何ですか。",
      "これまでの経験の中で、応募先に最も関連するものを教えてください。",
      "最後に、面接官へ特に伝えておきたいことはありますか。"
    ]
  };

  var appState = {
    settings: Object.assign({}, DEFAULT_SETTINGS),
    currentQuestion: "",
    questionIndex: 0,
    interviewLog: null,
    finished: false,
    selectedHistoryId: null,
    activeAccountId: null,
    selectedCompanyId: null,
    pendingSourceEsEntry: null
  };

  var voiceInputState = {
    recognition: null,
    isSupported: false,
    isListening: false,
    baseAnswer: "",
    finalTranscript: "",
    lastError: ""
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getValue(id, fallback) {
    var element = $(id);
    if (!element || typeof element.value === "undefined") {
      return fallback || "";
    }
    return String(element.value || "").trim();
  }

  function getRawValue(id, fallback) {
    var element = $(id);
    if (!element || typeof element.value === "undefined") {
      return fallback || "";
    }
    return String(element.value || "");
  }

  function setValue(id, value) {
    var element = $(id);
    if (element && typeof element.value !== "undefined") {
      element.value = value == null ? "" : String(value);
    }
  }

  function setText(id, text) {
    var element = $(id);
    if (element) {
      element.textContent = text == null ? "" : String(text);
    }
  }

  function clearElement(id) {
    var element = $(id);
    if (element) {
      element.textContent = "";
    }
  }

  function appendListItems(id, items) {
    var element = $(id);
    if (!element) {
      return;
    }
    element.textContent = "";
    (items || []).forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      element.appendChild(li);
    });
  }

  function on(id, eventName, handler) {
    var element = $(id);
    if (element && typeof element.addEventListener === "function") {
      element.addEventListener(eventName, handler);
    }
  }

  function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function getVoiceErrorMessage(errorName) {
    var messages = {
      "not-allowed": "マイクの使用が許可されていません。ブラウザの権限設定を確認してください。",
      "service-not-allowed": "音声認識サービスの使用が許可されていません。",
      "no-speech": "音声を検出できませんでした。もう一度お試しください。",
      "audio-capture": "マイクを利用できません。接続や入力デバイスを確認してください。",
      "network": "ネットワークエラーで音声認識を利用できませんでした。",
      "aborted": "音声入力を中断しました。"
    };
    return messages[errorName] || "音声入力でエラーが発生しました。もう一度お試しください。";
  }

  function joinVoiceText(baseText, transcript) {
    var safeBase = String(baseText || "");
    var safeTranscript = String(transcript || "").trim();
    if (!safeTranscript) {
      return safeBase;
    }
    if (!safeBase) {
      return safeTranscript;
    }
    return safeBase + (/[\s\n]$/.test(safeBase) ? "" : "\n") + safeTranscript;
  }

  function setAnswerInputFromVoice() {
    var answerInput = $("answerInput");
    if (!answerInput || typeof answerInput.value === "undefined") {
      return;
    }
    answerInput.value = joinVoiceText(voiceInputState.baseAnswer, voiceInputState.finalTranscript);
    if (typeof answerInput.dispatchEvent === "function") {
      answerInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function updateVoiceInputButtons() {
    var startButton = $("startVoiceInputBtn");
    var stopButton = $("stopVoiceInputBtn");
    if (startButton) {
      startButton.disabled = !voiceInputState.isSupported || voiceInputState.isListening;
    }
    if (stopButton) {
      stopButton.disabled = !voiceInputState.isSupported || !voiceInputState.isListening;
    }
  }

  function setVoiceUiState(state) {
    var panel = document.querySelector(".voice-input-panel");
    var status = $("voiceStatus");
    var preview = $("voiceTranscriptPreview");
    [panel, status, preview].forEach(function (element) {
      if (!element || !element.classList) {
        return;
      }
      element.classList.remove("is-listening", "is-error");
      if (state) {
        element.classList.add(state);
      }
    });
  }

  function handleVoiceResult(event) {
    var finalTranscript = "";
    var interimTranscript = "";
    var results = event && event.results ? event.results : [];

    for (var i = 0; i < results.length; i += 1) {
      var result = results[i];
      var transcript = result && result[0] ? result[0].transcript : "";
      if (result && result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    voiceInputState.finalTranscript = finalTranscript;
    setAnswerInputFromVoice();
    setText("voiceTranscriptPreview", interimTranscript.trim());
  }

  function createVoiceRecognition() {
    var Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      return null;
    }

    var recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
      voiceInputState.isListening = true;
      voiceInputState.lastError = "";
      setText("voiceStatus", "音声入力中です。話した内容を回答欄に反映します。");
      setVoiceUiState("is-listening");
      updateVoiceInputButtons();
    };

    recognition.onresult = handleVoiceResult;

    recognition.onerror = function (event) {
      voiceInputState.lastError = event && event.error ? event.error : "unknown";
      setText("voiceStatus", getVoiceErrorMessage(voiceInputState.lastError));
      voiceInputState.isListening = false;
      setVoiceUiState("is-error");
      updateVoiceInputButtons();
    };

    recognition.onend = function () {
      voiceInputState.isListening = false;
      setText("voiceTranscriptPreview", "");
      if (!voiceInputState.lastError) {
        setText("voiceStatus", "音声入力を停止しました。");
        setVoiceUiState("");
      }
      updateVoiceInputButtons();
    };

    return recognition;
  }

  function setupVoiceInput() {
    voiceInputState.isSupported = Boolean(getSpeechRecognitionConstructor());
    voiceInputState.recognition = voiceInputState.isSupported ? createVoiceRecognition() : null;

    if (!voiceInputState.isSupported) {
      setText("voiceStatus", "このブラウザは音声入力に対応していません。Chrome など Web Speech API 対応ブラウザをご利用ください。");
      setText("voiceTranscriptPreview", "");
      setVoiceUiState("is-error");
    } else {
      setText("voiceStatus", "音声入力を開始できます。");
      setVoiceUiState("");
    }
    updateVoiceInputButtons();
  }

  function startVoiceInput(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (!voiceInputState.isSupported || voiceInputState.isListening) {
      updateVoiceInputButtons();
      return;
    }
    if (!voiceInputState.recognition) {
      voiceInputState.recognition = createVoiceRecognition();
    }

    var answerInput = $("answerInput");
    voiceInputState.baseAnswer = answerInput && typeof answerInput.value === "string" ? answerInput.value : "";
    voiceInputState.finalTranscript = "";
    voiceInputState.lastError = "";
    setText("voiceTranscriptPreview", "");
    setText("voiceStatus", "音声入力を開始しています...");
    setVoiceUiState("is-listening");

    try {
      voiceInputState.recognition.start();
    } catch (error) {
      voiceInputState.lastError = error && error.name ? error.name : "unknown";
      voiceInputState.isListening = false;
      setText("voiceStatus", "音声入力を開始できませんでした。少し待ってから再試行してください。");
      setVoiceUiState("is-error");
      updateVoiceInputButtons();
    }
  }

  function stopVoiceInput(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (!voiceInputState.recognition || !voiceInputState.isListening) {
      voiceInputState.isListening = false;
      updateVoiceInputButtons();
      return;
    }
    setText("voiceStatus", "音声入力を停止しています...");
    voiceInputState.recognition.stop();
  }

  function showView(viewId) {
    var nextViewId = (!appState.activeAccountId && viewId !== "accountView") ? "accountView" : viewId;
    ["accountView", "workspaceView", "setupView", "interviewView", "feedbackView", "historyView"].forEach(function (id) {
      var element = $(id);
      if (element) {
        element.hidden = id !== nextViewId;
      }
    });
  }

  function loadCollection(key) {
    try {
      var raw = localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to load local collection:", key, error);
      return [];
    }
  }

  function saveCollection(key, items) {
    try {
      localStorage.setItem(key, JSON.stringify(items || []));
      return true;
    } catch (error) {
      console.warn("Failed to save local collection:", key, error);
      return false;
    }
  }

  function makeId(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function loadAccounts() {
    return loadCollection(ACCOUNT_STORAGE_KEY);
  }

  function saveAccounts(accounts) {
    return saveCollection(ACCOUNT_STORAGE_KEY, accounts);
  }

  function loadCompanies() {
    return loadCollection(COMPANY_STORAGE_KEY);
  }

  function saveCompanies(companies) {
    return saveCollection(COMPANY_STORAGE_KEY, companies);
  }

  function loadEsEntries() {
    return loadCollection(ES_STORAGE_KEY);
  }

  function saveEsEntries(entries) {
    return saveCollection(ES_STORAGE_KEY, entries);
  }

  function getActiveAccount() {
    var id = appState.activeAccountId;
    return loadAccounts().find(function (account) {
      return account.id === id;
    }) || null;
  }

  function getAccountCompanies(accountId) {
    return loadCompanies().filter(function (company) {
      return company.accountId === accountId;
    });
  }

  function getAccountEsEntries(accountId) {
    return loadEsEntries().filter(function (entry) {
      return entry.accountId === accountId;
    });
  }

  function getSelectedCompany() {
    var companyId = appState.selectedCompanyId;
    if (!companyId) {
      return null;
    }
    return findCompany(companyId, appState.activeAccountId);
  }

  function findCompany(companyId, accountId) {
    if (!companyId) {
      return null;
    }
    return loadCompanies().find(function (company) {
      return company.id === companyId && (!accountId || company.accountId === accountId);
    }) || null;
  }

  function getCompanyName(companyId, fallback) {
    var company = findCompany(companyId, appState.activeAccountId);
    return company ? company.companyName : fallback;
  }

  function applyCompanyToSetup(company) {
    if (!company) {
      return;
    }
    setValue("companyInput", company.companyName || "");
    setValue("roleInput", company.role || "");
  }

  function renderSourceEsPreview(source) {
    var preview = $("sourceEsPreview");
    if (!preview) {
      return;
    }
    var entry = source || appState.pendingSourceEsEntry;
    preview.hidden = !entry;
    if (!entry) {
      setText("sourceEsPreviewTitle", "使用するES");
      setText("sourceEsPreviewQuestion", "");
      setText("sourceEsPreviewAnswer", "");
      return;
    }
    setText("sourceEsPreviewTitle", formatCategoryLabel(entry.category) + " / " + (getCompanyName(entry.companyId, "企業未設定") || "企業未設定"));
    setText("sourceEsPreviewQuestion", "設問: " + (entry.questionText || "未入力"));
    setText("sourceEsPreviewAnswer", "回答: " + (entry.answerText || "未入力"));
  }

  function buildProfileWithSourceEs(entry) {
    var existingProfile = getValue("userProfileInput", "");
    var marker = "使用ES:";
    var baseProfile = existingProfile.split(marker)[0].trim();
    var parts = [];

    if (baseProfile) {
      parts.push(baseProfile);
    }
    parts.push([
      marker,
      "ES設問: " + (entry.questionText || ""),
      "ES回答: " + (entry.answerText || "")
    ].join("\n"));

    return parts.filter(Boolean).join("\n\n");
  }

  function rememberActiveAccount(accountId) {
    appState.activeAccountId = accountId || null;
    try {
      if (accountId) {
        localStorage.setItem(ACTIVE_ACCOUNT_STORAGE_KEY, accountId);
      } else {
        localStorage.removeItem(ACTIVE_ACCOUNT_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Failed to persist active account:", error);
    }
  }

  function renderAccounts() {
    var list = $("accountList");
    var accounts = loadAccounts().sort(function (a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    if (list) {
      list.textContent = "";
      if (!accounts.length) {
        var empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "作成済みアカウントがここに表示されます。";
        list.appendChild(empty);
      }
      accounts.forEach(function (account) {
        var item = document.createElement("div");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "account-item" + (account.id === appState.activeAccountId ? " is-selected" : "");
        button.dataset.accountId = account.id;
        button.dataset.action = "select-account";
        button.textContent = account.displayName + (account.email ? " / " + account.email : "");
        item.appendChild(button);
        list.appendChild(item);
      });
    }

    var accountView = $("accountView");
    if (accountView && !$("googleAccountNote")) {
      var note = document.createElement("p");
      note.id = "googleAccountNote";
      note.textContent = "Google連携は未実装です。このプロトタイプではローカル保存のみを使用します。";
      accountView.appendChild(note);
    }
  }

  function renderWorkspace() {
    var account = getActiveAccount();
    setText("activeAccountName", account ? account.displayName : "");
    renderCompanies();
    renderEsEntries();
    updateEsCharCount();
  }

  function renderCompanies() {
    var list = $("companyList");
    var accountId = appState.activeAccountId;
    var companies = accountId ? getAccountCompanies(accountId) : [];
    var selectedStillExists = companies.some(function (company) {
      return company.id === appState.selectedCompanyId;
    });

    if (!selectedStillExists) {
      appState.selectedCompanyId = companies.length ? companies[0].id : null;
    }

    if (list) {
      list.textContent = "";
      if (!companies.length) {
        var empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "企業を登録するとここに表示されます。";
        list.appendChild(empty);
      }
      companies.forEach(function (company) {
        var item = document.createElement("div");
        var button = document.createElement("button");
        var title = document.createElement("span");
        var meta = document.createElement("span");
        var notes = document.createElement("span");
        button.type = "button";
        button.className = "company-item" + (company.id === appState.selectedCompanyId ? " is-selected" : "");
        button.dataset.companyId = company.id;
        button.dataset.accountId = company.accountId;
        button.dataset.action = "select-company";
        title.className = "company-card-title";
        title.textContent = company.companyName || "企業名未設定";
        meta.className = "company-card-meta";
        meta.textContent = [company.role || "職種未設定", company.stage || "応募区分未設定"].join(" / ");
        notes.className = "company-card-notes";
        notes.textContent = company.notes || "企業メモなし";
        button.appendChild(title);
        button.appendChild(meta);
        button.appendChild(notes);
        item.appendChild(button);
        list.appendChild(item);
      });
    }

    var selected = getSelectedCompany();
    setText("selectedCompanyTitle", selected ? selected.companyName : "企業を選択してください");
    applyCompanyToSetup(selected);
  }

  function renderEsEntries() {
    var list = $("esEntryList");
    var accountId = appState.activeAccountId;
    var companyId = appState.selectedCompanyId;
    var entries = accountId ? getAccountEsEntries(accountId).filter(function (entry) {
      return !companyId || entry.companyId === companyId;
    }) : [];

    if (!list) {
      return;
    }

    list.textContent = "";
    if (!entries.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = companyId ? "この企業のES設問はまだ保存されていません。" : "企業を選択し、ES設問を保存するとここに表示されます。";
      list.appendChild(empty);
      return;
    }
    entries.forEach(function (entry) {
      var item = document.createElement("article");
      item.className = "es-entry-item";
      item.dataset.esEntryId = entry.id;
      item.dataset.companyId = entry.companyId;
      item.dataset.accountId = entry.accountId;

      var title = document.createElement("p");
      title.className = "item-title";
      title.textContent = entry.questionText || "ES設問未入力";
      item.appendChild(title);

      var meta = document.createElement("p");
      meta.className = "item-meta";
      meta.textContent = [
        formatCategoryLabel(entry.category),
        formatStatusLabel(entry.status),
        String(entry.answerText || "").length + (entry.maxChars ? " / " + entry.maxChars : "") + "文字"
      ].filter(Boolean).join(" / ");
      item.appendChild(meta);

      var useButton = document.createElement("button");
      useButton.type = "button";
      useButton.className = "button button-secondary button-small";
      useButton.dataset.esEntryId = entry.id;
      useButton.dataset.companyId = entry.companyId;
      useButton.dataset.accountId = entry.accountId;
      useButton.dataset.action = "use-es-entry";
      useButton.textContent = "このESで面接練習";
      item.appendChild(useButton);

      list.appendChild(item);
    });
  }

  function createAccount(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    var displayName = getValue("accountNameInput", "");
    var email = getValue("accountEmailInput", "");
    if (!displayName) {
      setText("activeAccountName", "表示名を入力してください");
      return;
    }

    var accounts = loadAccounts();
    var timestamp = nowIso();
    var account = {
      id: makeId("acct"),
      displayName: displayName,
      email: email,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    accounts.unshift(account);
    saveAccounts(accounts);
    setValue("accountNameInput", "");
    setValue("accountEmailInput", "");
    selectAccount(account.id);
  }

  function selectAccount(accountId) {
    var account = loadAccounts().find(function (item) {
      return item.id === accountId;
    });
    if (!account) {
      rememberActiveAccount(null);
      appState.selectedCompanyId = null;
      appState.pendingSourceEsEntry = null;
      renderSourceEsPreview(null);
      renderAccounts();
      renderWorkspace();
      showView("accountView");
      return;
    }

    rememberActiveAccount(account.id);
    var companies = getAccountCompanies(account.id);
    appState.selectedCompanyId = companies.length ? companies[0].id : null;
    appState.pendingSourceEsEntry = null;
    renderSourceEsPreview(null);
    renderAccounts();
    renderWorkspace();
    showView("workspaceView");
  }

  function saveCompanyFromForm(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (!appState.activeAccountId) {
      return;
    }

    var companyName = getValue("companyNameInput", "");
    if (!companyName) {
      setText("selectedCompanyTitle", "企業名を入力してください");
      return;
    }

    var timestamp = nowIso();
    var company = {
      id: makeId("company"),
      accountId: appState.activeAccountId,
      companyName: companyName,
      role: getValue("companyRoleInput", ""),
      stage: getValue("companyStageInput", ""),
      notes: getValue("companyNotesInput", ""),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    var companies = loadCompanies();
    companies.unshift(company);
    saveCompanies(companies);
    appState.selectedCompanyId = company.id;
    applyCompanyToSetup(company);
    setValue("companyNameInput", "");
    setValue("companyRoleInput", "");
    setValue("companyStageInput", "");
    setValue("companyNotesInput", "");
    renderWorkspace();
  }

  function saveEsFromForm(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    var accountId = appState.activeAccountId;
    var companyId = appState.selectedCompanyId;
    if (!accountId || !companyId) {
      setText("esCharCount", "先にアカウントと企業を選択してください");
      return;
    }

    var questionText = getValue("esQuestionInput", "");
    if (!questionText) {
      setText("esCharCount", "設問を入力してください");
      return;
    }

    var maxChars = parseInt(getValue("esMaxCharsInput", ""), 10);
    var timestamp = nowIso();
    var entry = {
      id: makeId("es"),
      accountId: accountId,
      companyId: companyId,
      questionText: questionText,
      answerText: getRawValue("esAnswerInput", ""),
      maxChars: Number.isFinite(maxChars) && maxChars > 0 ? maxChars : null,
      category: normalizeCategory(getValue("esCategorySelect", DEFAULT_SETTINGS.category)),
      status: getValue("esStatusSelect", "draft") || "draft",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    var entries = loadEsEntries();
    entries.unshift(entry);
    saveEsEntries(entries);
    setValue("esQuestionInput", "");
    setValue("esAnswerInput", "");
    updateEsCharCount();
    renderEsEntries();
  }

  function updateEsCharCount() {
    var answer = getRawValue("esAnswerInput", "");
    var maxChars = parseInt(getValue("esMaxCharsInput", ""), 10);
    var hasMax = Number.isFinite(maxChars) && maxChars > 0;
    var overLimit = hasMax && answer.length > maxChars;
    var text = hasMax ? answer.length + " / " + maxChars + "文字" : answer.length + "文字";
    var counter = $("esCharCount");
    var answerInput = $("esAnswerInput");
    var saveButton = $("saveEsBtn");

    if (counter) {
      counter.textContent = overLimit ? text + "（上限超過）" : text;
      counter.classList.toggle("is-over-limit", overLimit);
    }
    if (answerInput && answerInput.classList) {
      answerInput.classList.toggle("is-over-limit", overLimit);
    }
    if (saveButton && saveButton.classList) {
      saveButton.classList.toggle("has-over-limit", overLimit);
    }
  }

  function selectCompany(companyId) {
    var company = loadCompanies().find(function (item) {
      return item.id === companyId && item.accountId === appState.activeAccountId;
    });
    if (!company) {
      return;
    }
    appState.selectedCompanyId = company.id;
    appState.pendingSourceEsEntry = null;
    applyCompanyToSetup(company);
    renderSourceEsPreview(null);
    renderCompanies();
    renderEsEntries();
  }

  function findEsEntry(entryId) {
    return loadEsEntries().find(function (entry) {
      return entry.id === entryId && entry.accountId === appState.activeAccountId;
    }) || null;
  }

  function summarizeSourceEsEntry(entry) {
    if (!entry) {
      return null;
    }
    return {
      id: entry.id,
      accountId: entry.accountId,
      companyId: entry.companyId,
      questionText: entry.questionText,
      answerText: entry.answerText,
      maxChars: entry.maxChars,
      category: entry.category,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    };
  }

  function applyEsEntryToSettings(entry) {
    var company = findCompany(entry.companyId, entry.accountId) || {};
    if (company.id) {
      appState.selectedCompanyId = company.id;
    }

    applyCompanyToSetup(company);
    setValue("categorySelect", normalizeCategory(entry.category || DEFAULT_SETTINGS.category));
    setValue("userProfileInput", buildProfileWithSourceEs(entry));

    appState.pendingSourceEsEntry = summarizeSourceEsEntry(entry);
    renderCompanies();
    renderEsEntries();
    renderSourceEsPreview(appState.pendingSourceEsEntry);
    showView("setupView");
  }

  function useEsEntry(entryId) {
    var entry = findEsEntry(entryId);
    if (!entry) {
      return;
    }
    applyEsEntryToSettings(entry);
  }

  function normalizeChoice(value, fallback) {
    return value || fallback;
  }

  function normalizeCategory(value) {
    var aliases = {
      "self-pr": "self_pr",
      general: "default",
      experience: "student_life",
      stress: "weakness"
    };
    return aliases[value] || value || DEFAULT_SETTINGS.category;
  }

  function formatCategoryLabel(value) {
    var labels = {
      self_pr: "自己PR",
      motivation: "志望動機",
      student_life: "ガクチカ",
      strength_weakness: "長所・短所",
      research: "研究内容",
      development: "開発経験",
      team: "チーム経験",
      failure: "失敗経験",
      career: "キャリア",
      reverse_question: "逆質問",
      default: "その他"
    };
    return labels[normalizeCategory(value)] || "その他";
  }

  function formatStatusLabel(value) {
    var labels = {
      draft: "下書き",
      reviewing: "推敲中",
      submitted: "提出済み",
      practice: "練習対象"
    };
    return labels[value] || "下書き";
  }

  function formatInterviewTypeLabel(value) {
    var labels = {
      first: "一次面接",
      final: "最終面接",
      deep_dive: "深掘り面接",
      technical: "技術面接",
      research: "研究面接",
      intern: "インターン面接",
      hr: "人事面接"
    };
    return labels[value] || value || "面接タイプ未設定";
  }

  function getLogCompanyName(log) {
    var settings = log.settings || {};
    var company = findCompany(log.companyId || settings.companyId, log.accountId || settings.accountId);
    return company ? company.companyName : (settings.company || "企業未設定");
  }

  function getLogSourceEsEntry(log) {
    var settings = log.settings || {};
    if (settings.sourceEsEntry) {
      return settings.sourceEsEntry;
    }
    var entryId = log.esEntryId || settings.esEntryId;
    if (!entryId) {
      return null;
    }
    return loadEsEntries().find(function (entry) {
      return entry.id === entryId;
    }) || null;
  }

  function getLogEntries(log) {
    if (log && Array.isArray(log.entries) && log.entries.length) {
      return log.entries;
    }
    var messages = log && Array.isArray(log.messages) ? log.messages : [];
    var evaluations = log && Array.isArray(log.evaluations) ? log.evaluations : [];
    return messages.map(function (message) {
      var evaluation = evaluations.find(function (item) {
        return item.messageId === message.id || item.questionNumber === message.questionNumber;
      }) || null;
      return {
        id: message.id,
        questionNumber: message.questionNumber,
        question: message.question,
        answer: message.answer,
        evaluation: evaluation
      };
    });
  }

  function readSettings() {
    var count = parseInt(getValue("questionCountSelect", DEFAULT_SETTINGS.questionCount), 10);
    var source = appState.pendingSourceEsEntry;
    var selectedCompany = getSelectedCompany();
    if (!Number.isFinite(count) || count < 1) {
      count = DEFAULT_SETTINGS.questionCount;
    }

    return {
      accountId: appState.activeAccountId || null,
      companyId: source && source.companyId ? source.companyId : (selectedCompany ? selectedCompany.id : null),
      esEntryId: source && source.id ? source.id : null,
      company: getValue("companyInput", DEFAULT_SETTINGS.company),
      role: getValue("roleInput", DEFAULT_SETTINGS.role),
      interviewType: normalizeChoice(getValue("interviewTypeSelect", DEFAULT_SETTINGS.interviewType), DEFAULT_SETTINGS.interviewType),
      targetType: getValue("targetTypeSelect", DEFAULT_SETTINGS.targetType),
      category: normalizeCategory(getValue("categorySelect", DEFAULT_SETTINGS.category)),
      interviewerType: normalizeChoice(getValue("interviewerTypeSelect", DEFAULT_SETTINGS.interviewerType), DEFAULT_SETTINGS.interviewerType),
      questionCount: count,
      userProfile: getValue("userProfileInput", DEFAULT_SETTINGS.userProfile),
      sourceEsEntry: source ? summarizeSourceEsEntry(source) : null
    };
  }

  function pickFrom(items, seed) {
    if (!items || items.length === 0) {
      return "";
    }
    return items[Math.abs(seed) % items.length];
  }

  function textSeed(text) {
    var seed = 0;
    String(text || "").split("").forEach(function (char) {
      seed += char.charCodeAt(0);
    });
    return seed;
  }

  function buildContextPrefix(settings) {
    var parts = [];
    if (settings.company) {
      parts.push(settings.company);
    }
    if (settings.role) {
      parts.push(settings.role);
    }
    return parts.length ? "【" + parts.join(" / ") + "】" : "";
  }

  function makeQuestionSpecific(question, settings) {
    var prefix = buildContextPrefix(settings);
    var type = String(settings.interviewType || "");
    var interviewer = String(settings.interviewerType || "");

    if (type.indexOf("final") !== -1 || type.indexOf("executive") !== -1 || type.indexOf("役員") !== -1) {
      question += " 経営視点や入社後の貢献も含めて答えてください。";
    } else if (type.indexOf("technical") !== -1 || type.indexOf("職種") !== -1 || type.indexOf("技術") !== -1) {
      question += " 職種に必要なスキルや実務での再現性も含めて答えてください。";
    } else if (type.indexOf("research") !== -1 || type.indexOf("研究") !== -1) {
      question += " 研究背景、手法、結果、限界を分けて答えてください。";
    } else if (type.indexOf("deep_dive") !== -1 || type.indexOf("深掘") !== -1) {
      question += " 面接官が追加で確認できるよう、判断理由と根拠を明確にしてください。";
    } else if (type.indexOf("intern") !== -1) {
      question += " インターンで学びたいことや挑戦したいことも含めて答えてください。";
    } else if (type.indexOf("hr") !== -1 || type.indexOf("人事") !== -1) {
      question += " 人柄、価値観、周囲との関わり方も含めて答えてください。";
    } else if (type.indexOf("group") !== -1 || type.indexOf("集団") !== -1) {
      question += " 簡潔さを意識して、要点を絞って答えてください。";
    }

    if (interviewer.indexOf("strict") !== -1 || interviewer.indexOf("圧迫") !== -1) {
      question += " 具体的な根拠が弱い場合は追加で確認します。";
    } else if (interviewer.indexOf("deep_dive") !== -1 || interviewer.indexOf("深掘") !== -1) {
      question += " 回答後に理由、再現性、別の選択肢を深掘りします。";
    } else if (interviewer.indexOf("technical") !== -1 || interviewer.indexOf("技術") !== -1) {
      question += " 技術選定、設計判断、再現性を重視して確認します。";
    } else if (interviewer.indexOf("research") !== -1 || interviewer.indexOf("研究") !== -1) {
      question += " 研究の新規性、妥当性、考察を重視して確認します。";
    } else if (interviewer.indexOf("coach") !== -1) {
      question += " 回答後に改善しやすい観点も示します。";
    } else if (interviewer.indexOf("friendly") !== -1 || interviewer.indexOf("優しい") !== -1) {
      question += " 話しやすい順番で構いません。";
    }

    return prefix ? prefix + " " + question : question;
  }

  function generateQuestion(settings) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var category = normalizeCategory(safeSettings.category || "default");
    var pool = questionBank[category] || questionBank.default;
    var askedCount = Number.isFinite(safeSettings._askedCount)
      ? safeSettings._askedCount
      : appState.interviewLog && appState.interviewLog.entries
        ? appState.interviewLog.entries.length
        : 0;
    if (askedCount === 0 && safeSettings.sourceEsEntry) {
      var source = safeSettings.sourceEsEntry;
      var esContext = [
        source.questionText ? "ES設問「" + source.questionText + "」" : "",
        source.answerText ? "ES回答の要点「" + String(source.answerText).slice(0, 180) + "」" : ""
      ].filter(Boolean).join(" / ");
      if (esContext) {
        return makeQuestionSpecific(esContext + "を踏まえて、まずこのESで伝えた経験を面接で説明してください。ESの丸読みではなく、背景、あなたの役割、行動、結果を自然に補足してください。", safeSettings);
      }
    }
    var seed = textSeed([
      safeSettings.company,
      safeSettings.role,
      safeSettings.interviewType,
      safeSettings.category,
      safeSettings.interviewerType,
      askedCount
    ].join("|"));
    return makeQuestionSpecific(pickFrom(pool, seed + askedCount), safeSettings);
  }

  function scoreAnswer(answer, settings) {
    var words = String(answer || "").replace(/\s+/g, "");
    var length = words.length;
    var hasConclusion = /(結論|理由|まず|最初に|私の強み|志望理由|一つ目|第一に)/.test(answer);
    var hasSpecifics = /(\d|年|月|人|%|％|件|回|社|チーム|プロジェクト|売上|改善|達成)/.test(answer);
    var hasCompany = settings.company && answer.indexOf(settings.company) !== -1;
    var hasRole = settings.role && answer.indexOf(settings.role) !== -1;
    var hasReflection = /(学び|改善|次|今後|課題|反省|活か)/.test(answer);

    var base = 45;
    base += Math.min(18, Math.floor(length / 18));
    base += hasConclusion ? 8 : -4;
    base += hasSpecifics ? 12 : -6;
    base += hasCompany ? 6 : 0;
    base += hasRole ? 6 : 0;
    base += hasReflection ? 8 : 0;
    base -= length < 40 ? 12 : 0;
    base -= length > 700 ? 5 : 0;

    return Math.max(20, Math.min(95, base));
  }

  function axisScores(score, answer, settings) {
    var hasSpecifics = /(\d|年|月|人|%|％|件|回|プロジェクト|成果|改善)/.test(answer);
    var hasCompany = settings.company && answer.indexOf(settings.company) !== -1;
    var hasRole = settings.role && answer.indexOf(settings.role) !== -1;
    var hasExperience = /(経験|取り組|担当|役割|行動|実施|挑戦)/.test(answer);
    var hasConclusion = /(結論|理由|まず|強み|志望)/.test(answer);

    var base = Math.round(score / 10);
    return {
      "結論の明確さ": clampAxis(base + (hasConclusion ? 1 : -1)),
      "論理性": clampAxis(base),
      "具体性": clampAxis(base + (hasSpecifics ? 1 : -2)),
      "一貫性": clampAxis(base),
      "企業理解": clampAxis(base + (hasCompany ? 1 : -1)),
      "職種理解": clampAxis(base + (hasRole ? 1 : -1)),
      "自分の経験との接続": clampAxis(base + (hasExperience ? 1 : -1)),
      "深掘りへの耐性": clampAxis(base + (String(answer || "").length > 120 ? 1 : -1)),
      "話の分かりやすさ": clampAxis(base + (String(answer || "").length < 550 ? 1 : -1)),
      "改善余地": clampAxis(11 - base)
    };
  }

  function clampAxis(value) {
    return Math.max(1, Math.min(10, value));
  }

  function generateFollowUpQuestion(answer, settings) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var safeAnswer = String(answer || "");

    if (safeAnswer.length < 50) {
      return "もう少し具体的に、状況・あなたの行動・結果の順で説明できますか。";
    }
    if (!/(\d|年|月|人|%|％|件|回)/.test(safeAnswer)) {
      return "その成果や規模を、数字や比較で説明するとどうなりますか。";
    }
    if (safeSettings.company && safeAnswer.indexOf(safeSettings.company) === -1) {
      return safeSettings.company + "で働く前提では、その経験をどのように活かせますか。";
    }
    if (safeSettings.role && safeAnswer.indexOf(safeSettings.role) === -1) {
      return safeSettings.role + "の仕事に直結する学びは何ですか。";
    }
    if (!/(なぜ|理由|背景|課題|目的)/.test(safeAnswer)) {
      return "その行動を選んだ理由を、他の選択肢と比較して説明できますか。";
    }
    return "面接官がさらに確認するとしたら、この経験の再現性をどう説明しますか。";
  }

  function buildRevisedAnswerExample(question, answer, settings) {
    var company = settings.company || "応募先企業";
    var role = settings.role || "希望職種";
    var source = String(answer || "").slice(0, 80);
    return [
      "結論から申し上げると、私が伝えたい強みは課題を整理し、周囲を巻き込みながら改善まで進める力です。",
      "具体的には、" + (source || "過去の取り組み") + "という経験で、状況を分析し、優先順位を決めて行動しました。",
      "その結果として得た学びを、" + company + "の" + role + "でも再現し、成果につなげたいと考えています。"
    ].join("");
  }

  function evaluateAnswer(question, answer, settings) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var safeAnswer = String(answer || "").trim();
    var score = scoreAnswer(safeAnswer, safeSettings);
    var axes = axisScores(score, safeAnswer, safeSettings);
    var followUp = generateFollowUpQuestion(safeAnswer, safeSettings);
    var nextQuestion = generateQuestion(Object.assign({}, safeSettings, {
      _askedCount: appState.interviewLog && appState.interviewLog.entries
        ? appState.interviewLog.entries.length + 1
        : 1
    }));
    var goodPoints = [];
    var improvements = [];
    var issues = [];

    if (axes["結論の明確さ"] >= 7) {
      goodPoints.push("回答の主張が比較的早い段階で示されています。");
    } else {
      improvements.push("冒頭で結論を一文で言い切ると、回答全体が伝わりやすくなります。");
      issues.push("結論が後半まで見えにくく、面接官が要点をつかみにくい可能性があります。");
    }

    if (axes["具体性"] >= 7) {
      goodPoints.push("経験や成果に具体性があり、内容をイメージしやすいです。");
    } else {
      improvements.push("数字、期間、人数、成果指標を一つ入れると説得力が上がります。");
      issues.push("抽象表現が多く、実際の行動や成果が伝わりにくいです。");
    }

    if (axes["企業理解"] >= 7 || axes["職種理解"] >= 7) {
      goodPoints.push("応募先や職種との接続が意識されています。");
    } else {
      improvements.push("企業の事業、職種で求められる力、自分の経験の接点を明示してください。");
    }

    if (safeAnswer.length >= 100 && safeAnswer.length <= 450) {
      goodPoints.push("回答量は面接で扱いやすい長さです。");
    } else if (safeAnswer.length < 100) {
      improvements.push("回答が短めです。状況、行動、結果、学びのうち不足している要素を補ってください。");
    } else {
      improvements.push("回答が長めです。結論、根拠、応募先での活かし方に絞ると良くなります。");
    }

    return {
      question: question,
      answer: safeAnswer,
      score: score,
      axisScores: axes,
      summary: "総合評価は" + score + "点です。結論、具体性、応募先との接続を中心に評価しました。",
      goodPoints: goodPoints,
      improvements: improvements,
      issues: issues,
      deepDiveQuestion: followUp,
      direction: "結論を先に置き、根拠となる経験を数字や役割で補強し、最後に応募先での再現性へつなげてください。",
      revisedAnswerExample: buildRevisedAnswerExample(question, safeAnswer, safeSettings),
      nextQuestion: nextQuestion,
      createdAt: new Date().toISOString()
    };
  }

  function generateFinalFeedback(interviewLog) {
    var entries = interviewLog && Array.isArray(interviewLog.entries) ? interviewLog.entries : [];
    var total = entries.reduce(function (sum, entry) {
      return sum + (entry.evaluation ? entry.evaluation.score : 0);
    }, 0);
    var average = entries.length ? Math.round(total / entries.length) : 0;
    var breakdown = {};

    EVALUATION_AXES.forEach(function (axis) {
      var axisTotal = entries.reduce(function (sum, entry) {
        var scores = entry.evaluation && entry.evaluation.axisScores ? entry.evaluation.axisScores : {};
        return sum + (scores[axis] || 0);
      }, 0);
      breakdown[axis] = entries.length ? Math.round((axisTotal / entries.length) * 10) / 10 : 0;
    });

    var goodPoints = unique(entries.flatMap(function (entry) {
      return entry.evaluation ? entry.evaluation.goodPoints : [];
    })).slice(0, 5);
    var improvements = unique(entries.flatMap(function (entry) {
      return entry.evaluation ? entry.evaluation.improvements : [];
    })).slice(0, 5);
    var deepDives = entries.map(function (entry) {
      return entry.evaluation ? entry.evaluation.deepDiveQuestion : "";
    }).filter(Boolean).slice(0, 5);

    return {
      finalScore: average,
      scoreBreakdown: breakdown,
      goodPoints: goodPoints.length ? goodPoints : ["回答を提出し、面接練習のログを残せています。"],
      improvements: improvements.length ? improvements : ["応募先との接続をさらに具体化すると、より強い回答になります。"],
      deepDiveQuestions: deepDives,
      revisionDirection: "全回答で「結論、背景、具体行動、成果、応募先での活かし方」の順を安定させてください。特に企業理解と職種理解は、各回答の最後に一文で接続すると改善しやすいです。",
      nextPracticeList: [
        "各回答の冒頭に結論を一文で置く練習をする",
        "経験ごとに数字、期間、役割、成果を一つずつ整理する",
        "応募先企業と希望職種で求められる力を3点に絞って言語化する",
        "深掘り質問に対して、理由と再現性を30秒で答える"
      ],
      generatedAt: new Date().toISOString()
    };
  }

  function unique(items) {
    return (items || []).filter(function (item, index, array) {
      return item && array.indexOf(item) === index;
    });
  }

  function saveInterviewLog(log) {
    var logs = loadInterviewLogs();
    var settings = log.settings || {};
    var copy = Object.assign({}, log, {
      id: log.id || makeId("session"),
      accountId: log.accountId || settings.accountId || appState.activeAccountId || null,
      companyId: log.companyId || settings.companyId || null,
      esEntryId: log.esEntryId || settings.esEntryId || (settings.sourceEsEntry ? settings.sourceEsEntry.id : null),
      messages: Array.isArray(log.messages) ? log.messages : [],
      evaluations: Array.isArray(log.evaluations) ? log.evaluations : [],
      savedAt: new Date().toISOString()
    });
    var existingIndex = logs.findIndex(function (item) {
      return item.id === copy.id;
    });
    if (existingIndex >= 0) {
      logs[existingIndex] = copy;
    } else {
      logs.unshift(copy);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.warn("面接ログを保存できませんでした。", error);
    }
    return copy;
  }

  function loadInterviewLogs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("面接ログを読み込めませんでした。", error);
      return [];
    }
  }

  function clearInterviewLogs() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("面接ログを削除できませんでした。", error);
    }
  }

  function deleteInterviewLog(id) {
    if (!id) {
      return;
    }
    var nextLogs = loadInterviewLogs().filter(function (log) {
      return log.id !== id;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLogs));
    } catch (error) {
      console.warn("面接ログを削除できませんでした。", error);
    }
  }

  function startInterview(sourceEsEntry) {
    if (sourceEsEntry && typeof sourceEsEntry.preventDefault === "function") {
      sourceEsEntry = null;
    }
    var settings = readSettings();
    var source = sourceEsEntry || appState.pendingSourceEsEntry;
    if (source) {
      settings.sourceEsEntry = summarizeSourceEsEntry(source);
      settings.companyId = settings.sourceEsEntry.companyId;
      settings.esEntryId = settings.sourceEsEntry.id;
    }
    appState.pendingSourceEsEntry = null;
    renderSourceEsPreview(null);
    appState.settings = settings;
    appState.questionIndex = 0;
    appState.finished = false;
    appState.interviewLog = {
      id: makeId("session"),
      accountId: settings.accountId || appState.activeAccountId || null,
      companyId: settings.companyId || null,
      esEntryId: settings.esEntryId || null,
      settings: settings,
      messages: [],
      evaluations: [],
      entries: [],
      startedAt: new Date().toISOString(),
      finalFeedback: null
    };
    appState.currentQuestion = generateQuestion(settings);
    setText("currentQuestion", appState.currentQuestion);
    setText("feedbackSummary", "");
    setText("followUpQuestion", "");
    setText("progressText", "1 / " + settings.questionCount);
    clearElement("chatTimeline");
    var answerInput = $("answerInput");
    if (answerInput) {
      answerInput.value = "";
      answerInput.focus();
    }
    showView("interviewView");
  }

  function submitAnswer() {
    if (!appState.interviewLog || appState.finished) {
      return;
    }

    var answerInput = $("answerInput");
    var answer = answerInput && typeof answerInput.value === "string" ? answerInput.value.trim() : "";
    if (!answer) {
      setText("feedbackSummary", "回答を入力してから送信してください。");
      return;
    }

    var evaluation = evaluateAnswer(appState.currentQuestion, answer, appState.settings);
    var message = {
      id: makeId("msg"),
      sessionId: appState.interviewLog.id,
      questionNumber: appState.questionIndex + 1,
      question: appState.currentQuestion,
      answer: answer,
      createdAt: new Date().toISOString()
    };
    var evaluationRecord = Object.assign({}, evaluation, {
      id: makeId("eval"),
      sessionId: appState.interviewLog.id,
      messageId: message.id,
      questionNumber: message.questionNumber
    });

    appState.interviewLog.messages.push(message);
    appState.interviewLog.evaluations.push(evaluationRecord);
    appState.interviewLog.entries.push({
      id: message.id,
      evaluationId: evaluationRecord.id,
      questionNumber: appState.questionIndex + 1,
      question: appState.currentQuestion,
      answer: answer,
      evaluation: evaluationRecord
    });
    appState.questionIndex += 1;

    renderImmediateFeedback(evaluation);
    appendTimelineEntry(appState.currentQuestion, answer, evaluation);

    if (answerInput) {
      answerInput.value = "";
    }

    if (appState.questionIndex >= appState.settings.questionCount) {
      finishInterview();
      return;
    }

    appState.currentQuestion = evaluation.nextQuestion || generateQuestion(appState.settings);
    setText("currentQuestion", appState.currentQuestion);
    setText("progressText", (appState.questionIndex + 1) + " / " + appState.settings.questionCount);
  }

  function renderImmediateFeedback(evaluation) {
    setText("feedbackSummary", evaluation.summary + " 改善方針: " + evaluation.direction);
    setText("followUpQuestion", evaluation.deepDiveQuestion);
  }

  function appendTimelineEntry(question, answer, evaluation) {
    var timeline = $("chatTimeline");
    if (!timeline) {
      return;
    }

    var item = document.createElement("article");
    item.className = "timeline-item";

    var questionEl = document.createElement("p");
    questionEl.textContent = "Q. " + question;
    item.appendChild(questionEl);

    var answerEl = document.createElement("p");
    answerEl.textContent = "A. " + answer;
    item.appendChild(answerEl);

    var scoreEl = document.createElement("p");
    scoreEl.textContent = "評価: " + evaluation.score + "点 / 深掘り: " + evaluation.deepDiveQuestion;
    item.appendChild(scoreEl);

    timeline.appendChild(item);
  }

  function finishInterview() {
    if (!appState.interviewLog || appState.finished) {
      return;
    }

    appState.finished = true;
    appState.interviewLog.finishedAt = new Date().toISOString();
    appState.interviewLog.finalFeedback = generateFinalFeedback(appState.interviewLog);
    appState.interviewLog = saveInterviewLog(appState.interviewLog);
    renderFinalFeedback(appState.interviewLog.finalFeedback);
    showView("feedbackView");
  }

  function renderFinalFeedback(feedback) {
    if (!feedback) {
      return;
    }

    setText("finalScore", feedback.finalScore + "点");
    renderScoreBreakdown(feedback.scoreBreakdown);
    appendListItems("goodPointsList", feedback.goodPoints);
    appendListItems("improvementList", feedback.improvements);
    appendListItems("deepDiveList", feedback.deepDiveQuestions);
    setText("revisionDirection", feedback.revisionDirection);
    appendListItems("nextPracticeList", feedback.nextPracticeList);
  }

  function renderScoreBreakdown(scoreBreakdown) {
    var element = $("scoreBreakdown");
    if (!element) {
      return;
    }
    element.textContent = "";
    Object.keys(scoreBreakdown || {}).forEach(function (axis) {
      var row = document.createElement("div");
      row.textContent = axis + ": " + scoreBreakdown[axis] + " / 10";
      element.appendChild(row);
    });
  }

  function renderHistory() {
    var logs = loadInterviewLogs();
    var list = $("historyList");
    var detail = $("historyDetail");
    appState.selectedHistoryId = null;

    if (list) {
      list.textContent = "";
      if (!logs.length) {
        var empty = document.createElement("p");
        empty.textContent = "保存された面接ログはありません。";
        list.appendChild(empty);
      }
      logs.forEach(function (log) {
        var button = document.createElement("button");
        var settings = log.settings || {};
        var score = log.finalFeedback ? log.finalFeedback.finalScore + "点" : "未評価";
        var title = document.createElement("span");
        var meta = document.createElement("span");
        button.type = "button";
        button.className = "history-item";
        title.className = "history-title";
        title.textContent = getLogCompanyName(log);
        meta.className = "history-meta";
        meta.textContent = [
          formatInterviewTypeLabel(settings.interviewType),
          formatCategoryLabel(settings.category),
          score,
          formatDate(log.savedAt || log.finishedAt || log.startedAt)
        ].join(" / ");
        button.appendChild(title);
        button.appendChild(meta);
        button.addEventListener("click", function () {
          renderHistoryDetail(log);
        });
        list.appendChild(button);
      });
    }

    if (detail) {
      detail.textContent = logs.length ? "履歴を選択してください。" : "";
    }
    showView("historyView");
  }

  function renderHistoryDetail(log) {
    var detail = $("historyDetail");
    if (!detail) {
      return;
    }
    appState.selectedHistoryId = log && log.id ? log.id : null;
    detail.textContent = "";

    var title = document.createElement("h3");
    var settings = log.settings || {};
    var sourceEsEntry = getLogSourceEsEntry(log);
    var entries = getLogEntries(log);
    title.textContent = getLogCompanyName(log) + " / " + (settings.role || "職種未設定");
    detail.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "history-detail-meta";
    meta.textContent = [
      "面接タイプ: " + formatInterviewTypeLabel(settings.interviewType),
      "カテゴリ: " + formatCategoryLabel(settings.category),
      "総合点: " + (log.finalFeedback ? log.finalFeedback.finalScore + "点" : "未評価"),
      "日時: " + formatDate(log.savedAt || log.finishedAt || log.startedAt)
    ].join(" / ");
    detail.appendChild(meta);

    if (sourceEsEntry) {
      var esBlock = document.createElement("section");
      var esTitle = document.createElement("h4");
      var esQuestion = document.createElement("p");
      var esAnswer = document.createElement("p");
      esBlock.className = "history-detail-section";
      esTitle.textContent = "使用したES情報";
      esQuestion.className = "history-detail-es";
      esAnswer.className = "history-detail-es";
      esQuestion.textContent = "設問: " + (sourceEsEntry.questionText || "未入力");
      esAnswer.textContent = "回答: " + (sourceEsEntry.answerText || "未入力");
      esBlock.appendChild(esTitle);
      esBlock.appendChild(esQuestion);
      esBlock.appendChild(esAnswer);
      detail.appendChild(esBlock);
    }

    entries.forEach(function (entry) {
      var block = document.createElement("article");
      var heading = document.createElement("h4");
      var q = document.createElement("p");
      var a = document.createElement("p");
      var e = document.createElement("p");
      var deepDive = document.createElement("p");
      block.className = "history-detail-section";
      heading.textContent = "Q" + entry.questionNumber;
      q.textContent = "Q" + entry.questionNumber + ". " + entry.question;
      a.textContent = "A. " + entry.answer;
      e.textContent = "評価: " + (entry.evaluation ? entry.evaluation.score + "点 - " + entry.evaluation.summary : "なし");
      deepDive.textContent = "深掘り質問: " + (entry.evaluation && entry.evaluation.deepDiveQuestion ? entry.evaluation.deepDiveQuestion : "なし");
      q.className = "history-entry-detail";
      a.className = "history-entry-detail";
      e.className = "history-entry-detail";
      deepDive.className = "history-entry-detail";
      block.appendChild(heading);
      block.appendChild(q);
      block.appendChild(a);
      block.appendChild(e);
      block.appendChild(deepDive);
      detail.appendChild(block);
    });
  }

  function formatDate(value) {
    if (!value) {
      return "日時未設定";
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "日時未設定";
    }
    return date.toLocaleString("ja-JP");
  }

  function restart() {
    showView("setupView");
  }

  function showWorkspace() {
    if (!appState.activeAccountId) {
      showView("accountView");
      return;
    }
    renderWorkspace();
    showView("workspaceView");
  }

  function switchAccount() {
    rememberActiveAccount(null);
    appState.selectedCompanyId = null;
    appState.pendingSourceEsEntry = null;
    renderSourceEsPreview(null);
    renderAccounts();
    showView("accountView");
  }

  function clearHistory() {
    clearInterviewLogs();
    appState.selectedHistoryId = null;
    renderHistory();
  }

  function deleteSelectedHistory() {
    if (!appState.selectedHistoryId) {
      setText("historyDetail", "削除する履歴を一覧から選択してください。");
      return;
    }
    deleteInterviewLog(appState.selectedHistoryId);
    appState.selectedHistoryId = null;
    renderHistory();
  }

  function handleAccountListClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action='select-account']") : null;
    if (target && target.dataset.accountId) {
      selectAccount(target.dataset.accountId);
    }
  }

  function handleCompanyListClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action='select-company']") : null;
    if (target && target.dataset.companyId) {
      selectCompany(target.dataset.companyId);
    }
  }

  function handleEsEntryListClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action='use-es-entry']") : null;
    if (target && target.dataset.esEntryId) {
      useEsEntry(target.dataset.esEntryId);
    }
  }

  function bindLocalWorkspaceEvents() {
    on("createAccountBtn", "click", createAccount);
    on("accountForm", "submit", createAccount);
    on("accountList", "click", handleAccountListClick);
    on("companyForm", "submit", saveCompanyFromForm);
    on("saveCompanyBtn", "click", saveCompanyFromForm);
    on("companyList", "click", handleCompanyListClick);
    on("esForm", "submit", saveEsFromForm);
    on("saveEsBtn", "click", function (event) {
      var button = $("saveEsBtn");
      if (button && button.form && button.type !== "button") {
        return;
      }
      saveEsFromForm(event);
    });
    on("esAnswerInput", "input", updateEsCharCount);
    on("esMaxCharsInput", "input", updateEsCharCount);
    on("esEntryList", "click", handleEsEntryListClick);
  }

  function bindEvents() {
    bindLocalWorkspaceEvents();
    setupVoiceInput();
    on("startInterviewBtn", "click", startInterview);
    on("submitAnswerBtn", "click", submitAnswer);
    on("finishInterviewBtn", "click", finishInterview);
    on("startVoiceInputBtn", "click", startVoiceInput);
    on("stopVoiceInputBtn", "click", stopVoiceInput);
    on("showWorkspaceBtn", "click", showWorkspace);
    on("showHistoryBtn", "click", renderHistory);
    on("backToSetupBtn", "click", restart);
    on("switchAccountBtn", "click", switchAccount);
    on("restartBtn", "click", restart);
    on("clearHistoryBtn", "click", clearHistory);
    on("deleteHistoryItemBtn", "click", deleteSelectedHistory);

    var answerInput = $("answerInput");
    if (answerInput) {
      answerInput.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          submitAnswer();
        }
      });
    }
  }

  function init() {
    bindEvents();
    renderAccounts();
    try {
      var storedAccountId = localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY);
      var hasStoredAccount = loadAccounts().some(function (account) {
        return account.id === storedAccountId;
      });
      if (hasStoredAccount) {
        appState.activeAccountId = storedAccountId;
        var companies = getAccountCompanies(storedAccountId);
        appState.selectedCompanyId = companies.length ? companies[0].id : null;
      }
    } catch (error) {
      console.warn("Failed to restore active account:", error);
    }
    renderWorkspace();
    showView(appState.activeAccountId ? "workspaceView" : "accountView");
  }

  window.generateQuestion = generateQuestion;
  window.evaluateAnswer = evaluateAnswer;
  window.generateFollowUpQuestion = generateFollowUpQuestion;
  window.generateFinalFeedback = generateFinalFeedback;
  window.saveInterviewLog = saveInterviewLog;
  window.loadInterviewLogs = loadInterviewLogs;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
