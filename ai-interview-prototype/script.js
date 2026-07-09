(function () {
  "use strict";

  var STORAGE_KEY = "aiInterviewPrototype.logs";
  var ACCOUNT_STORAGE_KEY = "aiInterviewPrototype.accounts";
  var COMPANY_STORAGE_KEY = "aiInterviewPrototype.companies";
  var ES_STORAGE_KEY = "aiInterviewPrototype.esEntries";
  var ACTIVE_ACCOUNT_STORAGE_KEY = "aiInterviewPrototype.activeAccountId";
  var AI_SETTINGS_KEY = "aiInterviewPrototype.openAiSettings";
  var AI_SESSION_KEY = "aiInterviewPrototype.openAiSessionKey";
  var QUESTION_SPEECH_SETTINGS_KEY = "aiInterviewPrototype.questionSpeechSettings";

  var DEFAULT_SETTINGS = {
    company: "",
    role: "",
    interviewType: "first",
    targetType: "new-graduate",
    category: "self_pr",
    interviewerType: "friendly",
    questionCount: 5,
    userProfile: ""
  };

  var DEFAULT_AI_SETTINGS = {
    mode: "mock",
    model: "gpt-4.1-mini",
    rememberApiKey: false
  };

  var EVALUATION_AXES = [
    "結論の明確さ",
    "論理性",
    "具体性",
    "一貫性",
    "企業理解",
    "職種理解",
    "経験との接続",
    "深掘り耐性",
    "話の分かりやすさ",
    "改善余地"
  ];

  var CATEGORY_LABELS = {
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

  var STATUS_LABELS = {
    draft: "下書き",
    reviewing: "推敲中",
    submitted: "提出済み",
    practice: "練習対象"
  };

  var INTERVIEW_TYPE_LABELS = {
    first: "一次面接",
    final: "最終面接",
    deep_dive: "深掘り面接",
    technical: "技術面接",
    research: "研究面接",
    intern: "インターン面接",
    hr: "人事面接"
  };

  var INTERVIEWER_TYPES = [
    {
      id: "friendly",
      label: "優しめ",
      image: "./assets/interviewers/friendly.png",
      description: "話しやすさを保ちながら、経験や考えを自然に引き出します。",
      voiceProfile: {
        rate: 0.98,
        pitch: 1.08,
        volume: 1,
        voiceHints: ["nanami", "haruka", "kyoko", "ayumi", "sayaka", "female"]
      }
    },
    {
      id: "strict",
      label: "厳しめ",
      image: "./assets/interviewers/strict.png",
      description: "回答の曖昧さや根拠不足を見つけ、実戦に近い圧で確認します。",
      voiceProfile: {
        rate: 0.88,
        pitch: 0.9,
        volume: 1,
        voiceHints: ["ichiro", "keita", "otoya", "male"]
      }
    },
    {
      id: "deep_dive",
      label: "深掘り重視",
      image: "./assets/interviewers/deep_dive.png",
      description: "一つの回答から理由・背景・再現性まで掘り下げます。",
      voiceProfile: {
        rate: 0.86,
        pitch: 0.95,
        volume: 1,
        voiceHints: ["keita", "otoya", "ichiro", "male"]
      }
    },
    {
      id: "technical",
      label: "技術重視",
      image: "./assets/interviewers/technical.png",
      description: "技術選定、設計判断、実装理解を具体的に確かめます。",
      voiceProfile: {
        rate: 0.96,
        pitch: 0.92,
        volume: 1,
        voiceHints: ["keita", "otoya", "ichiro", "male"]
      }
    },
    {
      id: "research",
      label: "研究重視",
      image: "./assets/interviewers/research.png",
      description: "研究目的、手法、検証、独自性を論理の流れで確認します。",
      voiceProfile: {
        rate: 0.9,
        pitch: 1,
        volume: 1,
        voiceHints: ["nanami", "kyoko", "haruka", "ayumi", "female"]
      }
    },
    {
      id: "coach",
      label: "改善コーチ",
      image: "./assets/interviewers/coach.png",
      description: "回答の良い点と直すべき点を見つけ、次の改善につなげます。",
      voiceProfile: {
        rate: 1.02,
        pitch: 1.08,
        volume: 1,
        voiceHints: ["nanami", "kyoko", "haruka", "ayumi", "female"]
      }
    }
  ];

  var questionBank = {
    self_pr: [
      "あなたの強みを、応募先でどのように活かせるかを含めて教えてください。",
      "これまで最も成果を出した経験について、背景と行動を具体的に説明してください。",
      "周囲からどのような人だと言われますか。その理由も含めて教えてください。"
    ],
    motivation: [
      "当社を志望する理由を、事業や職種との接点を含めて教えてください。",
      "この業界を選んだ理由と、その中で当社に関心を持った理由を教えてください。",
      "入社後に実現したいことを、具体的な役割と結びつけて説明してください。"
    ],
    student_life: [
      "学生時代に最も力を入れたことを教えてください。",
      "困難に直面した経験と、そこから学んだことを説明してください。",
      "チームで取り組んだ経験と、その中でのあなたの役割を教えてください。"
    ],
    strength_weakness: [
      "あなたの長所と短所を、それぞれ具体的な経験と合わせて説明してください。",
      "短所が出やすい場面と、それを補うために意識している行動を教えてください。"
    ],
    research: [
      "研究テーマの概要を、専門外の面接官にも分かるように説明してください。",
      "研究の新規性や工夫した点を教えてください。",
      "実験や検証で苦労した点と、その乗り越え方を説明してください。"
    ],
    development: [
      "開発経験の中で、技術的に最も工夫した点を教えてください。",
      "担当した機能、使用技術、あなたの役割を具体的に説明してください。",
      "設計や実装で迷った点と、最終的な判断理由を教えてください。"
    ],
    team: [
      "チームで成果を出した経験について、あなたの役割と貢献を教えてください。",
      "意見が割れた場面で、どのように合意形成しましたか。"
    ],
    failure: [
      "失敗経験を一つ挙げ、原因、対応、学びを順番に説明してください。",
      "その失敗を繰り返さないために、今はどのような行動を取っていますか。"
    ],
    career: [
      "これまでの経験を踏まえ、今後どのようなキャリアを築きたいですか。",
      "3年後にどのような状態になっていたいですか。"
    ],
    reverse_question: [
      "面接官に確認したい逆質問を一つ挙げ、その意図も説明してください。",
      "企業理解を深めるために、どのような質問をしますか。"
    ],
    default: [
      "自己紹介を1分程度でお願いします。",
      "面接で最も伝えたいことは何ですか。",
      "これまでの経験の中で、応募先に最も関連するものを教えてください。"
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
    pendingSourceCompanyId: null,
    currentExpectedAnswerData: null,
    audioClips: {},
    isBusy: false
  };

  var voiceInputState = {
    recognition: null,
    mediaRecorder: null,
    mediaStream: null,
    audioChunks: [],
    recordingStopPromise: null,
    recordingStartedAt: null,
    isSupported: false,
    isRecordingSupported: false,
    isListening: false,
    isRecording: false,
    baseAnswer: "",
    finalTranscript: "",
    lastError: "",
    pendingClip: null
  };

  var questionSpeechState = {
    isSupported: false,
    isSpeaking: false,
    isMuted: false,
    voices: [],
    selectedVoice: null,
    lastQuestion: "",
    rate: 0.95,
    pitch: 1,
    volume: 1
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getValue(id, fallback) {
    var element = $(id);
    return element && typeof element.value !== "undefined" ? String(element.value || "").trim() : (fallback || "");
  }

  function getRawValue(id, fallback) {
    var element = $(id);
    return element && typeof element.value !== "undefined" ? String(element.value || "") : (fallback || "");
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

  function on(id, eventName, handler) {
    var element = $(id);
    if (element && typeof element.addEventListener === "function") {
      element.addEventListener(eventName, handler);
    }
  }

  function loadCollection(key) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key) || "[]");
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

  function normalizeCategory(value) {
    var aliases = {
      "self-pr": "self_pr",
      general: "default",
      experience: "student_life",
      stress: "strength_weakness"
    };
    return aliases[value] || value || DEFAULT_SETTINGS.category;
  }

  function formatCategoryLabel(value) {
    return CATEGORY_LABELS[normalizeCategory(value)] || CATEGORY_LABELS.default;
  }

  function formatStatusLabel(value) {
    return STATUS_LABELS[value] || "未設定";
  }

  function formatInterviewTypeLabel(value) {
    return INTERVIEW_TYPE_LABELS[value] || "面接";
  }

  function getInterviewerType(value) {
    return INTERVIEWER_TYPES.find(function (type) {
      return type.id === value;
    }) || INTERVIEWER_TYPES[0];
  }

  function formatInterviewerType(value) {
    var type = getInterviewerType(value);
    return type.label + " / " + type.description;
  }

  function getCurrentInterviewerTypeId() {
    return appState.settings && appState.settings.interviewerType
      ? appState.settings.interviewerType
      : getValue("interviewerTypeSelect", DEFAULT_SETTINGS.interviewerType);
  }

  function renderInterviewerAvatarGrid() {
    var grid = $("interviewerAvatarGrid");
    var currentValue = getValue("interviewerTypeSelect", DEFAULT_SETTINGS.interviewerType);
    if (!grid) {
      return;
    }
    grid.textContent = "";
    INTERVIEWER_TYPES.forEach(function (type) {
      var button = document.createElement("button");
      var image = document.createElement("img");
      button.type = "button";
      button.className = "interviewer-avatar-option" + (type.id === currentValue ? " is-selected" : "");
      button.dataset.interviewerType = type.id;
      button.dataset.action = "select-interviewer-type";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", type.id === currentValue ? "true" : "false");
      button.setAttribute("aria-label", type.label);
      image.src = type.image;
      image.alt = "";
      button.appendChild(image);
      grid.appendChild(button);
    });
  }

  function updateCurrentInterviewerAvatar(value) {
    var avatar = $("currentInterviewerAvatar");
    var persona = $("currentInterviewerPersona");
    var setupDescription = $("interviewerPersonaDescription");
    var type = getInterviewerType(value || DEFAULT_SETTINGS.interviewerType);
    if (avatar) {
      avatar.src = type.image;
      avatar.alt = "";
    }
    if (persona) {
      persona.textContent = type.description;
    }
    if (setupDescription) {
      setupDescription.textContent = "質問の思考: " + type.description;
    }
  }

  function selectInterviewerType(value) {
    var type = getInterviewerType(value);
    setValue("interviewerTypeSelect", type.id);
    updateCurrentInterviewerAvatar(type.id);
    renderInterviewerAvatarGrid();
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

  function loadInterviewLogs() {
    return loadCollection(STORAGE_KEY);
  }

  function saveInterviewLogs(logs) {
    return saveCollection(STORAGE_KEY, logs);
  }

  function getActiveAccount() {
    return loadAccounts().find(function (account) {
      return account.id === appState.activeAccountId;
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

  function getCompanyEsEntries(companyId, accountId) {
    return loadEsEntries().filter(function (entry) {
      return entry.companyId === companyId && (!accountId || entry.accountId === accountId);
    });
  }

  function findCompany(companyId, accountId) {
    return loadCompanies().find(function (company) {
      return company.id === companyId && (!accountId || company.accountId === accountId);
    }) || null;
  }

  function getSelectedCompany() {
    return findCompany(appState.selectedCompanyId, appState.activeAccountId);
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

  function showView(viewId) {
    var nextViewId = (!appState.activeAccountId && viewId !== "accountView" && viewId !== "settingsView") ? "accountView" : viewId;
    if (nextViewId !== "interviewView") {
      stopQuestionSpeech();
    }
    ["accountView", "settingsView", "workspaceView", "setupView", "interviewView", "feedbackView", "historyView"].forEach(function (id) {
      var element = $(id);
      if (element) {
        element.hidden = id !== nextViewId;
      }
    });
  }

  function renderAccounts() {
    var list = $("accountList");
    var accounts = loadAccounts().sort(function (a, b) {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    if (!list) {
      return;
    }
    list.textContent = "";
    if (!accounts.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "作成済みアカウントはまだありません。";
      list.appendChild(empty);
      return;
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

  function renderWorkspace() {
    var account = getActiveAccount();
    setText("activeAccountName", account ? account.displayName : "未選択");
    renderCompanies();
    renderEsEntries();
    renderSetupCompanySelect();
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
      empty.textContent = companyId ? "この企業のESはまだ保存されていません。" : "企業を選択してESを保存してください。";
      list.appendChild(empty);
      return;
    }

    entries.forEach(function (entry) {
      var item = document.createElement("article");
      item.className = "es-entry-item";

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

      var actions = document.createElement("div");
      actions.className = "form-actions";

      var useButton = document.createElement("button");
      useButton.type = "button";
      useButton.className = "button button-secondary button-small";
      useButton.dataset.esEntryId = entry.id;
      useButton.dataset.action = "use-es-entry";
      useButton.textContent = "この企業のESで面接練習";
      actions.appendChild(useButton);

      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function renderSetupCompanySelect() {
    var select = $("setupCompanySelect");
    if (!select) {
      return;
    }
    var selectedId = appState.pendingSourceCompanyId || appState.selectedCompanyId || "";
    var companies = appState.activeAccountId ? getAccountCompanies(appState.activeAccountId) : [];
    select.textContent = "";

    var emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "企業を選択せずに設定する";
    select.appendChild(emptyOption);

    companies.forEach(function (company) {
      var esCount = getCompanyEsEntries(company.id, company.accountId).length;
      var option = document.createElement("option");
      option.value = company.id;
      option.textContent = [
        company.companyName || "企業名未設定",
        company.role || "職種未設定",
        company.stage || "応募区分未設定",
        "ES " + esCount + "件"
      ].filter(Boolean).join(" / ");
      select.appendChild(option);
    });

    select.value = companies.some(function (company) {
      return company.id === selectedId;
    }) ? selectedId : "";
  }

  function renderAiSettings() {
    var settings = loadAiSettings();
    setValue("openAiApiKeyInput", settings.apiKey || "");
    setValue("openAiModelInput", settings.model || DEFAULT_AI_SETTINGS.model);
    setValue("aiModeSelect", settings.mode || DEFAULT_AI_SETTINGS.mode);
    var remember = $("rememberApiKeyInput");
    if (remember) {
      remember.checked = Boolean(settings.rememberApiKey);
    }
    updateAiStatus();
  }

  function updateAiStatus() {
    var settings = loadAiSettings();
    var enabled = isOpenAiEnabled(settings);
    setText("aiStatusBadge", enabled ? "AI: OpenAI有効" : "AI: モック");
  }

  function createAccount(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    var displayName = getValue("accountNameInput", "");
    var email = getValue("accountEmailInput", "");
    if (!displayName) {
      setText("googleAccountNote", "表示名を入力してください。");
      return;
    }

    var timestamp = nowIso();
    var account = {
      id: makeId("acct"),
      displayName: displayName,
      email: email,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    var accounts = loadAccounts();
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
      appState.pendingSourceCompanyId = null;
      renderAccounts();
      renderWorkspace();
      showView("accountView");
      return;
    }

    rememberActiveAccount(account.id);
    var companies = getAccountCompanies(account.id);
    appState.selectedCompanyId = companies.length ? companies[0].id : null;
    appState.pendingSourceCompanyId = null;
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
    renderSetupCompanySelect();
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
    var company = findCompany(companyId, appState.activeAccountId);
    if (!company) {
      return;
    }
    appState.selectedCompanyId = company.id;
    appState.pendingSourceCompanyId = null;
    applyCompanyToSetup(company);
    renderSourceEsPreview(null, []);
    renderCompanies();
    renderEsEntries();
    renderSetupCompanySelect();
  }

  function findEsEntry(entryId) {
    return loadEsEntries().find(function (entry) {
      return entry.id === entryId && entry.accountId === appState.activeAccountId;
    }) || null;
  }

  function summarizeSourceEsEntries(entries) {
    return (entries || []).map(function (entry) {
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
    });
  }

  function applyCompanyDatasetToSettings(companyId) {
    var company = findCompany(companyId, appState.activeAccountId) || {};
    var entries = company.id ? getCompanyEsEntries(company.id, company.accountId) : [];
    if (company.id) {
      appState.selectedCompanyId = company.id;
      appState.pendingSourceCompanyId = company.id;
    }
    applyCompanyToSetup(company);
    if (entries.length) {
      setValue("categorySelect", normalizeCategory(entries[0].category || DEFAULT_SETTINGS.category));
    }
    setValue("userProfileInput", buildProfileWithCompanyEs(company, entries));
    renderCompanies();
    renderEsEntries();
    renderSetupCompanySelect();
    renderSourceEsPreview(company, entries);
    showView("setupView");
  }

  function useEsEntry(entryId) {
    var entry = findEsEntry(entryId);
    if (entry) {
      applyCompanyDatasetToSettings(entry.companyId);
    }
  }

  function handleSetupCompanySelectChange() {
    var companyId = getValue("setupCompanySelect", "");
    if (!companyId) {
      appState.pendingSourceCompanyId = null;
      renderSourceEsPreview(null, []);
      return;
    }
    applyCompanyDatasetToSettings(companyId);
  }

  function applyCompanyToSetup(company) {
    if (!company) {
      return;
    }
    setValue("companyInput", company.companyName || "");
    setValue("roleInput", company.role || "");
  }

  function buildProfileWithCompanyEs(company, entries) {
    var lines = [];
    if (company && company.notes) {
      lines.push("企業メモ: " + company.notes);
    }
    (entries || []).forEach(function (entry, index) {
      lines.push("ES" + (index + 1) + " 設問: " + (entry.questionText || ""));
      lines.push("ES" + (index + 1) + " 回答: " + (entry.answerText || ""));
    });
    return lines.join("\n");
  }

  function renderSourceEsPreview(company, entries) {
    var preview = $("sourceEsPreview");
    if (!preview) {
      return;
    }
    var safeEntries = entries || [];
    preview.hidden = !company && !safeEntries.length;
    if (!company && !safeEntries.length) {
      setText("sourceEsPreviewQuestion", "");
      setText("sourceEsPreviewAnswer", "");
      return;
    }
    setText("sourceEsPreviewQuestion", [
      "企業: " + (company && company.companyName ? company.companyName : "未設定"),
      "職種: " + (company && company.role ? company.role : "未設定"),
      "応募区分: " + (company && company.stage ? company.stage : "未設定"),
      "ES設問数: " + safeEntries.length
    ].join(" / "));
    setText("sourceEsPreviewAnswer", safeEntries.length
      ? safeEntries.map(function (entry, index) {
        return "ES" + (index + 1) + ": " + (entry.questionText || "設問未入力");
      }).join(" / ")
      : "この企業に保存済みESはまだありません。企業情報のみで面接を開始します。");
  }

  function readSettings() {
    return {
      accountId: appState.activeAccountId,
      companyId: getValue("setupCompanySelect", "") || null,
      company: getValue("companyInput", ""),
      role: getValue("roleInput", ""),
      interviewType: getValue("interviewTypeSelect", DEFAULT_SETTINGS.interviewType),
      targetType: getValue("targetTypeSelect", DEFAULT_SETTINGS.targetType),
      category: normalizeCategory(getValue("categorySelect", DEFAULT_SETTINGS.category)),
      interviewerType: getValue("interviewerTypeSelect", DEFAULT_SETTINGS.interviewerType),
      questionCount: Math.max(1, parseInt(getValue("questionCountSelect", DEFAULT_SETTINGS.questionCount), 10) || DEFAULT_SETTINGS.questionCount),
      userProfile: getRawValue("userProfileInput", "")
    };
  }

  function loadAiSettings() {
    var local = {};
    try {
      local = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || "{}") || {};
    } catch (error) {
      local = {};
    }
    var sessionApiKey = "";
    try {
      sessionApiKey = sessionStorage.getItem(AI_SESSION_KEY) || "";
    } catch (error) {
      sessionApiKey = "";
    }
    return Object.assign({}, DEFAULT_AI_SETTINGS, local, {
      apiKey: local.rememberApiKey ? (local.apiKey || "") : sessionApiKey
    });
  }

  function saveAiSettings(settings) {
    var copy = Object.assign({}, DEFAULT_AI_SETTINGS, settings || {});
    var apiKey = copy.apiKey || "";
    var remember = Boolean(copy.rememberApiKey);
    try {
      var localCopy = {
        mode: copy.mode || DEFAULT_AI_SETTINGS.mode,
        model: copy.model || DEFAULT_AI_SETTINGS.model,
        rememberApiKey: remember
      };
      if (remember && apiKey) {
        localCopy.apiKey = apiKey;
        sessionStorage.removeItem(AI_SESSION_KEY);
      } else {
        sessionStorage.setItem(AI_SESSION_KEY, apiKey);
      }
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(localCopy));
    } catch (error) {
      console.warn("AI settings could not be saved:", error);
    }
    updateAiStatus();
  }

  function saveAiSettingsFromForm(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    var remember = $("rememberApiKeyInput");
    saveAiSettings({
      apiKey: getValue("openAiApiKeyInput", ""),
      model: getValue("openAiModelInput", DEFAULT_AI_SETTINGS.model),
      mode: getValue("aiModeSelect", DEFAULT_AI_SETTINGS.mode),
      rememberApiKey: remember ? remember.checked : false
    });
    setText("aiSettingsMessage", "AI設定を保存しました。");
    renderAiSettings();
  }

  function clearAiSettings(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    try {
      sessionStorage.removeItem(AI_SESSION_KEY);
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify({
        mode: "mock",
        model: DEFAULT_AI_SETTINGS.model,
        rememberApiKey: false
      }));
    } catch (error) {
      console.warn("AI settings could not be cleared:", error);
    }
    renderAiSettings();
    setText("aiSettingsMessage", "APIキーを削除し、モックモードに戻しました。");
  }

  function isOpenAiEnabled(settings) {
    var current = settings || loadAiSettings();
    return current.mode === "openai" && Boolean(current.apiKey);
  }

  function jsonSchema(properties) {
    return {
      type: "object",
      additionalProperties: false,
      properties: properties,
      required: Object.keys(properties)
    };
  }

  function stringArraySchema() {
    return {
      type: "array",
      items: { type: "string" }
    };
  }

  function axisScoreSchema() {
    var props = {};
    EVALUATION_AXES.forEach(function (axis) {
      props[axis] = { type: "number" };
    });
    return jsonSchema(props);
  }

  function scoringRubricSchema() {
    return jsonSchema({
      answerRelevance: { type: "number" },
      logicalStructure: { type: "number" },
      specificity: { type: "number" },
      esConsistency: { type: "number" },
      companyRoleFit: { type: "number" },
      selfReflection: { type: "number" },
      depthResistance: { type: "number" }
    });
  }

  function expectedAnswerDataSchema() {
    return jsonSchema({
      questionIntent: { type: "string" },
      mustInclude: stringArraySchema(),
      shouldInclude: stringArraySchema(),
      goodSignals: stringArraySchema(),
      riskSignals: stringArraySchema(),
      referenceFactsFromES: stringArraySchema(),
      suggestedStructure: stringArraySchema(),
      followUpFocus: stringArraySchema(),
      scoringRubric: scoringRubricSchema()
    });
  }

  function esConsistencySchema() {
    return jsonSchema({
      status: { type: "string" },
      notes: { type: "string" }
    });
  }

  var schemas = {
    connection_test: jsonSchema({
      message: { type: "string" }
    }),
    interview_question: jsonSchema({
      question: { type: "string" }
    }),
    expected_answer_data: expectedAnswerDataSchema(),
    answer_evaluation: jsonSchema({
      score: { type: "number" },
      axisScores: axisScoreSchema(),
      summary: { type: "string" },
      goodPoints: stringArraySchema(),
      improvements: stringArraySchema(),
      issues: stringArraySchema(),
      missingElements: stringArraySchema(),
      esConsistency: esConsistencySchema(),
      scoringRationale: { type: "string" },
      deepDiveQuestion: { type: "string" },
      direction: { type: "string" },
      revisedAnswerExample: { type: "string" },
      nextQuestion: { type: "string" }
    }),
    final_feedback: jsonSchema({
      finalScore: { type: "number" },
      scoreBreakdown: axisScoreSchema(),
      goodPoints: stringArraySchema(),
      improvements: stringArraySchema(),
      deepDiveQuestions: stringArraySchema(),
      revisionDirection: { type: "string" },
      nextPracticeList: stringArraySchema()
    })
  };

  async function callOpenAi(task, prompt, schema) {
    var settings = loadAiSettings();
    if (!isOpenAiEnabled(settings)) {
      throw new Error("OpenAI APIキーが未設定、またはモックモードです。");
    }
    var response = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: settings.apiKey,
        model: settings.model || DEFAULT_AI_SETTINGS.model,
        task: task,
        prompt: prompt,
        schema: schema
      })
    });
    var data = await response.json().catch(function () {
      return {};
    });
    if (!response.ok || !data.result) {
      throw new Error(data.error || "OpenAI API request failed");
    }
    return data.result;
  }

  function buildAiContext(settings) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var sourceEntries = Array.isArray(safeSettings.sourceEsEntries) ? safeSettings.sourceEsEntries : [];
    return [
      "応募企業: " + (safeSettings.company || "未設定"),
      "応募職種: " + (safeSettings.role || "未設定"),
      "応募区分: " + (safeSettings.companyStage || "未設定"),
      "企業メモ: " + (safeSettings.companyNotes || "未入力"),
      "面接タイプ: " + formatInterviewTypeLabel(safeSettings.interviewType),
      "対象区分: " + (safeSettings.targetType || "未設定"),
      "カテゴリ: " + formatCategoryLabel(safeSettings.category),
      "面接官タイプ: " + formatInterviewerType(safeSettings.interviewerType),
      "自己メモ: " + (safeSettings.userProfile || "未入力"),
      sourceEntries.length ? "保存済みES一覧:\n" + sourceEntries.map(function (entry, index) {
        return [
          "ES" + (index + 1),
          "カテゴリ: " + formatCategoryLabel(entry.category),
          "設問: " + (entry.questionText || ""),
          "回答: " + (entry.answerText || "")
        ].join("\n");
      }).join("\n---\n") : "保存済みES: なし"
    ].filter(Boolean).join("\n");
  }

  function sanitizeStringArray(items, fallback) {
    var source = Array.isArray(items) ? items : fallback || [];
    return source.map(function (item) {
      return String(item || "").trim();
    }).filter(Boolean);
  }

  function normalizeScoringRubric(rubric) {
    var fallback = {
      answerRelevance: 18,
      logicalStructure: 14,
      specificity: 18,
      esConsistency: 18,
      companyRoleFit: 14,
      selfReflection: 10,
      depthResistance: 8
    };
    var result = {};
    Object.keys(fallback).forEach(function (key) {
      var value = rubric && Number(rubric[key]);
      result[key] = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback[key];
    });
    return result;
  }

  function createFallbackExpectedAnswerData(question, settings) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var sourceEntries = Array.isArray(safeSettings.sourceEsEntries) ? safeSettings.sourceEsEntries : [];
    var referenceFacts = sourceEntries.map(function (entry, index) {
      var answer = String(entry.answerText || "").replace(/\s+/g, " ").slice(0, 140);
      return "ES" + (index + 1) + ": " + (entry.questionText || "設問未入力") + (answer ? " / " + answer : "");
    }).filter(Boolean);
    var mustInclude = [
      "質問に直接答える結論",
      "根拠になる具体的な経験または判断",
      "行動と結果",
      "ES全体と矛盾しない説明"
    ];
    if (safeSettings.company) {
      mustInclude.push(safeSettings.company + "との接点");
    }
    if (safeSettings.role) {
      mustInclude.push(safeSettings.role + "で活かせる要素");
    }
    return {
      questionIntent: "面接官が「" + question + "」で確認したい意図を、結論・根拠・再現性・企業適合の観点で満たすこと。",
      mustInclude: mustInclude,
      shouldInclude: [
        "背景、課題、行動、結果、学びの流れ",
        "数字、期間、人数、役割などの具体情報",
        "入社後または参加後にどう活かすか"
      ],
      goodSignals: [
        "ESに書いた経験を使いながら、面接用に補足説明できている",
        "本人の役割と意思決定が明確",
        "成果だけでなく、再現できる行動特性まで説明している"
      ],
      riskSignals: [
        "どの企業にも使える一般論に寄っている",
        "ESにない事実を断定している",
        "結論が遅く、質問への答えが曖昧",
        "成果や学びが抽象的"
      ],
      referenceFactsFromES: referenceFacts,
      suggestedStructure: ["結論", "背景", "自分の役割", "行動", "結果", "学び", "応募先での活かし方"],
      followUpFocus: ["なぜその行動を取ったか", "成果の根拠", "再現性", "応募企業・職種との接点"],
      scoringRubric: normalizeScoringRubric(null),
      generatedBy: "mock",
      generatedAt: new Date().toISOString()
    };
  }

  function normalizeExpectedAnswerData(data, fallback) {
    var base = fallback || createFallbackExpectedAnswerData("", {});
    return {
      questionIntent: String(data && data.questionIntent || base.questionIntent || ""),
      mustInclude: sanitizeStringArray(data && data.mustInclude, base.mustInclude),
      shouldInclude: sanitizeStringArray(data && data.shouldInclude, base.shouldInclude),
      goodSignals: sanitizeStringArray(data && data.goodSignals, base.goodSignals),
      riskSignals: sanitizeStringArray(data && data.riskSignals, base.riskSignals),
      referenceFactsFromES: sanitizeStringArray(data && data.referenceFactsFromES, base.referenceFactsFromES),
      suggestedStructure: sanitizeStringArray(data && data.suggestedStructure, base.suggestedStructure),
      followUpFocus: sanitizeStringArray(data && data.followUpFocus, base.followUpFocus),
      scoringRubric: normalizeScoringRubric(data && data.scoringRubric),
      generatedBy: data && data.generatedBy ? data.generatedBy : base.generatedBy || "openai",
      generatedAt: data && data.generatedAt ? data.generatedAt : new Date().toISOString()
    };
  }

  function getPreviousTurns() {
    return appState.interviewLog && Array.isArray(appState.interviewLog.entries)
      ? appState.interviewLog.entries.map(function (entry) {
        return {
          questionNumber: entry.questionNumber,
          question: entry.question,
          answer: entry.answer,
          score: entry.evaluation ? entry.evaluation.score : null,
          summary: entry.evaluation ? entry.evaluation.summary : ""
        };
      })
      : [];
  }

  async function getExpectedAnswerData(question, settings) {
    var fallback = createFallbackExpectedAnswerData(question, settings);
    try {
      var result = await callOpenAi(
        "expected_answer_data",
        [
          "あなたは就職・研究・インターン面接の評価基準設計者です。",
          "次の面接質問に対して、採点に使う期待回答データをJSONで作ってください。",
          "重要: 模範回答文は作らないでください。ユーザーの自由な表現を許容し、回答に含まれるべき条件、良い兆候、リスク、深掘り観点だけを作ってください。",
          "ESにない事実を作らず、企業情報、職種、応募区分、全ESとの一貫性を重視してください。",
          "文章の流暢さだけで高評価にしない採点基準にしてください。",
          buildAiContext(settings),
          "現在の質問: " + question,
          "これまでの会話履歴:",
          JSON.stringify(getPreviousTurns())
        ].join("\n"),
        schemas.expected_answer_data
      );
      return normalizeExpectedAnswerData(Object.assign({}, result, {
        generatedBy: "openai"
      }), fallback);
    } catch (error) {
      console.warn("AI expected answer data generation failed. Falling back to mock.", error);
      return fallback;
    }
  }

  async function testAiConnection(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    saveAiSettingsFromForm(event);
    setText("aiSettingsMessage", "OpenAIへ接続確認中です...");
    try {
      var result = await callOpenAi(
        "connection_test",
        "接続テストです。日本語で短く成功メッセージを返してください。",
        schemas.connection_test
      );
      setText("aiSettingsMessage", "接続成功: " + result.message);
    } catch (error) {
      setText("aiSettingsMessage", "接続失敗: " + error.message);
    }
  }

  function textSeed(text) {
    return String(text || "").split("").reduce(function (sum, char) {
      return sum + char.charCodeAt(0);
    }, 0);
  }

  function pickFrom(items, seed) {
    return items[Math.abs(seed) % items.length];
  }

  function makeQuestionSpecific(question, settings) {
    var parts = [question];
    if (settings.company) {
      parts.push("応募先の " + settings.company + " との接点も含めてください。");
    }
    if (settings.role) {
      parts.push(settings.role + " で再現できる力が伝わるように答えてください。");
    }
    if (settings.interviewerType === "strict") {
      parts.push("根拠が弱い場合は追加で確認します。");
    }
    return parts.join(" ");
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
    if (askedCount === 0 && Array.isArray(safeSettings.sourceEsEntries) && safeSettings.sourceEsEntries.length) {
      return makeQuestionSpecific("提出ES全体を踏まえて、特に面接で確認したい経験を一つ選び、背景、あなたの役割、行動、結果を説明してください。", safeSettings);
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

  async function getInterviewQuestion(settings) {
    try {
      var result = await callOpenAi(
        "interview_question",
        [
          "次に面接官が聞く質問を1つだけ作ってください。",
          "質問は日本語で、回答者が具体的に答えやすい聞き方にしてください。",
          "既に聞いた質問と重複しないようにしてください。",
          buildAiContext(settings),
          "これまでの質問数: " + (appState.interviewLog && appState.interviewLog.entries ? appState.interviewLog.entries.length : 0)
        ].join("\n"),
        schemas.interview_question
      );
      return result.question || generateQuestion(settings);
    } catch (error) {
      console.warn("AI question generation failed. Falling back to mock.", error);
      return generateQuestion(settings);
    }
  }

  function scoreAnswer(answer, settings) {
    var compact = String(answer || "").replace(/\s+/g, "");
    var length = compact.length;
    var hasConclusion = /(結論|理由|まず|最初に|強み|志望理由|第一に)/.test(answer);
    var hasSpecifics = /(\d|年|月|人|%|件|社|チーム|プロジェクト|改善|成果)/.test(answer);
    var hasCompany = settings.company && answer.indexOf(settings.company) !== -1;
    var hasRole = settings.role && answer.indexOf(settings.role) !== -1;
    var hasReflection = /(学び|改善|次|今後|課題|活か)/.test(answer);
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

  function clampAxis(value) {
    return Math.max(1, Math.min(10, value));
  }

  function axisScores(score, answer, settings) {
    var hasSpecifics = /(\d|年|月|人|%|件|プロジェクト|成果|改善)/.test(answer);
    var hasCompany = settings.company && answer.indexOf(settings.company) !== -1;
    var hasRole = settings.role && answer.indexOf(settings.role) !== -1;
    var hasExperience = /(経験|取り組|担当|役割|行動|実施|工夫)/.test(answer);
    var hasConclusion = /(結論|理由|強み|志望)/.test(answer);
    var base = Math.round(score / 10);
    return {
      "結論の明確さ": clampAxis(base + (hasConclusion ? 1 : -1)),
      "論理性": clampAxis(base),
      "具体性": clampAxis(base + (hasSpecifics ? 1 : -2)),
      "一貫性": clampAxis(base),
      "企業理解": clampAxis(base + (hasCompany ? 1 : -1)),
      "職種理解": clampAxis(base + (hasRole ? 1 : -1)),
      "経験との接続": clampAxis(base + (hasExperience ? 1 : -1)),
      "深掘り耐性": clampAxis(base + (String(answer || "").length > 120 ? 1 : -1)),
      "話の分かりやすさ": clampAxis(base + (String(answer || "").length < 550 ? 1 : -1)),
      "改善余地": clampAxis(11 - base)
    };
  }

  function generateFollowUpQuestion(answer, settings) {
    var safeAnswer = String(answer || "");
    if (safeAnswer.length < 50) {
      return "もう少し具体的に、状況、あなたの行動、結果の順で説明できますか。";
    }
    if (!/(\d|年|月|人|%|件)/.test(safeAnswer)) {
      return "成果や規模を、数字や比較で説明するとどうなりますか。";
    }
    if (settings.company && safeAnswer.indexOf(settings.company) === -1) {
      return settings.company + "で働く前提では、その経験をどのように活かせますか。";
    }
    if (settings.role && safeAnswer.indexOf(settings.role) === -1) {
      return settings.role + "の仕事に直接つながる学びは何ですか。";
    }
    return "同じ状況がもう一度起きたら、次は何を変えますか。";
  }

  function buildRevisedAnswerExample(question, answer, settings) {
    var company = settings.company || "応募先企業";
    var role = settings.role || "希望職種";
    var source = String(answer || "").slice(0, 80);
    return [
      "結論から言うと、私が伝えたい強みは課題を整理し、周囲を巻き込みながら改善まで進める力です。",
      "具体的には、" + (source || "過去の取り組み") + "という経験で、状況を整理し、優先順位を決めて行動しました。",
      "この経験で得た学びを、" + company + "の" + role + "でも再現し、成果につなげたいと考えています。"
    ].join("");
  }

  function evaluateAnswer(question, answer, settings, expectedAnswerData) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var safeAnswer = String(answer || "").trim();
    var expected = expectedAnswerData || createFallbackExpectedAnswerData(question, safeSettings);
    var score = scoreAnswer(safeAnswer, safeSettings);
    var axes = axisScores(score, safeAnswer, safeSettings);
    var goodPoints = [];
    var improvements = [];
    var issues = [];
    var missingElements = [];

    if (axes["結論の明確さ"] >= 7) {
      goodPoints.push("回答の主張が早い段階で示されています。");
    } else {
      improvements.push("冒頭で結論を一文で置くと、回答全体が伝わりやすくなります。");
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
    (expected.mustInclude || []).forEach(function (item) {
      if (safeAnswer.indexOf(item) === -1 && missingElements.length < 4) {
        missingElements.push(item);
      }
    });

    return {
      question: question,
      answer: safeAnswer,
      score: score,
      axisScores: axes,
      summary: "総合評価は" + score + "点です。結論、具体性、応募先との接続を中心に評価しました。",
      goodPoints: goodPoints,
      improvements: improvements,
      issues: issues,
      missingElements: missingElements,
      esConsistency: {
        status: safeSettings.sourceEsEntries && safeSettings.sourceEsEntries.length ? "unchecked_by_mock" : "insufficient_evidence",
        notes: "モック採点ではESとの厳密な矛盾検出は行わず、回答内の企業名・職種名・具体性を中心に見ています。"
      },
      scoringRationale: "ローカルの簡易採点です。OpenAI設定が有効な場合は、期待回答データ、全ES、企業情報、会話履歴を使って採点します。",
      expectedAnswerData: expected,
      deepDiveQuestion: generateFollowUpQuestion(safeAnswer, safeSettings),
      direction: "結論を先に置き、根拠となる経験を数字や役割で補強し、最後に応募先での再現性へつなげてください。",
      revisedAnswerExample: buildRevisedAnswerExample(question, safeAnswer, safeSettings),
      nextQuestion: generateQuestion(Object.assign({}, safeSettings, {
        _askedCount: appState.interviewLog && appState.interviewLog.entries
          ? appState.interviewLog.entries.length + 1
          : 1
      })),
      createdAt: new Date().toISOString()
    };
  }

  async function getAnswerEvaluation(question, answer, settings, expectedAnswerData) {
    var expected = expectedAnswerData || createFallbackExpectedAnswerData(question, settings);
    var fallback = evaluateAnswer(question, answer, settings, expected);
    try {
      var result = await callOpenAi(
        "answer_evaluation",
        [
          "あなたは面接官兼採点者です。以下の面接回答を評価し、次の質問も1つ生成してください。",
          "点数は0から100、評価軸は1から10で採点してください。",
          "expectedAnswerDataは模範回答ではなく採点条件です。完全一致ではなく、回答が条件を満たしているかを見てください。",
          "質問に直接答えているか、ES全体と矛盾していないか、ESの単なる言い換えでなく背景・本人の行動・判断理由・成果・学び・再現性が補足されているかを評価してください。",
          "文章が流暢・丁寧という理由だけで点数を上げないでください。",
          "ESにない事実、数値、役割は補完せず、未確認情報または深掘り対象として扱ってください。",
          "改善点は実際に次の回答で直せる粒度にしてください。",
          buildAiContext(settings),
          "expectedAnswerData:",
          JSON.stringify(expected),
          "これまでの会話履歴:",
          JSON.stringify(getPreviousTurns()),
          "質問: " + question,
          "回答: " + answer
        ].join("\n"),
        schemas.answer_evaluation
      );
      return Object.assign({}, fallback, result, {
        score: Math.max(0, Math.min(100, Math.round(Number(result.score) || fallback.score))),
        axisScores: normalizeAxisScores(result.axisScores, fallback.axisScores),
        goodPoints: sanitizeStringArray(result.goodPoints, fallback.goodPoints),
        improvements: sanitizeStringArray(result.improvements, fallback.improvements),
        issues: sanitizeStringArray(result.issues, fallback.issues),
        missingElements: sanitizeStringArray(result.missingElements, fallback.missingElements),
        esConsistency: result.esConsistency || fallback.esConsistency,
        scoringRationale: result.scoringRationale || fallback.scoringRationale,
        expectedAnswerData: expected,
        nextQuestion: result.nextQuestion || fallback.nextQuestion,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.warn("AI answer evaluation failed. Falling back to mock.", error);
      return fallback;
    }
  }

  function normalizeAxisScores(scores, fallback) {
    var result = {};
    EVALUATION_AXES.forEach(function (axis) {
      var value = scores && Number(scores[axis]);
      result[axis] = Number.isFinite(value) ? Math.max(1, Math.min(10, value)) : fallback[axis];
    });
    return result;
  }

  function unique(items) {
    return (items || []).filter(function (item, index, array) {
      return item && array.indexOf(item) === index;
    });
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
      goodPoints: goodPoints.length ? goodPoints : ["回答ログを残せています。練習を重ねる土台ができています。"],
      improvements: improvements.length ? improvements : ["応募先との接点をさらに具体化すると、より強い回答になります。"],
      deepDiveQuestions: deepDives,
      revisionDirection: "各回答の冒頭に結論を置き、経験、行動、成果、応募先での活かし方を一続きに整理してください。",
      nextPracticeList: [
        "各回答の最初に結論を一文で置く練習をする",
        "経験ごとに数字、期間、役割、成果を整理する",
        "応募企業と希望職種で求められる力に絞って言語化する",
        "深掘り質問に対して、理由と再現性を30秒で答える"
      ],
      generatedAt: new Date().toISOString()
    };
  }

  async function getFinalFeedback(interviewLog) {
    var fallback = generateFinalFeedback(interviewLog);
    try {
      var result = await callOpenAi(
        "final_feedback",
        [
          "以下の面接ログ全体を総合評価してください。",
          "総合点は0から100、評価軸は1から10で採点してください。",
          "次回練習項目は具体的な行動にしてください。",
          "面接設定:",
          buildAiContext(interviewLog.settings || {}),
          "面接ログ:",
          JSON.stringify((interviewLog.entries || []).map(function (entry) {
            return {
              questionNumber: entry.questionNumber,
              question: entry.question,
              answer: entry.answer,
              expectedAnswerData: getEntryExpectedAnswerData(entry),
              evaluation: entry.evaluation
            };
          }))
        ].join("\n"),
        schemas.final_feedback
      );
      return Object.assign({}, fallback, result, {
        finalScore: Math.max(0, Math.min(100, Math.round(Number(result.finalScore) || fallback.finalScore))),
        scoreBreakdown: normalizeAxisScores(result.scoreBreakdown, fallback.scoreBreakdown),
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.warn("AI final feedback failed. Falling back to mock.", error);
      return fallback;
    }
  }

  function saveInterviewLog(log) {
    var logs = loadInterviewLogs();
    var copy = Object.assign({}, log, {
      id: log.id || makeId("session"),
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
    saveInterviewLogs(logs);
    return copy;
  }

  function clearInterviewLogs() {
    saveInterviewLogs([]);
  }

  function deleteInterviewLog(id) {
    saveInterviewLogs(loadInterviewLogs().filter(function (log) {
      return log.id !== id;
    }));
  }

  function setBusy(isBusy, message) {
    appState.isBusy = Boolean(isBusy);
    ["startInterviewBtn", "submitAnswerBtn", "finishInterviewBtn", "testAiConnectionBtn"].forEach(function (id) {
      var button = $(id);
      if (button) {
        button.disabled = appState.isBusy;
      }
    });
    if (message) {
      setText("feedbackSummary", message);
    }
    updateQuestionSpeechButtons();
    updateVoiceInputButtons();
  }

  async function startInterview(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (appState.isBusy) {
      return;
    }
    releaseAudioClips();
    var settings = readSettings();
    var sourceCompanyId = settings.companyId || appState.pendingSourceCompanyId;
    var sourceCompany = sourceCompanyId ? findCompany(sourceCompanyId, appState.activeAccountId) : null;
    var sourceEntries = sourceCompanyId ? getCompanyEsEntries(sourceCompanyId, appState.activeAccountId) : [];
    if (sourceCompany) {
      settings.companyId = sourceCompany.id;
      settings.company = sourceCompany.companyName || settings.company;
      settings.role = sourceCompany.role || settings.role;
      settings.companyStage = sourceCompany.stage || "";
      settings.companyNotes = sourceCompany.notes || "";
      settings.sourceCompany = {
        id: sourceCompany.id,
        accountId: sourceCompany.accountId,
        companyName: sourceCompany.companyName,
        role: sourceCompany.role,
        stage: sourceCompany.stage,
        notes: sourceCompany.notes
      };
    }
    settings.sourceEsEntries = summarizeSourceEsEntries(sourceEntries);
    appState.pendingSourceCompanyId = sourceCompanyId || null;
    renderSourceEsPreview(sourceCompany, sourceEntries);
    appState.settings = settings;
    updateCurrentInterviewerAvatar(settings.interviewerType);
    appState.questionIndex = 0;
    appState.finished = false;
    appState.currentExpectedAnswerData = null;
    appState.interviewLog = {
      id: makeId("session"),
      accountId: settings.accountId || appState.activeAccountId || null,
      companyId: settings.companyId || null,
      esEntryIds: settings.sourceEsEntries.map(function (entry) {
        return entry.id;
      }),
      settings: settings,
      messages: [],
      evaluations: [],
      entries: [],
      startedAt: new Date().toISOString(),
      finalFeedback: null
    };
    setText("currentQuestion", "質問を生成中です...");
    setText("feedbackSummary", "");
    setText("progressText", "質問 1 / " + settings.questionCount);
    var timeline = $("chatTimeline");
    if (timeline) {
      timeline.textContent = "";
    }
    showView("interviewView");
    setBusy(true, "質問を生成中です...");
    appState.currentQuestion = await getInterviewQuestion(settings);
    setBusy(true, "評価基準を生成中です...");
    appState.currentExpectedAnswerData = await getExpectedAnswerData(appState.currentQuestion, settings);
    setText("currentQuestion", appState.currentQuestion);
    speakQuestion(appState.currentQuestion);
    setText("feedbackSummary", "回答を入力してください。");
    setBusy(false);
    var answerInput = $("answerInput");
    if (answerInput) {
      answerInput.value = "";
      answerInput.focus();
    }
  }

  async function finalizeVoiceCaptureBeforeSubmit() {
    stopQuestionSpeech();
    if (voiceInputState.isListening && voiceInputState.recognition) {
      try {
        voiceInputState.recognition.stop();
      } catch (error) {
        console.warn("Speech recognition could not be stopped before submit:", error);
      }
      await new Promise(function (resolve) {
        setTimeout(resolve, 300);
      });
    }
    if (voiceInputState.isRecording) {
      await stopAudioRecording();
    } else if (voiceInputState.recordingStopPromise) {
      await voiceInputState.recordingStopPromise;
    }
    return voiceInputState.pendingClip;
  }

  function createTranscriptRecord(text, clip) {
    return {
      text: text,
      source: clip || voiceInputState.finalTranscript ? "speech_recognition" : "manual",
      confidence: null,
      editedByUser: Boolean(voiceInputState.finalTranscript && text.indexOf(voiceInputState.finalTranscript.trim()) === -1),
      finalizedAt: new Date().toISOString()
    };
  }

  function createAudioMetadata(clip) {
    if (!clip) {
      return {
        stored: false,
        reviewAvailableDuringSession: false,
        discardedAt: null
      };
    }
    return {
      stored: false,
      reviewAvailableDuringSession: true,
      clipId: clip.id,
      mimeType: clip.mimeType,
      durationMs: clip.durationMs,
      sizeBytes: clip.size,
      discardedAt: null
    };
  }

  async function submitAnswer() {
    if (!appState.interviewLog || appState.finished || appState.isBusy) {
      return;
    }

    var audioClip = await finalizeVoiceCaptureBeforeSubmit();
    var answerInput = $("answerInput");
    var answer = answerInput && typeof answerInput.value === "string" ? answerInput.value.trim() : "";
    if (!answer) {
      setText("feedbackSummary", "回答を入力してから送信してください。");
      return;
    }

    setBusy(true, "回答を評価中です...");
    var expectedAnswerData = appState.currentExpectedAnswerData || await getExpectedAnswerData(appState.currentQuestion, appState.settings);
    var evaluation = await getAnswerEvaluation(appState.currentQuestion, answer, appState.settings, expectedAnswerData);
    var message = {
      id: makeId("msg"),
      sessionId: appState.interviewLog.id,
      questionNumber: appState.questionIndex + 1,
      question: appState.currentQuestion,
      answer: answer,
      answerInputMode: audioClip ? "voice" : "text",
      transcript: createTranscriptRecord(answer, audioClip),
      audio: createAudioMetadata(audioClip),
      audioClipId: audioClip ? audioClip.id : null,
      expectedAnswerData: expectedAnswerData,
      createdAt: new Date().toISOString()
    };
    var evaluationRecord = Object.assign({}, evaluation, {
      id: makeId("eval"),
      sessionId: appState.interviewLog.id,
      messageId: message.id,
      questionNumber: message.questionNumber,
      expectedAnswerData: expectedAnswerData
    });

    appState.interviewLog.messages.push(message);
    appState.interviewLog.evaluations.push(evaluationRecord);
    appState.interviewLog.entries.push({
      id: message.id,
      evaluationId: evaluationRecord.id,
      questionNumber: appState.questionIndex + 1,
      question: appState.currentQuestion,
      answer: answer,
      answerInputMode: message.answerInputMode,
      transcript: message.transcript,
      audio: message.audio,
      audioClipId: message.audioClipId,
      expectedAnswerData: expectedAnswerData,
      evaluation: evaluationRecord
    });
    voiceInputState.pendingClip = null;
    voiceInputState.finalTranscript = "";
    appState.questionIndex += 1;

    renderImmediateFeedback(evaluation);
    appendTimelineEntry(appState.currentQuestion, answer, evaluation);
    if (answerInput) {
      answerInput.value = "";
    }

    if (appState.questionIndex >= appState.settings.questionCount) {
      setBusy(false);
      await finishInterview();
      return;
    }

    appState.currentQuestion = evaluation.deepDiveQuestion || evaluation.nextQuestion || await getInterviewQuestion(appState.settings);
    appState.currentExpectedAnswerData = null;
    setBusy(true, "次の評価基準を生成中です...");
    appState.currentExpectedAnswerData = await getExpectedAnswerData(appState.currentQuestion, appState.settings);
    setText("currentQuestion", appState.currentQuestion);
    speakQuestion(appState.currentQuestion);
    setText("progressText", "質問 " + (appState.questionIndex + 1) + " / " + appState.settings.questionCount);
    setText("feedbackSummary", "次の質問に回答してください。評価の詳細は終了後に確認できます。");
    setBusy(false);
  }

  function renderImmediateFeedback(evaluation) {
    setText("feedbackSummary", "回答を受け付けました。次の質問に進みます。");
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
    var answerEl = document.createElement("p");
    answerEl.textContent = "A. " + answer;
    var scoreEl = document.createElement("p");
    scoreEl.textContent = "評価は面接終了後にまとめて確認できます。";
    item.appendChild(questionEl);
    item.appendChild(answerEl);
    item.appendChild(scoreEl);
    timeline.appendChild(item);
  }

  async function finishInterview() {
    if (!appState.interviewLog || appState.finished || appState.isBusy) {
      return;
    }
    setBusy(true, "最終フィードバックを作成中です...");
    appState.finished = true;
    appState.interviewLog.finishedAt = new Date().toISOString();
    appState.interviewLog.finalFeedback = await getFinalFeedback(appState.interviewLog);
    appState.interviewLog = saveInterviewLog(appState.interviewLog);
    renderFinalFeedback(appState.interviewLog.finalFeedback);
    setBusy(false);
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
    renderAudioReview();
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) {
      return "時間不明";
    }
    var seconds = Math.round(ms / 1000);
    var minutes = Math.floor(seconds / 60);
    var rest = seconds % 60;
    return minutes ? minutes + "分" + rest + "秒" : rest + "秒";
  }

  function getAudioClip(clipId) {
    return clipId && appState.audioClips ? appState.audioClips[clipId] || null : null;
  }

  function renderAudioReview() {
    var list = $("audioReviewList");
    if (!list) {
      return;
    }
    list.textContent = "";
    var entries = appState.interviewLog && Array.isArray(appState.interviewLog.entries) ? appState.interviewLog.entries : [];
    var audioEntries = entries.map(function (entry) {
      return {
        entry: entry,
        clip: getAudioClip(entry.audioClipId || (entry.audio && entry.audio.clipId))
      };
    }).filter(function (item) {
      return item.clip && item.clip.url;
    });

    if (!audioEntries.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "この面接で確認できる録音はありません。文字起こしは履歴に保存されます。";
      list.appendChild(empty);
      return;
    }

    audioEntries.forEach(function (item) {
      var block = document.createElement("article");
      var title = document.createElement("p");
      var meta = document.createElement("p");
      var transcript = document.createElement("p");
      var audio = document.createElement("audio");
      block.className = "audio-review-item";
      title.textContent = "Q" + item.entry.questionNumber + " 録音";
      meta.textContent = [
        item.clip.mimeType || "audio",
        item.clip.size ? Math.round(item.clip.size / 1024) + "KB" : "",
        formatDuration(item.clip.durationMs)
      ].filter(Boolean).join(" / ");
      transcript.textContent = "文字起こし: " + (item.entry.transcript && item.entry.transcript.text ? item.entry.transcript.text : item.entry.answer || "");
      audio.controls = true;
      audio.src = item.clip.url;
      block.appendChild(title);
      block.appendChild(meta);
      block.appendChild(audio);
      block.appendChild(transcript);
      list.appendChild(block);
    });
  }

  function releaseAudioClips() {
    Object.keys(appState.audioClips || {}).forEach(function (clipId) {
      var clip = appState.audioClips[clipId];
      if (clip && clip.url && window.URL && typeof window.URL.revokeObjectURL === "function") {
        window.URL.revokeObjectURL(clip.url);
      }
    });
    appState.audioClips = {};
    voiceInputState.pendingClip = null;
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

  function renderScoreBreakdown(scoreBreakdown) {
    var element = $("scoreBreakdown");
    if (!element) {
      return;
    }
    element.textContent = "";
    EVALUATION_AXES.forEach(function (axis) {
      var row = document.createElement("div");
      row.textContent = axis + ": " + ((scoreBreakdown && scoreBreakdown[axis]) || 0) + " / 10";
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

  function getLogCompanyName(log) {
    var settings = log.settings || {};
    var company = findCompany(log.companyId || settings.companyId, log.accountId || settings.accountId);
    return company ? company.companyName : (settings.company || "企業未設定");
  }

  function getLogEntries(log) {
    if (Array.isArray(log.entries) && log.entries.length) {
      return log.entries.map(function (entry, index) {
        if (entry.evaluation) {
          return entry;
        }
        var evaluation = (log.evaluations || []).find(function (item) {
          return item && (item.id === entry.evaluationId || item.messageId === entry.id);
        }) || (log.evaluations || [])[index] || null;
        return Object.assign({}, entry, {
          evaluation: evaluation
        });
      });
    }
    return (log.messages || []).map(function (message, index) {
      return {
        id: message.id,
        questionNumber: message.questionNumber || index + 1,
        question: message.question,
        answer: message.answer,
        answerInputMode: message.answerInputMode || "text",
        transcript: message.transcript || null,
        audio: message.audio || null,
        audioClipId: message.audioClipId || null,
        expectedAnswerData: message.expectedAnswerData || null,
        evaluation: (log.evaluations || [])[index] || null
      };
    });
  }

  function getLogSourceEsEntries(log) {
    var settings = log.settings || {};
    if (Array.isArray(settings.sourceEsEntries)) {
      return settings.sourceEsEntries;
    }
    return settings.sourceEsEntry ? [settings.sourceEsEntry] : [];
  }

  function getEntryExpectedAnswerData(entry) {
    if (entry && entry.expectedAnswerData) {
      return entry.expectedAnswerData;
    }
    if (entry && entry.evaluation && entry.evaluation.expectedAnswerData) {
      return entry.evaluation.expectedAnswerData;
    }
    return null;
  }

  function appendCompactList(parent, title, items) {
    var safeItems = sanitizeStringArray(items, []);
    if (!safeItems.length) {
      return;
    }
    var label = document.createElement("p");
    var list = document.createElement("ul");
    label.className = "history-subtitle";
    label.textContent = title;
    list.className = "history-compact-list";
    safeItems.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    parent.appendChild(label);
    parent.appendChild(list);
  }

  function appendExpectedAnswerData(parent, expectedAnswerData, evaluation) {
    if (!expectedAnswerData) {
      return;
    }
    var section = document.createElement("div");
    var intent = document.createElement("p");
    section.className = "expected-answer-block";
    intent.textContent = "評価基準: " + (expectedAnswerData.questionIntent || "なし");
    section.appendChild(intent);
    appendCompactList(section, "必ず見る条件", expectedAnswerData.mustInclude);
    appendCompactList(section, "加点要素", expectedAnswerData.shouldInclude);
    appendCompactList(section, "ESから参照した事実", expectedAnswerData.referenceFactsFromES);
    appendCompactList(section, "リスク", expectedAnswerData.riskSignals);
    appendCompactList(section, "深掘り観点", expectedAnswerData.followUpFocus);
    if (evaluation && evaluation.missingElements && evaluation.missingElements.length) {
      appendCompactList(section, "今回不足していた要素", evaluation.missingElements);
    }
    if (evaluation && evaluation.esConsistency) {
      var consistency = document.createElement("p");
      consistency.textContent = "ES一貫性: " + (evaluation.esConsistency.status || "未判定") + " / " + (evaluation.esConsistency.notes || "");
      section.appendChild(consistency);
    }
    if (evaluation && evaluation.scoringRationale) {
      var rationale = document.createElement("p");
      rationale.textContent = "採点根拠: " + evaluation.scoringRationale;
      section.appendChild(rationale);
    }
    parent.appendChild(section);
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
    var sourceEsEntries = getLogSourceEsEntries(log);
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

    if (sourceEsEntries.length) {
      var esBlock = document.createElement("section");
      esBlock.className = "history-detail-section";
      var esTitle = document.createElement("h4");
      esBlock.appendChild(esTitle);
      esTitle.textContent = "使用したES一覧";
      sourceEsEntries.forEach(function (sourceEsEntry, index) {
        var esQuestion = document.createElement("p");
        var esAnswer = document.createElement("p");
        esQuestion.textContent = "ES" + (index + 1) + " 設問: " + (sourceEsEntry.questionText || "未入力");
        esAnswer.textContent = "ES" + (index + 1) + " 回答: " + (sourceEsEntry.answerText || "未入力");
        esBlock.appendChild(esQuestion);
        esBlock.appendChild(esAnswer);
      });
      detail.appendChild(esBlock);
    }

    entries.forEach(function (entry) {
      var block = document.createElement("article");
      block.className = "history-detail-section";
      var heading = document.createElement("h4");
      var q = document.createElement("p");
      var a = document.createElement("p");
      var transcript = document.createElement("p");
      var audioNote = document.createElement("p");
      var e = document.createElement("p");
      var deepDive = document.createElement("p");
      heading.textContent = "Q" + entry.questionNumber;
      q.textContent = "Q. " + entry.question;
      a.textContent = "A. " + entry.answer;
      transcript.textContent = "文字起こし: " + (entry.transcript && entry.transcript.text ? entry.transcript.text : entry.answer || "");
      audioNote.textContent = entry.audio && entry.audio.reviewAvailableDuringSession
        ? "音声: 長期保存なし。面接終了直後の画面でのみ確認可能です。"
        : "音声: 保存なし";
      e.textContent = "評価: " + (entry.evaluation ? entry.evaluation.score + "点 - " + entry.evaluation.summary : "なし");
      deepDive.textContent = "深掘り質問: " + (entry.evaluation && entry.evaluation.deepDiveQuestion ? entry.evaluation.deepDiveQuestion : "なし");
      block.appendChild(heading);
      block.appendChild(q);
      block.appendChild(a);
      if (entry.transcript || entry.audio) {
        block.appendChild(transcript);
        block.appendChild(audioNote);
      }
      block.appendChild(e);
      block.appendChild(deepDive);
      appendExpectedAnswerData(block, getEntryExpectedAnswerData(entry), entry.evaluation);
      detail.appendChild(block);
    });
  }

  function formatDate(value) {
    if (!value) {
      return "日時未設定";
    }
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? "日時未設定" : date.toLocaleString("ja-JP");
  }

  function restart() {
    releaseAudioClips();
    renderSetupCompanySelect();
    showView("setupView");
  }

  function showWorkspace() {
    renderWorkspace();
    showView("workspaceView");
  }

  function showSettings() {
    renderAiSettings();
    showView("settingsView");
  }

  function switchAccount() {
    releaseAudioClips();
    rememberActiveAccount(null);
    appState.selectedCompanyId = null;
    appState.pendingSourceCompanyId = null;
    renderSourceEsPreview(null, []);
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
    var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    if (!target || !target.dataset.esEntryId) {
      return;
    }
    if (target.dataset.action === "use-es-entry") {
      useEsEntry(target.dataset.esEntryId);
    }
  }

  function handleInterviewerAvatarClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action='select-interviewer-type']") : null;
    if (target && target.dataset.interviewerType) {
      selectInterviewerType(target.dataset.interviewerType);
    }
  }

  function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function loadQuestionSpeechSettings() {
    try {
      var parsed = JSON.parse(localStorage.getItem(QUESTION_SPEECH_SETTINGS_KEY) || "{}") || {};
      return {
        isMuted: Boolean(parsed.isMuted),
        rate: Number.isFinite(Number(parsed.rate)) ? Math.max(0.7, Math.min(1.2, Number(parsed.rate))) : 0.95,
        pitch: Number.isFinite(Number(parsed.pitch)) ? Math.max(0.7, Math.min(1.3, Number(parsed.pitch))) : 1,
        volume: Number.isFinite(Number(parsed.volume)) ? Math.max(0, Math.min(1, Number(parsed.volume))) : 1
      };
    } catch (error) {
      return {
        isMuted: false,
        rate: 0.95,
        pitch: 1,
        volume: 1
      };
    }
  }

  function saveQuestionSpeechSettings() {
    try {
      localStorage.setItem(QUESTION_SPEECH_SETTINGS_KEY, JSON.stringify({
        isMuted: questionSpeechState.isMuted,
        rate: questionSpeechState.rate,
        pitch: questionSpeechState.pitch,
        volume: questionSpeechState.volume
      }));
    } catch (error) {
      console.warn("Question speech settings could not be saved:", error);
    }
  }

  function scoreQuestionVoice(voice, profile) {
    var name = String((voice && voice.name) || "").toLowerCase();
    var uri = String((voice && voice.voiceURI) || "").toLowerCase();
    var lang = String((voice && voice.lang) || "").toLowerCase();
    var hints = profile && Array.isArray(profile.voiceHints) ? profile.voiceHints : [];
    var score = 0;
    if (lang === "ja-jp") {
      score += 30;
    } else if (lang.indexOf("ja") === 0) {
      score += 18;
    }
    if (voice && voice.default) {
      score += 4;
    }
    if (voice && voice.localService) {
      score += 2;
    }
    hints.forEach(function (hint) {
      var safeHint = String(hint || "").toLowerCase();
      if (safeHint && (name.indexOf(safeHint) !== -1 || uri.indexOf(safeHint) !== -1)) {
        score += 12;
      }
    });
    return score;
  }

  function pickQuestionVoice(profile) {
    var voices = questionSpeechState.voices || [];
    if (!voices.length) {
      return null;
    }
    return voices.slice().sort(function (a, b) {
      return scoreQuestionVoice(b, profile) - scoreQuestionVoice(a, profile);
    })[0] || null;
  }

  function setQuestionSpeechUiState(state) {
    var panel = document.querySelector(".speech-output-panel");
    if (!panel || !panel.classList) {
      return;
    }
    panel.classList.remove("is-speaking", "is-muted", "is-error");
    if (state) {
      panel.classList.add(state);
    }
  }

  function updateQuestionSpeechButtons() {
    var replayButton = $("replayQuestionSpeechBtn");
    var stopButton = $("stopQuestionSpeechBtn");
    var toggleButton = $("toggleQuestionSpeechBtn");
    var supported = questionSpeechState.isSupported;
    if (replayButton) {
      replayButton.disabled = !supported || !questionSpeechState.lastQuestion || appState.isBusy;
    }
    if (stopButton) {
      stopButton.disabled = !supported || !questionSpeechState.isSpeaking;
    }
    if (toggleButton) {
      toggleButton.disabled = !supported;
      toggleButton.textContent = questionSpeechState.isMuted ? "音声OFF" : "音声ON";
      toggleButton.setAttribute("aria-pressed", questionSpeechState.isMuted ? "false" : "true");
    }
    if (!supported) {
      setText("questionSpeechStatus", "このブラウザでは質問読み上げを利用できません。");
      setQuestionSpeechUiState("is-error");
    } else if (questionSpeechState.isMuted) {
      setText("questionSpeechStatus", "質問読み上げはOFFです。");
      setQuestionSpeechUiState("is-muted");
    } else if (questionSpeechState.isSpeaking) {
      setText("questionSpeechStatus", "面接官の質問を読み上げています。");
      setQuestionSpeechUiState("is-speaking");
    } else {
      setText("questionSpeechStatus", "質問は音声でも読み上げられます。");
      setQuestionSpeechUiState("");
    }
  }

  function stopQuestionSpeech() {
    if (window.speechSynthesis && typeof window.speechSynthesis.cancel === "function") {
      window.speechSynthesis.cancel();
    }
    questionSpeechState.isSpeaking = false;
    updateQuestionSpeechButtons();
  }

  function speakQuestion(question, options) {
    var safeQuestion = String(question || "").trim();
    var opts = options || {};
    questionSpeechState.lastQuestion = safeQuestion || questionSpeechState.lastQuestion;
    if (!questionSpeechState.isSupported || !safeQuestion) {
      updateQuestionSpeechButtons();
      return;
    }
    if (questionSpeechState.isMuted && !opts.force) {
      updateQuestionSpeechButtons();
      return;
    }
    if (voiceInputState.isListening || voiceInputState.isRecording) {
      updateQuestionSpeechButtons();
      return;
    }
    stopQuestionSpeech();
    var interviewerType = getInterviewerType(getCurrentInterviewerTypeId());
    var profile = interviewerType.voiceProfile || {};
    var utterance = new window.SpeechSynthesisUtterance(safeQuestion);
    utterance.lang = "ja-JP";
    utterance.rate = Number.isFinite(Number(profile.rate)) ? Number(profile.rate) : questionSpeechState.rate;
    utterance.pitch = Number.isFinite(Number(profile.pitch)) ? Number(profile.pitch) : questionSpeechState.pitch;
    utterance.volume = Number.isFinite(Number(profile.volume)) ? Number(profile.volume) : questionSpeechState.volume;
    var selectedVoice = pickQuestionVoice(profile);
    questionSpeechState.selectedVoice = selectedVoice;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.onstart = function () {
      questionSpeechState.isSpeaking = true;
      updateQuestionSpeechButtons();
    };
    utterance.onend = function () {
      questionSpeechState.isSpeaking = false;
      updateQuestionSpeechButtons();
      var answerInput = $("answerInput");
      if (answerInput && !appState.isBusy) {
        answerInput.focus();
      }
    };
    utterance.onerror = function () {
      questionSpeechState.isSpeaking = false;
      setText("questionSpeechStatus", "質問の読み上げでエラーが発生しました。");
      setQuestionSpeechUiState("is-error");
      updateQuestionSpeechButtons();
    };
    window.speechSynthesis.speak(utterance);
  }

  function replayQuestionSpeech(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    speakQuestion(questionSpeechState.lastQuestion || appState.currentQuestion, { force: true });
  }

  function stopQuestionSpeechFromEvent(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    stopQuestionSpeech();
  }

  function toggleQuestionSpeech(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    questionSpeechState.isMuted = !questionSpeechState.isMuted;
    if (questionSpeechState.isMuted) {
      stopQuestionSpeech();
    }
    saveQuestionSpeechSettings();
    updateQuestionSpeechButtons();
  }

  function setupQuestionSpeech() {
    var settings = loadQuestionSpeechSettings();
    questionSpeechState.isSupported = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
    questionSpeechState.isMuted = settings.isMuted;
    questionSpeechState.rate = settings.rate;
    questionSpeechState.pitch = settings.pitch;
    questionSpeechState.volume = settings.volume;
    if (!questionSpeechState.isSupported) {
      updateQuestionSpeechButtons();
      return;
    }
    function refreshVoices() {
      questionSpeechState.voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      questionSpeechState.selectedVoice = pickQuestionVoice(getInterviewerType(getCurrentInterviewerTypeId()).voiceProfile);
      updateQuestionSpeechButtons();
    }
    refreshVoices();
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    } else {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
    updateQuestionSpeechButtons();
  }

  function getSupportedAudioMimeType() {
    if (!window.MediaRecorder || typeof window.MediaRecorder.isTypeSupported !== "function") {
      return "";
    }
    return [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus"
    ].find(function (type) {
      return window.MediaRecorder.isTypeSupported(type);
    }) || "";
  }

  function stopVoiceMediaStream() {
    if (voiceInputState.mediaStream && typeof voiceInputState.mediaStream.getTracks === "function") {
      voiceInputState.mediaStream.getTracks().forEach(function (track) {
        if (track && typeof track.stop === "function") {
          track.stop();
        }
      });
    }
    voiceInputState.mediaStream = null;
  }

  function getCurrentTranscriptText() {
    var answerInput = $("answerInput");
    return answerInput && typeof answerInput.value === "string" ? answerInput.value.trim() : "";
  }

  function createAudioClipFromBlob(blob) {
    if (!blob || !blob.size || !window.URL || typeof window.URL.createObjectURL !== "function") {
      return null;
    }
    var clip = {
      id: makeId("audio"),
      url: window.URL.createObjectURL(blob),
      mimeType: blob.type || "audio/webm",
      size: blob.size,
      durationMs: voiceInputState.recordingStartedAt ? Math.max(0, Date.now() - voiceInputState.recordingStartedAt) : null,
      transcriptText: getCurrentTranscriptText(),
      createdAt: new Date().toISOString()
    };
    appState.audioClips[clip.id] = clip;
    return clip;
  }

  async function startAudioRecording() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function" || !window.MediaRecorder) {
      voiceInputState.isRecordingSupported = false;
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var mimeType = getSupportedAudioMimeType();
      var options = mimeType ? { mimeType: mimeType } : undefined;
      voiceInputState.mediaStream = stream;
      voiceInputState.audioChunks = [];
      voiceInputState.recordingStartedAt = Date.now();
      voiceInputState.mediaRecorder = new window.MediaRecorder(stream, options);
      voiceInputState.mediaRecorder.ondataavailable = function (event) {
        if (event.data && event.data.size > 0) {
          voiceInputState.audioChunks.push(event.data);
        }
      };
      voiceInputState.recordingStopPromise = new Promise(function (resolve) {
        voiceInputState.mediaRecorder.onstop = function () {
        var type = voiceInputState.mediaRecorder && voiceInputState.mediaRecorder.mimeType ? voiceInputState.mediaRecorder.mimeType : mimeType || "audio/webm";
        var blob = voiceInputState.audioChunks.length ? new Blob(voiceInputState.audioChunks, { type: type }) : null;
        voiceInputState.pendingClip = createAudioClipFromBlob(blob);
        voiceInputState.audioChunks = [];
        voiceInputState.isRecording = false;
        stopVoiceMediaStream();
        if (voiceInputState.pendingClip) {
          setText("voiceStatus", "音声入力を停止しました。録音はこの面接中だけ確認できます。");
        }
          resolve(voiceInputState.pendingClip);
        };
      });
      voiceInputState.mediaRecorder.start();
      voiceInputState.isRecording = true;
      voiceInputState.isRecordingSupported = true;
    } catch (error) {
      voiceInputState.isRecording = false;
      voiceInputState.isRecordingSupported = false;
      voiceInputState.lastError = error && error.message ? error.message : "microphone-unavailable";
      voiceInputState.recordingStopPromise = null;
      stopVoiceMediaStream();
      console.warn("Audio recording could not be started:", error);
    }
  }

  function stopAudioRecording() {
    if (voiceInputState.mediaRecorder && voiceInputState.mediaRecorder.state !== "inactive") {
      voiceInputState.mediaRecorder.stop();
      return voiceInputState.recordingStopPromise || Promise.resolve(null);
    }
    voiceInputState.isRecording = false;
    stopVoiceMediaStream();
    return Promise.resolve(voiceInputState.pendingClip);
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

  function updateVoiceInputButtons() {
    var startButton = $("startVoiceInputBtn");
    var stopButton = $("stopVoiceInputBtn");
    if (startButton) {
      startButton.disabled = !voiceInputState.isSupported || voiceInputState.isListening || questionSpeechState.isSpeaking;
    }
    if (stopButton) {
      stopButton.disabled = !voiceInputState.isSupported || !voiceInputState.isListening;
    }
  }

  function setupVoiceInput() {
    var Recognition = getSpeechRecognitionConstructor();
    voiceInputState.isSupported = Boolean(Recognition);
    if (!Recognition) {
      setText("voiceStatus", "このブラウザは音声入力に対応していません。");
      setVoiceUiState("is-error");
      updateVoiceInputButtons();
      return;
    }
    voiceInputState.recognition = new Recognition();
    voiceInputState.recognition.lang = "ja-JP";
    voiceInputState.recognition.continuous = true;
    voiceInputState.recognition.interimResults = true;
    voiceInputState.recognition.onstart = function () {
      voiceInputState.isListening = true;
      voiceInputState.finalTranscript = "";
      setText("voiceStatus", voiceInputState.isRecording ? "音声入力・録音中です。" : "音声入力中です。");
      setVoiceUiState("is-listening");
      updateVoiceInputButtons();
    };
    voiceInputState.recognition.onresult = function (event) {
      var interimTranscript = "";
      var finalTranscript = "";
      for (var i = event.resultIndex || 0; i < event.results.length; i += 1) {
        var result = event.results[i];
        var transcript = result && result[0] ? result[0].transcript : "";
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      voiceInputState.finalTranscript += finalTranscript;
      var answerInput = $("answerInput");
      if (answerInput) {
        answerInput.value = voiceInputState.baseAnswer + (voiceInputState.baseAnswer ? "\n" : "") + voiceInputState.finalTranscript;
      }
      setText("voiceTranscriptPreview", interimTranscript);
    };
    voiceInputState.recognition.onerror = function (event) {
      voiceInputState.lastError = event && event.error ? event.error : "unknown";
      setText("voiceStatus", "音声入力でエラーが発生しました: " + voiceInputState.lastError);
      setVoiceUiState("is-error");
      voiceInputState.isListening = false;
      stopAudioRecording();
      updateVoiceInputButtons();
    };
    voiceInputState.recognition.onend = function () {
      voiceInputState.isListening = false;
      setText("voiceStatus", "音声入力を停止しました。");
      setText("voiceTranscriptPreview", "");
      setVoiceUiState("");
      stopAudioRecording();
      updateVoiceInputButtons();
    };
    setText("voiceStatus", "音声入力を開始できます。");
    updateVoiceInputButtons();
  }

  async function startVoiceInput(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (!voiceInputState.recognition || voiceInputState.isListening) {
      return;
    }
    stopQuestionSpeech();
    var answerInput = $("answerInput");
    voiceInputState.baseAnswer = answerInput && typeof answerInput.value === "string" ? answerInput.value : "";
    voiceInputState.finalTranscript = "";
    voiceInputState.pendingClip = null;
    await startAudioRecording();
    voiceInputState.recognition.start();
  }

  async function stopVoiceInput(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (voiceInputState.recognition && voiceInputState.isListening) {
      voiceInputState.recognition.stop();
      return;
    }
    await stopAudioRecording();
  }

  function bindEvents() {
    on("createAccountBtn", "click", createAccount);
    on("accountForm", "submit", createAccount);
    on("accountList", "click", handleAccountListClick);
    on("companyForm", "submit", saveCompanyFromForm);
    on("saveCompanyBtn", "click", saveCompanyFromForm);
    on("companyList", "click", handleCompanyListClick);
    on("esForm", "submit", saveEsFromForm);
    on("saveEsBtn", "click", saveEsFromForm);
    on("esAnswerInput", "input", updateEsCharCount);
    on("esMaxCharsInput", "input", updateEsCharCount);
    on("esEntryList", "click", handleEsEntryListClick);
    on("setupCompanySelect", "change", handleSetupCompanySelectChange);
    on("interviewerAvatarGrid", "click", handleInterviewerAvatarClick);
    on("saveAiSettingsBtn", "click", saveAiSettingsFromForm);
    on("testAiConnectionBtn", "click", testAiConnection);
    on("clearAiSettingsBtn", "click", clearAiSettings);
    on("startInterviewBtn", "click", startInterview);
    on("submitAnswerBtn", "click", submitAnswer);
    on("finishInterviewBtn", "click", finishInterview);
    on("replayQuestionSpeechBtn", "click", replayQuestionSpeech);
    on("stopQuestionSpeechBtn", "click", stopQuestionSpeechFromEvent);
    on("toggleQuestionSpeechBtn", "click", toggleQuestionSpeech);
    on("startVoiceInputBtn", "click", startVoiceInput);
    on("stopVoiceInputBtn", "click", stopVoiceInput);
    on("showWorkspaceBtn", "click", showWorkspace);
    on("showSettingsBtn", "click", showSettings);
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
    window.addEventListener("beforeunload", function () {
      stopQuestionSpeech();
      releaseAudioClips();
      stopVoiceMediaStream();
    });
  }

  function init() {
    bindEvents();
    setupQuestionSpeech();
    setupVoiceInput();
    selectInterviewerType(getValue("interviewerTypeSelect", DEFAULT_SETTINGS.interviewerType));
    renderAccounts();
    renderAiSettings();
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
  window.generateFinalFeedback = generateFinalFeedback;
  window.saveInterviewLog = saveInterviewLog;
  window.loadInterviewLogs = loadInterviewLogs;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
