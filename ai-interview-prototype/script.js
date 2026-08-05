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
  var CLOUD_MIGRATION_KEY = "aiInterviewPrototype.cloudMigration";
  var RANDOM_INTERVIEWER_TYPE_ID = "random";

  var DEFAULT_SETTINGS = {
    company: "",
    role: "",
    interviewType: "first",
    targetType: "new-graduate",
    category: "self_pr",
    questionSource: "ai",
    interviewerType: "friendly",
    interviewerTypeMode: "fixed",
    interviewerTypeSelection: "friendly",
    questionCount: 5,
    userProfile: "",
    cameraEnabled: false
  };

  var DEFAULT_AI_SETTINGS = {
    mode: "mock",
    model: "gpt-5.6",
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

  var STAR_QUESTION_BANK = {
    self_pr: [
      "自己PRをしてください。",
      "あなたの強みを、エピソードを交えて教えてください。",
      "その強みは、当社のどんな場面で活かせると思いますか。",
      "周囲の人から、あなたはどんな人だと言われますか。",
      "自己PRの中で、特に自信を持っているエピソードを一つ詳しく教えてください。"
    ],
    motivation: [
      "当社を志望する理由を教えてください。",
      "数ある企業の中で、なぜ当社に興味を持ったのですか。",
      "当社でどのような仕事をしたいと考えていますか。",
      "業界研究の中で、当社を選んだ決め手は何ですか。",
      "入社後に成し遂げたいことを教えてください。",
      "他社ではなく当社でなければならない理由は何ですか。"
    ],
    student_life: [
      "学生時代に最も力を入れたことを教えてください。",
      "その経験の中で、あなたはどのような役割を担いましたか。",
      "目標に向けて、具体的にどのような行動を取りましたか。",
      "その取り組みの中で直面した困難と、乗り越え方を教えてください。",
      "その経験から得た学びを、今後どう活かしたいですか。"
    ],
    strength_weakness: [
      "あなたの長所と短所を教えてください。",
      "短所によって困った経験と、その対処法を教えてください。",
      "長所を発揮して成果を出したエピソードを教えてください。",
      "短所を克服するために、日頃取り組んでいることはありますか。",
      "周囲と比べて、自分ならではの強みだと思う点は何ですか。"
    ],
    research: [
      "現在取り組んでいる研究内容を教えてください。",
      "その研究テーマを選んだ理由を教えてください。",
      "研究を進める中で、最も苦労した点は何ですか。",
      "研究の独自性や工夫している点を教えてください。",
      "研究を通じて身についた力を、仕事にどう活かしたいですか。"
    ],
    development: [
      "これまでに開発した成果物について教えてください。",
      "その開発において、あなたが担当した役割を教えてください。",
      "技術選定の際に、どのような基準で判断しましたか。",
      "開発中に発生した課題と、解決のために取った行動を教えてください。",
      "その開発を通じて得た学びを教えてください。",
      "チームでの開発経験があれば、どのように役割分担をしましたか。"
    ],
    team: [
      "チームで何かに取り組んだ経験を教えてください。",
      "そのチームの中で、あなたはどのような役割を担いましたか。",
      "チーム内で意見が対立した際、どのように対応しましたか。",
      "チームの成果を高めるために、あなたが工夫したことは何ですか。",
      "リーダーシップを発揮した経験があれば教えてください。"
    ],
    failure: [
      "これまでに経験した失敗について教えてください。",
      "その失敗の原因は何だったと分析していますか。",
      "失敗した後、どのように立て直しましたか。",
      "その失敗から得た教訓を、今どう活かしていますか。",
      "失敗を恐れずに挑戦した経験があれば教えてください。"
    ],
    career: [
      "将来のキャリアプランを教えてください。",
      "5年後、10年後にどのような人材像になっていたいですか。",
      "当社でどのように成長していきたいと考えていますか。",
      "キャリアを考える上で、最も大切にしている価値観は何ですか。",
      "希望する職種以外に興味のある分野はありますか。"
    ],
    reverse_question: [
      "最後に何か質問はありますか。",
      "当社について、聞いておきたいことはありますか。",
      "配属後の働き方について、気になる点はありますか。",
      "入社までに準備しておくとよいことはありますか。",
      "面接を受けてみて、当社に対する印象は変わりましたか。"
    ]
  };

  // 面接タイプによって聞き方の重心が変わるカテゴリだけ、上位互換の質問を
  // interviewType×category単位で追加する（全組み合わせを埋めるのではなく、
  // 面接タイプごとに意味のある差が出る組み合わせに絞る）。
  // pickBankQuestion()はこちらを優先し、尽きたらSTAR_QUESTION_BANK[category]に続く。
  var STAR_QUESTION_BANK_TYPE_OVERRIDES = {
    technical: {
      development: [
        "技術面接の観点で伺います。今の技術スタックを選んだ理由と、代替案との比較を教えてください。",
        "設計上、最もトレードオフに悩んだ判断とその根拠を教えてください。",
        "本番運用後に見つかった問題があれば、原因の切り分け方と対応を教えてください。"
      ]
    },
    research: {
      research: [
        "研究面接の観点で伺います。研究の目的と、それを検証するための手法の対応関係を説明してください。",
        "先行研究と比べた独自性は何ですか。",
        "研究成果の再現性・妥当性はどのように担保していますか。"
      ]
    },
    final: {
      career: [
        "最終面接として伺います。入社後3年間で、どのように会社に貢献したいですか。",
        "他社の選考状況を踏まえた上で、当社を選ぶ決め手を改めて教えてください。"
      ],
      motivation: [
        "最終確認です。当社への入社意思は固まっていますか。理由も含めて教えてください。"
      ]
    },
    intern: {
      student_life: [
        "インターンとして伺います。限られた期間でどう成果を出すか、学生時代の経験から教えてください。"
      ],
      motivation: [
        "数あるインターン先の中で、当社を選んだ理由を教えてください。"
      ]
    },
    hr: {
      strength_weakness: [
        "人事の観点から伺います。短所が原因でチームに影響が出た経験と、その後の対応を教えてください。"
      ]
    }
  };

  var STATUS_LABELS = {
    draft: "下書き",
    reviewing: "推敲中",
    submitted: "提出済み",
    practice: "練習対象"
  };

  var ACHIEVEMENT_DEFINITIONS = [
    { id: "practice_1", category: "practice", threshold: 1, title: "はじめの一歩", description: "面接練習を1回完了" },
    { id: "practice_5", category: "practice", threshold: 5, title: "習慣の芽生え", description: "面接練習を5回完了" },
    { id: "practice_10", category: "practice", threshold: 10, title: "積み重ね", description: "面接練習を10回完了" },
    { id: "practice_25", category: "practice", threshold: 25, title: "継続の力", description: "面接練習を25回完了" },
    { id: "practice_50", category: "practice", threshold: 50, title: "練習の達人", description: "面接練習を50回完了" },
    { id: "streak_3", category: "streak", threshold: 3, title: "3日連続練習", description: "3日連続で練習を完了" },
    { id: "streak_7", category: "streak", threshold: 7, title: "1週間継続", description: "7日連続で練習を完了" },
    { id: "streak_14", category: "streak", threshold: 14, title: "2週間継続", description: "14日連続で練習を完了" },
    { id: "score_70", category: "score", threshold: 70, title: "70点到達", description: "70点以上のスコアを達成" },
    { id: "score_90", category: "score", threshold: 90, title: "90点到達", description: "90点以上のスコアを達成" },
    { id: "score_improve_10", category: "improvement", title: "スコア向上", description: "自己ベストを、最初に記録したスコアから10点以上更新" }
  ];

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

  var RANDOM_INTERVIEWER_OPTION = {
    id: RANDOM_INTERVIEWER_TYPE_ID,
    label: "ランダム",
    description: "開始時にAI面接官タイプをランダムに決定します。どのタイプになるかは開始後に表示されます。"
  };

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
      "開発経験の中で、解こうとした課題、担当範囲、成果を一連の流れで説明してください。",
      "使用技術やアーキテクチャを選んだ理由を、代替案との比較も含めて教えてください。",
      "設計や実装で迷った点と、最終的な判断理由、捨てた選択肢を教えてください。",
      "品質を担保するために行ったテスト、レビュー、監視、リリース前確認について説明してください。",
      "生成AIや自動化ツールを使った場合、どこに使い、どのように出力を検証しましたか。",
      "性能、セキュリティ、保守性のいずれかで課題になった点と、対応方針を教えてください。",
      "チーム開発での役割分担、意思決定、レビューであなたが貢献した点を説明してください。",
      "リリース後または利用後のフィードバックを受けて、改善したことを教えてください。"
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
    editingAccountId: null,
    selectedCompanyId: null,
    editingCompanyId: null,
    pendingSourceCompanyId: null,
    editingEsEntryId: null,
    currentExpectedAnswerData: null,
    currentQuestionTopic: null,
    currentQuestionShownAt: null,
    audioClips: {},
    videoClips: {},
    isBusy: false,
    historyFilter: {
      companyName: "",
      category: "",
      sort: "date_desc"
    }
  };

  function hasUnsavedInterviewProgress() {
    return !!(appState.interviewLog && !appState.finished &&
      Array.isArray(appState.interviewLog.entries) && appState.interviewLog.entries.length > 0);
  }

  function hasPendingCloudInterviewLogSave() {
    return !!(cloudState.saveTimers && cloudState.saveTimers.interviewLogs);
  }

  var CLOUD_COLLECTIONS = {
    [ACCOUNT_STORAGE_KEY]: { stateKey: "accounts", cloudName: "accounts" },
    [COMPANY_STORAGE_KEY]: { stateKey: "companies", cloudName: "companies" },
    [ES_STORAGE_KEY]: { stateKey: "esEntries", cloudName: "esEntries" },
    [STORAGE_KEY]: { stateKey: "interviewLogs", cloudName: "interviewLogs" }
  };

  var cloudState = {
    service: null,
    configured: false,
    ready: false,
    loading: false,
    user: null,
    profile: {},
    settings: {},
    accounts: null,
    companies: null,
    esEntries: null,
    interviewLogs: null,
    localSnapshot: null,
    saveTimers: {},
    lastError: ""
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

  var cameraInputState = {
    mediaStream: null,
    mediaRecorder: null,
    videoChunks: [],
    recordingStopPromise: null,
    recordingStartedAt: null,
    isSupported: false,
    isEnabled: false,
    isRecording: false,
    pendingClip: null,
    lastError: "",
    bodyLanguageSamples: [],
    faceDetector: null,
    faceDetectorSupported: false,
    samplingIntervalId: null,
    samplingSessionId: 0,
    samplingTickCount: 0,
    samplingTickInProgress: false,
    lastFrameData: null,
    sampleCanvas: null,
    sampleCanvasCtx: null,
    lastBodyLanguageMetrics: null
  };

  // 表情・視線・姿勢の簡易分析（Issue #3）に関する調整用定数。
  // 外部AI画像解析は使わず、ブラウザ内蔵のShape Detection API（あれば）と
  // オフスクリーンcanvasでのフレーム差分のみで簡易スコアを算出する。
  var BODY_LANGUAGE_SAMPLE_INTERVAL_MS = 500;
  var BODY_LANGUAGE_SAMPLE_WIDTH = 64;
  var BODY_LANGUAGE_SAMPLE_HEIGHT = 48;
  // グレースケール(0-255)でのフレーム間平均絶対差分がこの値のとき「動きが大きい」= 100点とみなす経験則上の目安値。
  var BODY_LANGUAGE_MAX_MOTION_DIFF = 40;
  // 顔中心座標(0-1に正規化)のフレーム間RMSぶれがこの値のとき「安定度0点」とみなす経験則上の目安値。
  var BODY_LANGUAGE_MAX_FACE_SPREAD = 0.15;

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

  function loadLocalCollection(key) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to load local collection:", key, error);
      return [];
    }
  }

  function saveLocalCollection(key, items) {
    try {
      localStorage.setItem(key, JSON.stringify(items || []));
      return true;
    } catch (error) {
      console.warn("Failed to save local collection:", key, error);
      return false;
    }
  }

  function getCloudCollectionDefinition(key) {
    return CLOUD_COLLECTIONS[key] || null;
  }

  function isCloudSignedIn() {
    return Boolean(cloudState.service && cloudState.user && cloudState.ready);
  }

  function loadCollection(key) {
    var definition = getCloudCollectionDefinition(key);
    if (definition && isCloudSignedIn() && Array.isArray(cloudState[definition.stateKey])) {
      return cloudState[definition.stateKey].slice();
    }
    return loadLocalCollection(key);
  }

  function saveCollection(key, items) {
    var safeItems = Array.isArray(items) ? items : [];
    var definition = getCloudCollectionDefinition(key);
    if (definition && isCloudSignedIn()) {
      cloudState[definition.stateKey] = safeItems.slice();
      queueCloudCollectionSave(definition.cloudName, safeItems);
      return true;
    }
    var saved = saveLocalCollection(key, safeItems);
    if (definition) {
      cloudState.localSnapshot = null;
      renderCloudAuthState(null, "");
    }
    return saved;
  }

  function loadLocalObject(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function captureLocalMigrationSnapshot() {
    cloudState.localSnapshot = {
      accounts: loadLocalCollection(ACCOUNT_STORAGE_KEY),
      companies: loadLocalCollection(COMPANY_STORAGE_KEY),
      esEntries: loadLocalCollection(ES_STORAGE_KEY),
      interviewLogs: loadLocalCollection(STORAGE_KEY),
      activeAccountId: (function () {
        try {
          return localStorage.getItem(ACTIVE_ACCOUNT_STORAGE_KEY) || "";
        } catch (error) {
          return "";
        }
      })(),
      settings: {
        aiSettings: loadLocalObject(AI_SETTINGS_KEY),
        questionSpeechSettings: loadLocalObject(QUESTION_SPEECH_SETTINGS_KEY)
      }
    };
    return cloudState.localSnapshot;
  }

  function hasLocalMigrationData() {
    var snapshot = cloudState.localSnapshot || captureLocalMigrationSnapshot();
    return ["accounts", "companies", "esEntries", "interviewLogs"].some(function (key) {
      return Array.isArray(snapshot[key]) && snapshot[key].length > 0;
    });
  }

  function mergeRecordsById(primary, secondary) {
    var map = new Map();
    (Array.isArray(primary) ? primary : []).forEach(function (item) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });
    (Array.isArray(secondary) ? secondary : []).forEach(function (item) {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values()).sort(function (a, b) {
      return String(b.updatedAt || b.savedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.savedAt || a.createdAt || ""));
    });
  }

  function getCloudMigrationState() {
    try {
      return JSON.parse(localStorage.getItem(CLOUD_MIGRATION_KEY) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function hasMigratedToCloud(uid) {
    var state = getCloudMigrationState();
    return Boolean(uid && state[uid]);
  }

  function markMigratedToCloud(uid) {
    if (!uid) {
      return;
    }
    try {
      var state = getCloudMigrationState();
      state[uid] = new Date().toISOString();
      localStorage.setItem(CLOUD_MIGRATION_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Cloud migration state could not be saved:", error);
    }
  }

  function queueCloudCollectionSave(collectionName, items) {
    if (!isCloudSignedIn() || !collectionName) {
      return;
    }
    clearTimeout(cloudState.saveTimers[collectionName]);
    cloudState.saveTimers[collectionName] = setTimeout(function () {
      cloudState.service.replaceCollection(cloudState.user.uid, collectionName, items).catch(function (error) {
        cloudState.lastError = error && error.message ? error.message : String(error);
        renderCloudAuthState("クラウド保存に失敗しました: " + cloudState.lastError, "error");
      });
    }, 250);
  }

  function queueCloudProfileSave() {
    if (!isCloudSignedIn()) {
      return;
    }
    var profile = Object.assign({}, cloudState.profile || {}, {
      activeAccountId: appState.activeAccountId || null
    });
    cloudState.profile = profile;
    cloudState.service.saveProfile(cloudState.user.uid, profile).catch(function (error) {
      console.warn("Cloud profile save failed:", error);
    });
  }

  function queueCloudSettingsSave(settings) {
    if (!isCloudSignedIn()) {
      return;
    }
    cloudState.service.saveSettings(cloudState.user.uid, {
      aiSettings: settings || loadAiSettings(),
      questionSpeechSettings: loadLocalObject(QUESTION_SPEECH_SETTINGS_KEY)
    }).catch(function (error) {
      console.warn("Cloud settings save failed:", error);
    });
  }

  function upsertGoogleAccount(user) {
    if (!user || !user.uid) {
      return null;
    }
    var accounts = Array.isArray(cloudState.accounts) ? cloudState.accounts.slice() : loadAccounts();
    var existingIndex = accounts.findIndex(function (account) {
      return account.id === user.uid;
    });
    var timestamp = nowIso();
    var account = Object.assign({}, existingIndex >= 0 ? accounts[existingIndex] : {}, {
      id: user.uid,
      displayName: user.displayName || user.email || "Googleユーザー",
      email: user.email || "",
      photoURL: user.photoURL || "",
      provider: "google",
      updatedAt: timestamp
    });
    if (!account.createdAt) {
      account.createdAt = timestamp;
    }
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.unshift(account);
    }
    cloudState.accounts = accounts;
    queueCloudCollectionSave("accounts", accounts);
    return account;
  }

  function applyCloudData(user, data) {
    cloudState.user = user || null;
    cloudState.profile = Object.assign({}, data && data.profile ? data.profile : {});
    cloudState.settings = Object.assign({}, data && data.settings ? data.settings : {});
    cloudState.accounts = Array.isArray(data && data.accounts) ? data.accounts.slice() : [];
    cloudState.companies = Array.isArray(data && data.companies) ? data.companies.slice() : [];
    cloudState.esEntries = Array.isArray(data && data.esEntries) ? data.esEntries.slice() : [];
    cloudState.interviewLogs = Array.isArray(data && data.interviewLogs) ? data.interviewLogs.slice() : [];
    upsertGoogleAccount(user);
    var activeId = cloudState.profile.activeAccountId || (user && user.uid);
    if (activeId && cloudState.accounts.some(function (account) {
      return account.id === activeId;
    })) {
      rememberActiveAccount(activeId);
    } else if (user && user.uid) {
      rememberActiveAccount(user.uid);
    }
    var companies = getAccountCompanies(appState.activeAccountId);
    appState.selectedCompanyId = companies.length ? companies[0].id : null;
  }

  function renderCloudAuthState(message, mode) {
    var panel = document.querySelector(".cloud-auth-panel");
    var signInButton = $("googleSignInBtn");
    var signOutButton = $("googleSignOutBtn");
    var migrateButton = $("migrateLocalDataBtn");
    if (panel && panel.classList) {
      panel.classList.remove("is-connected", "is-error");
      if (mode === "connected") {
        panel.classList.add("is-connected");
      } else if (mode === "error") {
        panel.classList.add("is-error");
      }
    }
    if (signInButton) {
      signInButton.hidden = Boolean(cloudState.user);
      signInButton.disabled = cloudState.loading || !cloudState.configured;
    }
    if (signOutButton) {
      signOutButton.hidden = !cloudState.user;
      signOutButton.disabled = cloudState.loading;
    }
    if (migrateButton) {
      migrateButton.hidden = !cloudState.user || !hasLocalMigrationData() || hasMigratedToCloud(cloudState.user.uid);
      migrateButton.disabled = cloudState.loading;
    }
    var switchAccountButton = $("switchAccountBtn");
    if (switchAccountButton) {
      switchAccountButton.textContent = cloudState.user ? "ログアウト" : "アカウント切替";
    }
    if (message) {
      setText("cloudSyncStatus", message);
      return;
    }
    if (!cloudState.service) {
      setText("cloudSyncStatus", "Firebase連携モジュールを読み込み中です。");
    } else if (!cloudState.configured) {
      setText("cloudSyncStatus", "Firebase設定が未設定です。docs/google-firebase-setup.md に沿って window.AI_INTERVIEW_FIREBASE_CONFIG を設定してください。");
    } else if (cloudState.loading) {
      setText("cloudSyncStatus", "クラウドデータを同期中です...");
    } else if (cloudState.user) {
      setText("cloudSyncStatus", "Googleログイン中: " + (cloudState.user.email || cloudState.user.displayName || cloudState.user.uid));
    } else {
      setText("cloudSyncStatus", "Googleでログインすると、この端末のデータをFirestoreへ移行し、以後クラウド保存できます。");
    }
  }

  async function handleCloudUser(user) {
    cloudState.user = user || null;
    if (!user) {
      cloudState.ready = false;
      cloudState.accounts = null;
      cloudState.companies = null;
      cloudState.esEntries = null;
      cloudState.interviewLogs = null;
      rememberActiveAccount(null);
      appState.selectedCompanyId = null;
      appState.pendingSourceCompanyId = null;
      renderSourceEsPreview(null, []);
      renderCloudAuthState("ログアウトしました。ローカルデータのみ使用します。", "");
      renderAccounts();
      renderWorkspace();
      if (!hasUnsavedInterviewProgress()) {
        showView("accountView");
      }
      return;
    }
    cloudState.loading = true;
    renderCloudAuthState("Googleログインを確認しました。クラウドデータを読み込み中です...", "connected");
    try {
      var data = await cloudState.service.loadUserData(user.uid);
      cloudState.ready = true;
      applyCloudData(user, data);
      renderAccounts();
      renderWorkspace();
      renderAiSettings();
      if (!hasUnsavedInterviewProgress()) {
        showView(appState.activeAccountId ? "workspaceView" : "accountView");
      }
      renderCloudAuthState(null, "connected");
      queueCloudProfileSave();
    } catch (error) {
      cloudState.ready = false;
      cloudState.lastError = error && error.message ? error.message : String(error);
      renderCloudAuthState("クラウドデータの読み込みに失敗しました: " + cloudState.lastError, "error");
    } finally {
      cloudState.loading = false;
      renderCloudAuthState(null, cloudState.user ? "connected" : "");
    }
  }

  function initializeCloudIntegration() {
    function attach(service) {
      if (!service || cloudState.service) {
        return;
      }
      cloudState.service = service;
      cloudState.configured = Boolean(service.getStatus && service.getStatus().configured);
      renderCloudAuthState(null, "");
      service.init().then(function (status) {
        cloudState.configured = Boolean(status && status.enabled);
        renderCloudAuthState(null, "");
        service.onAuthStateChanged(function (user, authStatus) {
          cloudState.configured = Boolean(authStatus && authStatus.enabled);
          if (!cloudState.configured) {
            renderCloudAuthState(null, "");
            return;
          }
          handleCloudUser(user);
        });
      }).catch(function (error) {
        cloudState.lastError = error && error.message ? error.message : String(error);
        renderCloudAuthState("Firebase初期化に失敗しました: " + cloudState.lastError, "error");
      });
    }
    if (window.aiInterviewCloud) {
      attach(window.aiInterviewCloud);
    } else {
      window.addEventListener("aiInterviewCloudReady", function (event) {
        attach(event.detail || window.aiInterviewCloud);
      }, { once: true });
      renderCloudAuthState(null, "");
    }
  }

  async function signInWithGoogle(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (!cloudState.service || !cloudState.configured) {
      renderCloudAuthState("Firebase設定が未設定です。先にFirebase Web app configを設定してください。", "error");
      return;
    }
    captureLocalMigrationSnapshot();
    cloudState.loading = true;
    renderCloudAuthState("Googleログインを開始しています...", "");
    try {
      await cloudState.service.signInWithGoogle();
    } catch (error) {
      cloudState.lastError = error && error.message ? error.message : String(error);
      renderCloudAuthState("Googleログインに失敗しました: " + cloudState.lastError, "error");
    } finally {
      cloudState.loading = false;
      renderCloudAuthState(null, cloudState.user ? "connected" : "");
    }
  }

  async function signOutGoogle(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (!cloudState.service || !cloudState.user) {
      return;
    }
    cloudState.loading = true;
    renderCloudAuthState("ログアウト中です...", "");
    try {
      await cloudState.service.signOutGoogle();
    } catch (error) {
      cloudState.lastError = error && error.message ? error.message : String(error);
      renderCloudAuthState("ログアウトに失敗しました: " + cloudState.lastError, "error");
    } finally {
      cloudState.loading = false;
    }
  }

  async function migrateLocalDataToCloud(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    if (!isCloudSignedIn()) {
      renderCloudAuthState("先にGoogleログインしてください。", "error");
      return;
    }
    if (!hasLocalMigrationData()) {
      renderCloudAuthState("移行できるlocalStorageデータはありません。", "connected");
      return;
    }
    cloudState.loading = true;
    renderCloudAuthState("この端末のlocalStorageデータをFirestoreへ移行中です...", "connected");
    try {
      var snapshot = cloudState.localSnapshot || captureLocalMigrationSnapshot();
      var data = {
        profile: { activeAccountId: snapshot.activeAccountId || appState.activeAccountId || cloudState.user.uid },
        accounts: mergeRecordsById(snapshot.accounts, cloudState.accounts),
        companies: mergeRecordsById(snapshot.companies, cloudState.companies),
        esEntries: mergeRecordsById(snapshot.esEntries, cloudState.esEntries),
        interviewLogs: mergeRecordsById(snapshot.interviewLogs, cloudState.interviewLogs),
        settings: snapshot.settings || {}
      };
      var migrated = await cloudState.service.migrateLocalDataToCloud(cloudState.user.uid, data);
      applyCloudData(cloudState.user, migrated);
      markMigratedToCloud(cloudState.user.uid);
      renderAccounts();
      renderWorkspace();
      renderHistory();
      renderCloudAuthState("localStorageデータをFirestoreへ移行しました。", "connected");
    } catch (error) {
      cloudState.lastError = error && error.message ? error.message : String(error);
      renderCloudAuthState("localStorage移行に失敗しました: " + cloudState.lastError, "error");
    } finally {
      cloudState.loading = false;
      renderCloudAuthState(null, cloudState.user ? "connected" : "");
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

  function isRandomInterviewerType(value) {
    return value === RANDOM_INTERVIEWER_TYPE_ID;
  }

  function getSelectableInterviewerOptions() {
    return [RANDOM_INTERVIEWER_OPTION].concat(INTERVIEWER_TYPES);
  }

  function pickRandomInterviewerType() {
    return INTERVIEWER_TYPES[Math.floor(Math.random() * INTERVIEWER_TYPES.length)] || INTERVIEWER_TYPES[0];
  }

  function resolveInterviewerSettings(settings) {
    var result = Object.assign({}, settings || {});
    var selected = result.interviewerType || DEFAULT_SETTINGS.interviewerType;
    if (isRandomInterviewerType(selected)) {
      var picked = pickRandomInterviewerType();
      result.interviewerTypeMode = "random";
      result.interviewerTypeSelection = RANDOM_INTERVIEWER_TYPE_ID;
      result.requestedInterviewerType = RANDOM_INTERVIEWER_TYPE_ID;
      result.interviewerType = picked.id;
      return result;
    }
    var type = getInterviewerType(selected);
    result.interviewerTypeMode = "fixed";
    result.interviewerTypeSelection = type.id;
    result.requestedInterviewerType = type.id;
    result.interviewerType = type.id;
    return result;
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
    getSelectableInterviewerOptions().forEach(function (type) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "interviewer-avatar-option" + (type.id === currentValue ? " is-selected" : "");
      button.dataset.interviewerType = type.id;
      button.dataset.action = "select-interviewer-type";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", type.id === currentValue ? "true" : "false");
      button.setAttribute("aria-label", isRandomInterviewerType(type.id) ? "ランダム。開始時に面接官タイプを決定" : type.label);
      button.tabIndex = type.id === currentValue ? 0 : -1;
      if (isRandomInterviewerType(type.id)) {
        var randomMark = document.createElement("span");
        randomMark.className = "interviewer-random-mark";
        randomMark.textContent = "?";
        button.className += " is-random";
        button.appendChild(randomMark);
      } else {
        var image = document.createElement("img");
        image.src = type.image;
        image.alt = "";
        button.appendChild(image);
      }
      grid.appendChild(button);
    });
  }

  function updateCurrentInterviewerAvatar(value) {
    var avatar = $("currentInterviewerAvatar");
    var persona = $("currentInterviewerPersona");
    var setupDescription = $("interviewerPersonaDescription");
    if (isRandomInterviewerType(value)) {
      if (setupDescription) {
        setupDescription.textContent = "質問の思考: " + RANDOM_INTERVIEWER_OPTION.description;
      }
      return;
    }
    var type = getInterviewerType(value || DEFAULT_SETTINGS.interviewerType);
    if (avatar) {
      avatar.src = type.image;
      avatar.alt = "";
    }
    if (persona) {
      persona.textContent = "今回の面接官: " + type.label + " / " + type.description;
    }
    if (setupDescription) {
      setupDescription.textContent = "質問の思考: " + type.description;
    }
  }

  function selectInterviewerType(value) {
    if (isRandomInterviewerType(value)) {
      setValue("interviewerTypeSelect", RANDOM_INTERVIEWER_TYPE_ID);
      updateCurrentInterviewerAvatar(RANDOM_INTERVIEWER_TYPE_ID);
      renderInterviewerAvatarGrid();
      return;
    }
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

  function getAccountInterviewLogs(accountId) {
    return loadInterviewLogs().filter(function (log) {
      return log.accountId === accountId;
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
    queueCloudProfileSave();
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
      var selectButton = document.createElement("button");
      var actions = document.createElement("div");
      var editButton = document.createElement("button");
      var deleteButton = document.createElement("button");
      item.className = "account-item" + (account.id === appState.activeAccountId ? " is-selected" : "");
      selectButton.type = "button";
      selectButton.className = "account-item-select";
      selectButton.dataset.accountId = account.id;
      selectButton.dataset.action = "select-account";
      selectButton.textContent = account.displayName + (account.email ? " / " + account.email : "");
      actions.className = "form-actions";
      editButton.type = "button";
      editButton.className = "button button-secondary button-small";
      editButton.dataset.accountId = account.id;
      editButton.dataset.action = "edit-account";
      editButton.textContent = "編集";
      deleteButton.type = "button";
      deleteButton.className = "button button-danger button-small";
      deleteButton.dataset.accountId = account.id;
      deleteButton.dataset.action = "delete-account";
      deleteButton.textContent = "削除";
      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      item.appendChild(selectButton);
      item.appendChild(actions);
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
        var selectButton = document.createElement("button");
        var title = document.createElement("span");
        var meta = document.createElement("span");
        var notes = document.createElement("span");
        var actions = document.createElement("div");
        var editButton = document.createElement("button");
        var duplicateButton = document.createElement("button");
        var deleteButton = document.createElement("button");

        item.className = "company-item" + (company.id === appState.selectedCompanyId ? " is-selected" : "");

        selectButton.type = "button";
        selectButton.className = "company-card-select";
        selectButton.dataset.companyId = company.id;
        selectButton.dataset.action = "select-company";
        title.className = "company-card-title";
        title.textContent = company.companyName || "企業名未設定";
        meta.className = "company-card-meta";
        meta.textContent = [company.role || "職種未設定", company.stage || "応募区分未設定"].join(" / ");
        notes.className = "company-card-notes";
        notes.textContent = company.notes || "企業メモなし";
        selectButton.appendChild(title);
        selectButton.appendChild(meta);
        selectButton.appendChild(notes);

        actions.className = "form-actions";

        editButton.type = "button";
        editButton.className = "button button-secondary button-small";
        editButton.dataset.companyId = company.id;
        editButton.dataset.action = "edit-company";
        editButton.textContent = "編集";

        duplicateButton.type = "button";
        duplicateButton.className = "button button-secondary button-small";
        duplicateButton.dataset.companyId = company.id;
        duplicateButton.dataset.action = "duplicate-company";
        duplicateButton.textContent = "複製";

        deleteButton.type = "button";
        deleteButton.className = "button button-danger button-small";
        deleteButton.dataset.companyId = company.id;
        deleteButton.dataset.action = "delete-company";
        deleteButton.textContent = "削除";

        actions.appendChild(editButton);
        actions.appendChild(duplicateButton);
        actions.appendChild(deleteButton);

        item.appendChild(selectButton);
        item.appendChild(actions);
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
      item.className = "es-entry-item" + (entry.id === appState.editingEsEntryId ? " is-editing" : "");

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

      var editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "button button-secondary button-small";
      editButton.dataset.esEntryId = entry.id;
      editButton.dataset.action = "edit-es-entry";
      editButton.textContent = "編集";
      actions.appendChild(editButton);

      var duplicateButton = document.createElement("button");
      duplicateButton.type = "button";
      duplicateButton.className = "button button-secondary button-small";
      duplicateButton.dataset.esEntryId = entry.id;
      duplicateButton.dataset.action = "duplicate-es-entry";
      duplicateButton.textContent = "複製";
      actions.appendChild(duplicateButton);

      var deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "button button-danger button-small";
      deleteButton.dataset.esEntryId = entry.id;
      deleteButton.dataset.action = "delete-es-entry";
      deleteButton.textContent = "削除";
      actions.appendChild(deleteButton);

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
    var accounts = loadAccounts();

    if (appState.editingAccountId) {
      var target = accounts.find(function (item) {
        return item.id === appState.editingAccountId;
      });
      if (!target) {
        cancelAccountEdit();
        renderAccounts();
        return;
      }
      target.displayName = displayName;
      target.email = email;
      target.updatedAt = timestamp;
      saveAccounts(accounts);
      cancelAccountEdit();
      renderAccounts();
      return;
    }

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

  function ensureCancelAccountEditButton() {
    var existing = $("cancelAccountEditBtn");
    if (existing) {
      return existing;
    }
    var form = $("accountForm");
    var actions = form ? form.querySelector(".form-actions") : null;
    if (!actions) {
      return null;
    }
    var button = document.createElement("button");
    button.type = "button";
    button.id = "cancelAccountEditBtn";
    button.className = "button button-ghost button-small";
    button.textContent = "編集をキャンセル";
    button.addEventListener("click", function () {
      cancelAccountEdit();
    });
    actions.appendChild(button);
    return button;
  }

  function removeCancelAccountEditButton() {
    var existing = $("cancelAccountEditBtn");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  function startEditAccount(accountId) {
    var account = loadAccounts().find(function (item) {
      return item.id === accountId;
    });
    if (!account) {
      return;
    }
    appState.editingAccountId = account.id;
    setValue("accountNameInput", account.displayName);
    setValue("accountEmailInput", account.email || "");
    setText("createAccountBtn", "変更を保存");
    ensureCancelAccountEditButton();
    var nameInput = $("accountNameInput");
    if (nameInput && typeof nameInput.focus === "function") {
      nameInput.focus();
    }
  }

  function cancelAccountEdit() {
    appState.editingAccountId = null;
    setValue("accountNameInput", "");
    setValue("accountEmailInput", "");
    setText("createAccountBtn", "作成して始める");
    removeCancelAccountEditButton();
  }

  function deleteAccountCascade(accountId) {
    var account = loadAccounts().find(function (item) {
      return item.id === accountId;
    });
    if (!account) {
      return;
    }
    var confirmed = window.confirm(
      "「" + account.displayName + "」を削除します。このアカウントに紐づく企業・ES・面接履歴もすべて削除されます。この操作は元に戻せません。よろしいですか？"
    );
    if (!confirmed) {
      return;
    }

    if (appState.editingAccountId === accountId) {
      cancelAccountEdit();
    }

    var remainingAccounts = loadAccounts().filter(function (item) {
      return item.id !== accountId;
    });
    saveAccounts(remainingAccounts);

    var remainingCompanies = loadCompanies().filter(function (company) {
      return company.accountId !== accountId;
    });
    saveCompanies(remainingCompanies);

    var remainingEsEntries = loadEsEntries().filter(function (entry) {
      return entry.accountId !== accountId;
    });
    saveEsEntries(remainingEsEntries);

    var remainingLogs = loadInterviewLogs().filter(function (log) {
      return log.accountId !== accountId;
    });
    saveInterviewLogs(remainingLogs);

    if (appState.activeAccountId === accountId) {
      appState.editingCompanyId = null;
      appState.editingEsEntryId = null;
      selectAccount(null);
      return;
    }

    renderAccounts();
  }

  function selectAccount(accountId) {
    var account = loadAccounts().find(function (item) {
      return item.id === accountId;
    });
    if (appState.editingCompanyId) {
      cancelEditCompany();
    }
    if (appState.editingEsEntryId) {
      resetEsEditingState();
    }
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
    var companies = loadCompanies();
    var company = null;

    if (appState.editingCompanyId) {
      company = companies.find(function (item) {
        return item.id === appState.editingCompanyId && item.accountId === appState.activeAccountId;
      }) || null;
    }

    if (company) {
      company.companyName = companyName;
      company.role = getValue("companyRoleInput", "");
      company.stage = getValue("companyStageInput", "");
      company.notes = getValue("companyNotesInput", "");
      company.updatedAt = timestamp;
    } else {
      company = {
        id: makeId("company"),
        accountId: appState.activeAccountId,
        companyName: companyName,
        role: getValue("companyRoleInput", ""),
        stage: getValue("companyStageInput", ""),
        notes: getValue("companyNotesInput", ""),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      companies.unshift(company);
    }

    saveCompanies(companies);
    if (appState.editingEsEntryId && appState.selectedCompanyId !== company.id) {
      resetEsEditingState();
    }
    appState.selectedCompanyId = company.id;
    appState.editingCompanyId = null;
    applyCompanyToSetup(company);
    setValue("companyNameInput", "");
    setValue("companyRoleInput", "");
    setValue("companyStageInput", "");
    setValue("companyNotesInput", "");
    updateCompanyFormMode();
    renderWorkspace();
  }

  function updateCompanyFormMode() {
    var isEditing = Boolean(appState.editingCompanyId);
    setText("saveCompanyBtn", isEditing ? "変更を保存" : "企業を保存");
    var cancelButton = $("cancelEditCompanyBtn");
    if (cancelButton) {
      cancelButton.hidden = !isEditing;
    }
  }

  function startEditCompany(companyId) {
    var company = findCompany(companyId, appState.activeAccountId);
    if (!company) {
      return;
    }
    appState.editingCompanyId = company.id;
    setValue("companyNameInput", company.companyName || "");
    setValue("companyRoleInput", company.role || "");
    setValue("companyStageInput", company.stage || "");
    setValue("companyNotesInput", company.notes || "");
    updateCompanyFormMode();
  }

  function cancelEditCompany() {
    appState.editingCompanyId = null;
    setValue("companyNameInput", "");
    setValue("companyRoleInput", "");
    setValue("companyStageInput", "");
    setValue("companyNotesInput", "");
    updateCompanyFormMode();
  }

  function duplicateCompany(companyId) {
    var company = findCompany(companyId, appState.activeAccountId);
    if (!company) {
      return;
    }
    var timestamp = nowIso();
    var duplicate = {
      id: makeId("company"),
      accountId: company.accountId,
      companyName: (company.companyName || "") + "（コピー）",
      role: company.role || "",
      stage: company.stage || "",
      notes: company.notes || "",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    var companies = loadCompanies();
    companies.unshift(duplicate);
    saveCompanies(companies);
    if (appState.editingEsEntryId) {
      resetEsEditingState();
    }
    appState.selectedCompanyId = duplicate.id;
    if (appState.editingCompanyId === companyId) {
      cancelEditCompany();
    }
    renderWorkspace();
  }

  function deleteCompany(companyId) {
    var company = findCompany(companyId, appState.activeAccountId);
    if (!company) {
      return;
    }
    var companyName = company.companyName || "企業名未設定";
    var confirmed = window.confirm(
      "「" + companyName + "」を削除します。この企業に紐づくESもすべて削除されます。この操作は元に戻せません。よろしいですか？"
    );
    if (!confirmed) {
      return;
    }

    var companies = loadCompanies().filter(function (item) {
      return item.id !== companyId || item.accountId !== appState.activeAccountId;
    });
    saveCompanies(companies);

    var removingEditedEsEntry = appState.editingEsEntryId && loadEsEntries().some(function (entry) {
      return entry.id === appState.editingEsEntryId && entry.companyId === companyId;
    });
    var esEntries = loadEsEntries().filter(function (entry) {
      return entry.companyId !== companyId || entry.accountId !== appState.activeAccountId;
    });
    saveEsEntries(esEntries);
    if (removingEditedEsEntry) {
      resetEsEditingState();
    }

    if (appState.editingCompanyId === companyId) {
      cancelEditCompany();
    }
    if (appState.selectedCompanyId === companyId) {
      appState.selectedCompanyId = null;
    }

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
    var hasMaxChars = Number.isFinite(maxChars) && maxChars > 0;
    var answerText = getRawValue("esAnswerInput", "");
    if (hasMaxChars && answerText.length > maxChars) {
      setText("esCharCount", "文字数制限（" + maxChars + "文字）を超えています。回答を短くしてから保存してください。");
      return;
    }

    var timestamp = nowIso();
    var entries = loadEsEntries();

    if (appState.editingEsEntryId) {
      var existingEntry = entries.find(function (item) {
        return item.id === appState.editingEsEntryId && item.accountId === accountId && item.companyId === companyId;
      });
      if (existingEntry) {
        existingEntry.questionText = questionText;
        existingEntry.answerText = answerText;
        existingEntry.maxChars = hasMaxChars ? maxChars : null;
        existingEntry.category = normalizeCategory(getValue("esCategorySelect", DEFAULT_SETTINGS.category));
        existingEntry.status = getValue("esStatusSelect", "draft") || "draft";
        existingEntry.updatedAt = timestamp;
      }
    } else {
      var entry = {
        id: makeId("es"),
        accountId: accountId,
        companyId: companyId,
        questionText: questionText,
        answerText: answerText,
        maxChars: hasMaxChars ? maxChars : null,
        category: normalizeCategory(getValue("esCategorySelect", DEFAULT_SETTINGS.category)),
        status: getValue("esStatusSelect", "draft") || "draft",
        createdAt: timestamp,
        updatedAt: timestamp
      };
      entries.unshift(entry);
    }

    saveEsEntries(entries);
    resetEsEditingState();
    renderEsEntries();
    renderSetupCompanySelect();
  }

  function resetEsEditingState() {
    appState.editingEsEntryId = null;
    setValue("esQuestionInput", "");
    setValue("esAnswerInput", "");
    updateEsEditModeUi();
    updateEsCharCount();
  }

  function updateEsEditModeUi() {
    var saveButton = $("saveEsBtn");
    var isEditing = !!appState.editingEsEntryId;
    if (saveButton) {
      saveButton.textContent = isEditing ? "変更を保存" : "ESを保存";
    }
    if (isEditing) {
      var cancelButton = getOrCreateEsCancelEditButton();
      if (cancelButton) {
        cancelButton.style.display = "";
      }
    } else {
      var existingCancelButton = $("esCancelEditBtn");
      if (existingCancelButton) {
        existingCancelButton.style.display = "none";
      }
    }
  }

  function getOrCreateEsCancelEditButton() {
    var existing = $("esCancelEditBtn");
    if (existing) {
      return existing;
    }
    var saveButton = $("saveEsBtn");
    if (!saveButton || !saveButton.parentNode) {
      return null;
    }
    var cancelButton = document.createElement("button");
    cancelButton.id = "esCancelEditBtn";
    cancelButton.type = "button";
    cancelButton.className = "button button-ghost";
    cancelButton.textContent = "編集をキャンセル";
    cancelButton.addEventListener("click", function () {
      cancelEditEsEntry();
    });
    saveButton.parentNode.insertBefore(cancelButton, saveButton.nextSibling);
    return cancelButton;
  }

  function startEditEsEntry(entryId) {
    var entry = findEsEntry(entryId);
    if (!entry) {
      return;
    }
    appState.editingEsEntryId = entry.id;
    setValue("esQuestionInput", entry.questionText || "");
    setValue("esAnswerInput", entry.answerText || "");
    setValue("esMaxCharsInput", entry.maxChars ? String(entry.maxChars) : "");
    setValue("esCategorySelect", normalizeCategory(entry.category));
    setValue("esStatusSelect", entry.status || "draft");
    updateEsEditModeUi();
    updateEsCharCount();
    renderEsEntries();
  }

  function cancelEditEsEntry() {
    resetEsEditingState();
    renderEsEntries();
  }

  function deleteEsEntry(entryId) {
    var entry = findEsEntry(entryId);
    if (!entry) {
      return;
    }
    var preview = String(entry.questionText || "").slice(0, 30);
    var confirmed = window.confirm("「" + preview + "」のESを削除します。この操作は元に戻せません。よろしいですか？");
    if (!confirmed) {
      return;
    }
    var entries = loadEsEntries().filter(function (item) {
      return item.id !== entryId || item.accountId !== appState.activeAccountId;
    });
    saveEsEntries(entries);
    if (appState.editingEsEntryId === entryId) {
      resetEsEditingState();
    }
    renderEsEntries();
    renderSetupCompanySelect();
  }

  function duplicateEsEntry(entryId) {
    var entry = findEsEntry(entryId);
    if (!entry) {
      return;
    }
    var timestamp = nowIso();
    var duplicate = {
      id: makeId("es"),
      accountId: entry.accountId,
      companyId: entry.companyId,
      questionText: (entry.questionText || "") + "（コピー）",
      answerText: entry.answerText,
      maxChars: entry.maxChars,
      category: entry.category,
      status: entry.status,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    var entries = loadEsEntries();
    entries.unshift(duplicate);
    saveEsEntries(entries);
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
    if (appState.editingEsEntryId) {
      resetEsEditingState();
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
      questionSource: getValue("questionSourceSelect", DEFAULT_SETTINGS.questionSource),
      interviewerType: getValue("interviewerTypeSelect", DEFAULT_SETTINGS.interviewerType),
      questionCount: Math.max(1, parseInt(getValue("questionCountSelect", DEFAULT_SETTINGS.questionCount), 10) || DEFAULT_SETTINGS.questionCount),
      userProfile: getRawValue("userProfileInput", ""),
      cameraEnabled: (function () {
        var checkbox = $("cameraEnabledInput");
        return Boolean(checkbox && checkbox.checked);
      })()
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
    queueCloudSettingsSave(copy);
    updateAiStatus();
  }

  function saveAiSettingsFromForm(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    var remember = $("rememberApiKeyInput");
    var apiKey = getValue("openAiApiKeyInput", "");
    var mode = getValue("aiModeSelect", DEFAULT_AI_SETTINGS.mode);
    saveAiSettings({
      apiKey: apiKey,
      model: getValue("openAiModelInput", DEFAULT_AI_SETTINGS.model),
      mode: mode,
      rememberApiKey: remember ? remember.checked : false
    });
    setText("aiSettingsMessage", mode === "openai" && !apiKey
      ? "AI設定を保存しましたが、OpenAI APIキーが未入力のためモック評価が使われます。"
      : "AI設定を保存しました。");
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
    queueCloudSettingsSave({
      mode: "mock",
      model: DEFAULT_AI_SETTINGS.model,
      rememberApiKey: false
    });
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

  function objectArraySchema(properties) {
    return {
      type: "array",
      items: jsonSchema(properties)
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
      questionCategory: { type: "string" },
      intentLabel: { type: "string" },
      questionIntent: { type: "string" },
      mustInclude: stringArraySchema(),
      shouldInclude: stringArraySchema(),
      goodSignals: stringArraySchema(),
      riskSignals: stringArraySchema(),
      evidenceFields: stringArraySchema(),
      rubricLevels: objectArraySchema({
        axis: { type: "string" },
        level: { type: "number" },
        label: { type: "string" },
        description: { type: "string" },
        requiredEvidenceKeys: stringArraySchema()
      }),
      fairnessRisks: stringArraySchema(),
      unverifiedClaims: stringArraySchema(),
      scoreConfidence: { type: "string" },
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

  function topicResultSchema() {
    return jsonSchema({
      topicId: { type: "string" },
      status: { type: "string" },
      reason: { type: "string" }
    });
  }

  var schemas = {
    connection_test: jsonSchema({
      message: { type: "string" }
    }),
    interview_question: jsonSchema({
      question: { type: "string" },
      topicId: { type: "string" }
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
      unverifiedClaims: stringArraySchema(),
      fairnessFlags: stringArraySchema(),
      scoreConfidence: { type: "string" },
      esConsistency: esConsistencySchema(),
      scoringRationale: { type: "string" },
      deepDiveQuestion: { type: "string" },
      shouldAskDeepDive: { type: "boolean" },
      followUpReason: { type: "string" },
      followUpTarget: { type: "string" },
      topicResult: topicResultSchema(),
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
      "面接官タイプ: " + formatInterviewerType(safeSettings.interviewerType) + (safeSettings.interviewerTypeMode === "random" ? "（ランダム選択で決定）" : ""),
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

  var EXPECTED_ANSWER_CATEGORY_TEMPLATES = {
    self_pr: {
      intentLabel: "strength_job_fit",
      evidenceFields: ["claim", "specific_episode", "action", "result", "learning", "job_relevance"],
      mustInclude: ["強みの結論", "強みを示す具体的経験", "本人の行動", "成果または変化", "応募職種での活かし方"],
      shouldInclude: ["行動の理由", "周囲への影響", "再現できる行動特性"],
      followUpFocus: ["その強みを再現できる根拠", "他者と比べた独自性", "職種での具体的な活用場面"]
    },
    motivation: {
      intentLabel: "company_role_motivation",
      evidenceFields: ["company_understanding", "personal_reason", "role_fit", "past_evidence", "future_contribution"],
      mustInclude: ["志望理由の結論", "企業や事業への理解", "自分の経験や価値観との接点", "職種での貢献"],
      shouldInclude: ["同業他社ではない理由", "入社後に取り組みたいこと", "企業メモやESとの一貫性"],
      followUpFocus: ["なぜこの企業なのか", "なぜこの職種なのか", "入社後の貢献の具体性"]
    },
    student_life: {
      intentLabel: "behavioral_achievement",
      evidenceFields: ["context", "challenge", "team_role", "action", "result", "learning"],
      mustInclude: ["取り組みの背景", "課題", "本人の役割", "具体的行動", "結果", "学び"],
      shouldInclude: ["周囲との関わり", "工夫した点", "次に活かせる再現性"],
      followUpFocus: ["本人の貢献範囲", "困難への対処", "成果の根拠"]
    },
    research: {
      intentLabel: "research_thinking",
      evidenceFields: ["research_theme", "background", "purpose", "method", "difficulty", "originality", "result", "plain_language_summary"],
      mustInclude: ["研究テーマ", "背景と目的", "手法", "本人の工夫", "結果または現状", "専門外にも伝わる説明"],
      shouldInclude: ["仮説検証", "失敗や改善", "仕事への転用可能性"],
      followUpFocus: ["研究の新規性", "検証方法", "本人の貢献範囲"]
    },
    technical: {
      intentLabel: "technical_problem_solving",
      evidenceFields: ["problem", "technical_choice", "implementation_role", "architecture", "tradeoff", "ai_or_automation_use", "testing_review", "security_or_performance", "operation_feedback", "outcome"],
      mustInclude: ["解いた課題", "担当範囲", "技術選定の理由", "設計判断とトレードオフ", "検証・テスト・レビュー", "結果"],
      shouldInclude: ["代替案との比較", "性能・セキュリティ・保守性への配慮", "生成AIや自動化ツール利用時の検証方法", "リリース後の改善"],
      followUpFocus: ["なぜその技術を選んだか", "捨てた選択肢とトレードオフ", "品質をどう担保したか", "AIや自動化の出力をどう検証したか", "運用後の改善につなげたか"]
    },
    failure: {
      intentLabel: "reflection_recovery",
      evidenceFields: ["failure_context", "own_responsibility", "cause_analysis", "recovery_action", "prevention", "learning"],
      mustInclude: ["失敗の状況", "自分の責任範囲", "原因分析", "改善行動", "学び", "再発防止"],
      shouldInclude: ["周囲への影響", "現在の行動変化", "過度な責任転嫁をしない説明"],
      followUpFocus: ["原因をどう特定したか", "今なら何を変えるか", "学びの再現性"]
    },
    career: {
      intentLabel: "career_alignment",
      evidenceFields: ["career_goal", "reason", "current_gap", "learning_plan", "role_alignment"],
      mustInclude: ["将来像", "そう考える理由", "現在の経験との接続", "今後の学習や行動", "応募職種との整合"],
      shouldInclude: ["短期と中長期のつながり", "現実的な成長計画", "企業で実現したいこと"],
      followUpFocus: ["なぜそのキャリアなのか", "足りない力をどう補うか", "企業との相互適合"]
    },
    reverse_question: {
      intentLabel: "mutual_fit_inquiry",
      evidenceFields: ["question_relevance", "company_understanding", "decision_need", "depth", "professionalism"],
      mustInclude: ["企業理解に基づく質問", "職務やチームとの関連", "自分が判断したい観点", "公開情報だけで分かる質問にしない"],
      shouldInclude: ["質問の意図", "入社後の行動につながる観点", "面接官が答えやすい具体性"],
      followUpFocus: ["なぜそれを確認したいか", "回答をどう判断に使うか", "志望動機との接続"]
    },
    default: {
      intentLabel: "general_interview_fit",
      evidenceFields: ["answer_relevance", "claim", "context", "action", "result", "learning", "job_relevance"],
      mustInclude: ["質問への直接回答", "根拠になる具体的経験または判断", "本人の行動", "結果", "学びや再現性"],
      shouldInclude: ["企業や職種との接続", "数字や比較", "深掘りに耐える理由"],
      followUpFocus: ["なぜそう考えたか", "本人の役割", "成果の根拠", "職種との接点"]
    }
  };

  function getExpectedAnswerCategory(settings) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    if (safeSettings.category === "development" || safeSettings.interviewType === "technical") {
      return "technical";
    }
    if (safeSettings.category === "research" || safeSettings.interviewType === "research") {
      return "research";
    }
    if (EXPECTED_ANSWER_CATEGORY_TEMPLATES[safeSettings.category]) {
      return safeSettings.category;
    }
    return "default";
  }

  function getCategoryTemplate(category) {
    return EXPECTED_ANSWER_CATEGORY_TEMPLATES[category] || EXPECTED_ANSWER_CATEGORY_TEMPLATES.default;
  }

  function createDefaultRubricLevels() {
    return [
      {
        axis: "overall",
        level: 1,
        label: "不十分",
        description: "質問意図にほぼ答えておらず、具体的な行動・根拠・学びが不足している。",
        requiredEvidenceKeys: []
      },
      {
        axis: "overall",
        level: 2,
        label: "弱い",
        description: "主張はあるが、状況・本人の行動・成果のつながりが薄い。",
        requiredEvidenceKeys: ["claim"]
      },
      {
        axis: "overall",
        level: 3,
        label: "標準",
        description: "状況、本人の行動、結果が説明され、質問意図に概ね対応している。",
        requiredEvidenceKeys: ["context", "action", "result"]
      },
      {
        axis: "overall",
        level: 4,
        label: "良い",
        description: "行動の理由、工夫、困難への対処、再現できる学びがある。",
        requiredEvidenceKeys: ["context", "action", "reasoning", "result", "learning"]
      },
      {
        axis: "overall",
        level: 5,
        label: "非常に良い",
        description: "職務・企業文脈に接続し、判断理由・具体性・深掘り耐性まで明確である。",
        requiredEvidenceKeys: ["context", "action", "reasoning", "result", "learning", "job_relevance"]
      }
    ];
  }

  function createFairnessRisks() {
    return [
      "家族構成、出生地、住宅状況、生活環境、思想信条、宗教、支持政党など職務適性と関係ない情報は評価しない。",
      "性別、年齢、国籍、健康状態、障害、婚姻、育児・介護、外見、声質、訛りで加点・減点しない。",
      "学校名、所属ブランド、留学・長期インターン経験の有無だけで評価しない。回答中の行動と職務関連性を見る。"
    ];
  }

  function createUnverifiedClaimRules() {
    return [
      "ES、企業メモ、会話履歴にない実績・数字・固有名詞は事実として断定しない。",
      "回答者が新しく述べた事実は未確認の主張として扱い、採点根拠にする場合は説明の具体性に限定する。",
      "未確認情報は矛盾扱いせず、必要なら深掘り質問で確認する。"
    ];
  }

  function sanitizeRubricLevels(items, fallback) {
    var source = Array.isArray(items) && items.length ? items : fallback || createDefaultRubricLevels();
    return source.map(function (item) {
      return {
        axis: String(item && item.axis || "overall"),
        level: Number.isFinite(Number(item && item.level)) ? Math.max(1, Math.min(5, Number(item.level))) : 3,
        label: String(item && item.label || ""),
        description: String(item && item.description || ""),
        requiredEvidenceKeys: sanitizeStringArray(item && item.requiredEvidenceKeys, [])
      };
    }).filter(function (item) {
      return item.description;
    });
  }

  function normalizeScoreConfidence(value, fallback) {
    var normalized = String(value || fallback || "medium").toLowerCase();
    return ["high", "medium", "low"].indexOf(normalized) !== -1 ? normalized : "medium";
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
    var questionCategory = getExpectedAnswerCategory(safeSettings);
    var template = getCategoryTemplate(questionCategory);
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
    mustInclude = unique((template.mustInclude || []).concat(mustInclude));
    return {
      questionCategory: questionCategory,
      intentLabel: template.intentLabel || "general_interview_fit",
      questionIntent: "面接官が「" + question + "」で確認したい意図を、結論・根拠・再現性・企業適合の観点で満たすこと。",
      mustInclude: mustInclude,
      shouldInclude: unique((template.shouldInclude || []).concat([
        "背景、課題、行動、結果、学びの流れ",
        "数字、期間、人数、役割などの具体情報",
        "入社後または参加後にどう活かすか"
      ])),
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
      evidenceFields: template.evidenceFields || getCategoryTemplate("default").evidenceFields,
      rubricLevels: createDefaultRubricLevels(),
      fairnessRisks: createFairnessRisks(),
      unverifiedClaims: createUnverifiedClaimRules(),
      scoreConfidence: sourceEntries.length ? "medium" : "low",
      referenceFactsFromES: referenceFacts,
      suggestedStructure: ["結論", "背景", "自分の役割", "行動", "結果", "学び", "応募先での活かし方"],
      followUpFocus: unique((template.followUpFocus || []).concat(["なぜその行動を取ったか", "成果の根拠", "再現性", "応募企業・職種との接点"])),
      scoringRubric: normalizeScoringRubric(null),
      generatedBy: "mock",
      generatedAt: new Date().toISOString()
    };
  }

  function normalizeExpectedAnswerData(data, fallback) {
    var base = fallback || createFallbackExpectedAnswerData("", {});
    return {
      questionCategory: String(data && data.questionCategory || base.questionCategory || "default"),
      intentLabel: String(data && data.intentLabel || base.intentLabel || "general_interview_fit"),
      questionIntent: String(data && data.questionIntent || base.questionIntent || ""),
      mustInclude: sanitizeStringArray(data && data.mustInclude, base.mustInclude),
      shouldInclude: sanitizeStringArray(data && data.shouldInclude, base.shouldInclude),
      goodSignals: sanitizeStringArray(data && data.goodSignals, base.goodSignals),
      riskSignals: sanitizeStringArray(data && data.riskSignals, base.riskSignals),
      evidenceFields: sanitizeStringArray(data && data.evidenceFields, base.evidenceFields),
      rubricLevels: sanitizeRubricLevels(data && data.rubricLevels, base.rubricLevels),
      fairnessRisks: sanitizeStringArray(data && data.fairnessRisks, base.fairnessRisks || createFairnessRisks()),
      unverifiedClaims: sanitizeStringArray(data && data.unverifiedClaims, base.unverifiedClaims || createUnverifiedClaimRules()),
      scoreConfidence: normalizeScoreConfidence(data && data.scoreConfidence, base.scoreConfidence),
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
          topic: entry.topic || null,
          score: entry.evaluation ? entry.evaluation.score : null,
          summary: entry.evaluation ? entry.evaluation.summary : "",
          missingElements: entry.evaluation ? entry.evaluation.missingElements : [],
          unverifiedClaims: entry.evaluation ? entry.evaluation.unverifiedClaims : [],
          followUpReason: entry.evaluation ? entry.evaluation.followUpReason : ""
        };
      })
      : [];
  }

  function normalizeQuestionForCompare(question) {
    return String(question || "")
      .toLowerCase()
      .replace(/[、。,.!?！？\s]/g, "")
      .replace(/応募先の.+?との接点も含めてください/g, "")
      .replace(/.+?で再現できる力が伝わるように答えてください/g, "")
      .replace(/根拠が弱い場合は追加で確認します/g, "");
  }

  function getAskedQuestions() {
    return appState.interviewLog && Array.isArray(appState.interviewLog.entries)
      ? appState.interviewLog.entries.map(function (entry) {
        return entry.question;
      }).filter(Boolean)
      : [];
  }

  function isSimilarQuestion(candidate, existingQuestion) {
    var a = normalizeQuestionForCompare(candidate);
    var b = normalizeQuestionForCompare(existingQuestion);
    if (!a || !b) {
      return false;
    }
    if (a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1) {
      return true;
    }
    var shorter = a.length < b.length ? a : b;
    var longer = a.length < b.length ? b : a;
    if (shorter.length < 16) {
      return false;
    }
    var shared = 0;
    for (var index = 0; index < shorter.length - 1; index += 1) {
      if (longer.indexOf(shorter.slice(index, index + 2)) !== -1) {
        shared += 1;
      }
    }
    return shared / Math.max(1, shorter.length - 1) > 0.72;
  }

  function wasQuestionAsked(candidate) {
    return getAskedQuestions().some(function (question) {
      return isSimilarQuestion(candidate, question);
    });
  }

  function pickBankQuestion(settings) {
    var category = normalizeCategory(settings.category);
    var interviewType = settings.interviewType;
    var typeOverrides = (STAR_QUESTION_BANK_TYPE_OVERRIDES[interviewType] || {})[category] || [];
    // 面接タイプに合わせたキュレーション（あれば）を先に出題し、
    // 尽きたらカテゴリ共通の定番質問集に続ける。
    var pool = typeOverrides.concat(STAR_QUESTION_BANK[category] || []);
    for (var index = 0; index < pool.length; index += 1) {
      if (!wasQuestionAsked(pool[index])) {
        return pool[index];
      }
    }
    return null;
  }

  // 定番質問集モードで出題する質問は、settings.categoryに対応するcoverage topic
  // （initializeTopicCoverage()がcategory_<カテゴリ>という形で必ず1つ用意している）に
  // 固定で紐づける。selectFallbackTopic()任せにすると、企業理解・技術判断など
  // カテゴリ外のtopicが付いてしまい、出題内容とtopicがずれることがあるため。
  function bankQuestionTopic(settings) {
    var category = normalizeCategory(settings.category);
    return findCoverageTopic("category_" + category) || createCategoryTopic(category);
  }

  function getInterviewProgressSummary() {
    var turns = getPreviousTurns();
    return {
      askedQuestions: turns.map(function (turn) {
        return turn.question;
      }).filter(Boolean),
      answeredSummaries: turns.map(function (turn) {
        return {
          questionNumber: turn.questionNumber,
          question: turn.question,
          answerExcerpt: String(turn.answer || "").replace(/\s+/g, " ").slice(0, 180),
          score: turn.score,
          evaluationSummary: turn.summary || "",
          missingElements: turn.missingElements || [],
          unverifiedClaims: turn.unverifiedClaims || [],
          followUpReason: turn.followUpReason || ""
        };
      })
    };
  }

  function createCoverageTopic(id, label, category, focus) {
    return {
      id: id,
      label: label,
      category: normalizeCategory(category || "default"),
      focus: focus || label
    };
  }

  function addCoverageTopic(topics, topic) {
    if (!topic || !topic.id || topics.some(function (item) {
      return item.id === topic.id;
    })) {
      return;
    }
    topics.push(topic);
  }

  function createCategoryTopic(category, focus) {
    var normalized = normalizeCategory(category || "default");
    return createCoverageTopic(
      "category_" + normalized,
      CATEGORY_LABELS[normalized] || CATEGORY_LABELS.default,
      normalized,
      focus || ((CATEGORY_LABELS[normalized] || CATEGORY_LABELS.default) + "の具体性と再現性")
    );
  }

  function initializeTopicCoverage(settings) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var topics = [];
    addCoverageTopic(topics, createCategoryTopic(safeSettings.category, "設定カテゴリの主要論点"));
    (safeSettings.sourceEsEntries || []).forEach(function (entry) {
      addCoverageTopic(topics, createCategoryTopic(entry.category, "保存済みESに書かれた経験の深掘り"));
    });
    if (safeSettings.company || safeSettings.companyNotes) {
      addCoverageTopic(topics, createCoverageTopic("company_fit", "企業理解", "motivation", "応募先の事業・特徴と自分の経験の接点"));
    }
    if (safeSettings.role) {
      addCoverageTopic(topics, createCoverageTopic("role_fit", "職種理解", "career", safeSettings.role + "で再現できる力"));
    }
    if (safeSettings.category === "development" || safeSettings.interviewType === "technical") {
      addCoverageTopic(topics, createCoverageTopic("technical_decision", "技術判断", "development", "技術選定、設計判断、検証方法"));
      addCoverageTopic(topics, createCoverageTopic("architecture_tradeoff", "設計トレードオフ", "development", "アーキテクチャ、代替案、制約、捨てた選択肢"));
      addCoverageTopic(topics, createCoverageTopic("quality_delivery", "品質とリリース", "development", "テスト、レビュー、CI、リリース前確認、運用後の改善"));
      addCoverageTopic(topics, createCoverageTopic("ai_tooling_validation", "AI・自動化活用", "development", "生成AIや自動化ツールの利用範囲、検証、責任分界"));
      addCoverageTopic(topics, createCoverageTopic("nonfunctional_awareness", "非機能要件", "development", "性能、セキュリティ、保守性、可観測性への配慮"));
    }
    if (safeSettings.interviewType === "research") {
      addCoverageTopic(topics, createCoverageTopic("research_logic", "研究の論理", "research", "研究目的、手法、検証、独自性"));
    }
    if (safeSettings.interviewType === "final") {
      addCoverageTopic(topics, createCoverageTopic("career_alignment", "キャリア整合", "career", "将来像と応募先で実現したいこと"));
    }
    addCoverageTopic(topics, createCoverageTopic("evidence_result", "成果の根拠", safeSettings.category, "成果、規模、数字、比較の確認"));
    addCoverageTopic(topics, createCoverageTopic("reflection_learning", "学びと改善", "failure", "失敗、改善、次に変える行動"));
    addCoverageTopic(topics, createCoverageTopic("team_role", "チーム内の役割", "team", "周囲との関わり、合意形成、本人の貢献"));
    return {
      candidateTopics: topics,
      askedTopics: [],
      answeredTopics: [],
      weakTopics: [],
      currentTopic: null
    };
  }

  function getTopicCoverage() {
    if (!appState.interviewLog) {
      return initializeTopicCoverage(appState.settings);
    }
    if (!appState.interviewLog.topicCoverage) {
      appState.interviewLog.topicCoverage = initializeTopicCoverage(appState.settings);
    }
    return appState.interviewLog.topicCoverage;
  }

  function findCoverageTopic(topicId) {
    var coverage = getTopicCoverage();
    return (coverage.candidateTopics || []).find(function (topic) {
      return topic.id === topicId;
    }) || null;
  }

  function topicSummary(topic) {
    if (!topic) {
      return null;
    }
    return {
      id: topic.id,
      label: topic.label,
      category: topic.category,
      focus: topic.focus
    };
  }

  function expandTopicIds(ids) {
    return sanitizeStringArray(ids, []).map(function (topicId) {
      return topicSummary(findCoverageTopic(topicId)) || { id: topicId, label: topicId };
    });
  }

  function buildTopicCoverageContext() {
    var coverage = getTopicCoverage();
    return {
      candidateTopics: (coverage.candidateTopics || []).map(topicSummary).filter(Boolean),
      askedTopics: expandTopicIds(coverage.askedTopics),
      answeredTopics: expandTopicIds(coverage.answeredTopics),
      weakTopics: expandTopicIds(coverage.weakTopics),
      currentTopic: topicSummary(coverage.currentTopic || appState.currentQuestionTopic)
    };
  }

  function pushUniqueId(items, id) {
    if (id && items.indexOf(id) === -1) {
      items.push(id);
    }
  }

  function removeId(items, id) {
    return (items || []).filter(function (item) {
      return item !== id;
    });
  }

  function selectFallbackTopic(settings, options) {
    var coverage = getTopicCoverage();
    var opts = options || {};
    var candidates = coverage.candidateTopics && coverage.candidateTopics.length
      ? coverage.candidateTopics
      : initializeTopicCoverage(settings).candidateTopics;
    var answered = sanitizeStringArray(coverage.answeredTopics, []);
    var asked = sanitizeStringArray(coverage.askedTopics, []);
    var weak = sanitizeStringArray(coverage.weakTopics, []);
    var weakCandidate = opts.preferWeak ? weak.map(findCoverageTopic).find(Boolean) : null;
    if (weakCandidate) {
      return weakCandidate;
    }
    var fresh = candidates.find(function (topic) {
      return answered.indexOf(topic.id) === -1 && asked.indexOf(topic.id) === -1;
    });
    if (fresh) {
      return fresh;
    }
    var unanswered = candidates.find(function (topic) {
      return answered.indexOf(topic.id) === -1;
    });
    if (unanswered) {
      return unanswered;
    }
    var fallbackWeak = weak.map(findCoverageTopic).find(Boolean);
    if (fallbackWeak) {
      return fallbackWeak;
    }
    var offset = appState.interviewLog && appState.interviewLog.entries ? appState.interviewLog.entries.length : 0;
    return candidates[offset % Math.max(1, candidates.length)] || createCategoryTopic((settings || DEFAULT_SETTINGS).category);
  }

  function applyQuestionTopic(question, topic) {
    var coverage = getTopicCoverage();
    var selected = topic && topic.id ? topic : selectFallbackTopic(appState.settings);
    coverage.currentTopic = selected;
    appState.currentQuestionTopic = selected;
    pushUniqueId(coverage.askedTopics, selected.id);
    return selected;
  }

  function normalizeTopicResult(result, topic, evaluation) {
    var selected = topic && topic.id ? topic : appState.currentQuestionTopic;
    var status = String(result && result.status || "").toLowerCase();
    var score = Number(evaluation && evaluation.score);
    var hasMissing = sanitizeStringArray(evaluation && evaluation.missingElements, []).length > 0;
    var hasUnverified = sanitizeStringArray(evaluation && evaluation.unverifiedClaims, []).length > 0;
    if (["answered", "weak", "unrelated"].indexOf(status) === -1) {
      status = hasMissing || hasUnverified || normalizeScoreConfidence(evaluation && evaluation.scoreConfidence, "medium") === "low" || (Number.isFinite(score) && score < 72)
        ? "weak"
        : "answered";
    }
    return {
      topicId: String(result && result.topicId || selected && selected.id || ""),
      status: status,
      reason: String(result && result.reason || makeFollowUpReason(evaluation) || "")
    };
  }

  function updateTopicCoverageFromEvaluation(evaluation, topic) {
    var coverage = getTopicCoverage();
    var selected = topic && topic.id ? topic : appState.currentQuestionTopic;
    if (!selected || !selected.id) {
      return normalizeTopicResult(evaluation && evaluation.topicResult, selected, evaluation);
    }
    var result = normalizeTopicResult(evaluation && evaluation.topicResult, selected, evaluation);
    result.topicId = result.topicId || selected.id;
    if (result.status === "answered") {
      pushUniqueId(coverage.answeredTopics, selected.id);
      coverage.weakTopics = removeId(coverage.weakTopics, selected.id);
    } else if (result.status === "weak") {
      pushUniqueId(coverage.weakTopics, selected.id);
      coverage.answeredTopics = removeId(coverage.answeredTopics, selected.id);
    }
    coverage.currentTopic = selected;
    return result;
  }

  function makeFollowUpReason(evaluation) {
    var missing = sanitizeStringArray(evaluation && evaluation.missingElements, []);
    var unverified = sanitizeStringArray(evaluation && evaluation.unverifiedClaims, []);
    if (missing.length) {
      return "前の回答で「" + missing.slice(0, 2).join("、") + "」がまだ確認できないため、そこだけ追加で確認します。";
    }
    if (unverified.length) {
      return "前の回答に未確認の実績や数字があるため、根拠を確認します。";
    }
    return "";
  }

  function shouldUseDeepDive(evaluation) {
    if (!evaluation || !evaluation.deepDiveQuestion || wasQuestionAsked(evaluation.deepDiveQuestion)) {
      return false;
    }
    if (evaluation.shouldAskDeepDive === true) {
      return true;
    }
    if (evaluation.shouldAskDeepDive === false) {
      return false;
    }
    var score = Number(evaluation.score);
    var confidence = normalizeScoreConfidence(evaluation.scoreConfidence, "medium");
    return confidence === "low"
      || (Number.isFinite(score) && score < 72)
      || sanitizeStringArray(evaluation.missingElements, []).length > 0
      || sanitizeStringArray(evaluation.unverifiedClaims, []).length > 0;
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
          "必ず questionCategory, intentLabel, evidenceFields, rubricLevels, fairnessRisks, unverifiedClaims, scoreConfidence を含めてください。",
          "rubricLevels は 1-5 の段階基準にし、各段階で必要な証拠項目を requiredEvidenceKeys に入れてください。",
          "fairnessRisks には、年齢、性別、国籍、健康状態、家族、出生地、思想信条、外見、声質など、職務適性と関係ない評価禁止事項を入れてください。",
          "unverifiedClaims には、ES・企業メモ・会話履歴にない実績、数字、固有名詞を事実として断定しないための扱いを書いてください。",
          "scoreConfidence は high / medium / low のいずれかで、ESや企業メモが少ない場合は低めにしてください。",
          buildAiContext(settings),
          "topicCoverage:",
          JSON.stringify(buildTopicCoverageContext()),
          "currentTopic:",
          JSON.stringify(topicSummary(appState.currentQuestionTopic)),
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

  function generateQuestion(settings, topic) {
    var safeSettings = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    var selectedTopic = topic && topic.id ? topic : selectFallbackTopic(safeSettings);
    var category = normalizeCategory(selectedTopic.category || safeSettings.category || "default");
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
      category,
      selectedTopic.id,
      safeSettings.interviewerType,
      askedCount
    ].join("|"));
    var orderedPool = pool.map(function (question, index) {
      return pool[(Math.abs(seed) + askedCount + index) % pool.length];
    });
    var selected = orderedPool.find(function (question) {
      return !wasQuestionAsked(makeQuestionSpecific(question, safeSettings));
    }) || pickFrom(pool, seed + askedCount);
    return makeQuestionSpecific(selected, safeSettings);
  }

  async function getInterviewQuestion(settings) {
    if (settings.questionSource === "bank") {
      var bankQuestion = pickBankQuestion(settings);
      if (bankQuestion) {
        applyQuestionTopic(bankQuestion, bankQuestionTopic(settings));
        return bankQuestion;
      }
      // 定番質問集を使い切った場合は、以下の既存ロジック（AI生成→モック生成）にそのまま処理を続ける
    }
    var topic = selectFallbackTopic(settings);
    try {
      var result = await callOpenAi(
        "interview_question",
        [
          "次に面接官が聞く質問を1つだけ作ってください。",
          "質問は日本語で、回答者が具体的に答えやすい聞き方にしてください。",
          "既に聞いた質問と同じ内容・同じ確認観点を繰り返さないでください。",
          "既に回答済みの内容は前提として扱い、ESから読めるだけの内容を再質問しないでください。",
          "過去回答で未確認または不足している要素がある場合だけ、その不足点に絞った質問にしてください。",
          "不足がなければ、過去質問とは別の評価観点に進んでください。",
          "必ず指定されたselectedTopicに沿って質問を作り、topicIdにはselectedTopic.idを返してください。",
          buildAiContext(settings),
          "topicCoverage:",
          JSON.stringify(buildTopicCoverageContext()),
          "selectedTopic:",
          JSON.stringify(topicSummary(topic)),
          "これまでの質問数: " + (appState.interviewLog && appState.interviewLog.entries ? appState.interviewLog.entries.length : 0),
          "これまでの質問・回答・不足点:",
          JSON.stringify(getInterviewProgressSummary())
        ].join("\n"),
        schemas.interview_question
      );
      if (result.question) {
        applyQuestionTopic(result.question, findCoverageTopic(result.topicId) || topic);
        return result.question;
      }
      var generated = generateQuestion(settings, topic);
      applyQuestionTopic(generated, topic);
      return generated;
    } catch (error) {
      console.warn("AI question generation failed. Falling back to mock.", error);
      var fallbackQuestion = generateQuestion(settings, topic);
      applyQuestionTopic(fallbackQuestion, topic);
      return fallbackQuestion;
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
    var candidate = "";
    if (safeAnswer.length < 50) {
      candidate = "もう少し具体的に、状況、あなたの行動、結果の順で説明できますか。";
      return wasQuestionAsked(candidate) ? "" : candidate;
    }
    if (!/(\d|年|月|人|%|件)/.test(safeAnswer)) {
      candidate = "成果や規模を、数字や比較で説明するとどうなりますか。";
      return wasQuestionAsked(candidate) ? "" : candidate;
    }
    if (settings.company && safeAnswer.indexOf(settings.company) === -1) {
      candidate = settings.company + "で働く前提では、その経験をどのように活かせますか。";
      return wasQuestionAsked(candidate) ? "" : candidate;
    }
    if (settings.role && safeAnswer.indexOf(settings.role) === -1) {
      candidate = settings.role + "の仕事に直接つながる学びは何ですか。";
      return wasQuestionAsked(candidate) ? "" : candidate;
    }
    candidate = "同じ状況がもう一度起きたら、次は何を変えますか。";
    return wasQuestionAsked(candidate) ? "" : candidate;
  }

  function normalizeEvaluationFlow(evaluation, fallback) {
    var base = fallback || {};
    var result = Object.assign({}, base, evaluation || {});
    result.followUpReason = String(result.followUpReason || makeFollowUpReason(result) || "");
    result.followUpTarget = String(result.followUpTarget || sanitizeStringArray(result.missingElements, [])[0] || "");
    result.shouldAskDeepDive = Boolean(result.shouldAskDeepDive);
    result.topicResult = normalizeTopicResult(result.topicResult, appState.currentQuestionTopic, result);
    if (!result.shouldAskDeepDive && makeFollowUpReason(result)) {
      result.shouldAskDeepDive = shouldUseDeepDive(result);
    }
    if (result.deepDiveQuestion && wasQuestionAsked(result.deepDiveQuestion)) {
      result.deepDiveQuestion = "";
      result.shouldAskDeepDive = false;
    }
    if (result.nextQuestion && wasQuestionAsked(result.nextQuestion)) {
      result.nextQuestion = "";
    }
    result.nextQuestion = result.nextQuestion || "";
    return result;
  }

  async function chooseNextQuestion(evaluation, settings) {
    var normalized = normalizeEvaluationFlow(evaluation, evaluation);
    if (shouldUseDeepDive(normalized)) {
      return {
        question: normalized.deepDiveQuestion,
        isDeepDive: true,
        reason: normalized.followUpReason || makeFollowUpReason(normalized),
        evaluation: normalized
      };
    }
    var nextQuestion = null;
    var nextTopic = selectFallbackTopic(settings);
    if (settings.questionSource === "bank") {
      // 定番質問集モードでは、深掘り以外の通常の次問もバンクを優先する。
      // AIが提案したnextQuestionを先に採用してしまうと、バンクを使い切るまで
      // 順番に出題するという仕様を満たせないため。
      var bankQuestion = pickBankQuestion(settings);
      if (bankQuestion) {
        nextQuestion = bankQuestion;
        applyQuestionTopic(nextQuestion, bankQuestionTopic(settings));
      }
    }
    if (!nextQuestion) {
      nextQuestion = normalized.nextQuestion;
      if (!nextQuestion || wasQuestionAsked(nextQuestion)) {
        nextQuestion = await getInterviewQuestion(settings);
      } else {
        applyQuestionTopic(nextQuestion, nextTopic);
      }
    }
    if (!nextQuestion || wasQuestionAsked(nextQuestion)) {
      nextQuestion = generateQuestion(Object.assign({}, settings || {}, {
        _askedCount: appState.interviewLog && appState.interviewLog.entries
          ? appState.interviewLog.entries.length + 1
          : 1
      }), nextTopic);
      applyQuestionTopic(nextQuestion, nextTopic);
    }
    return {
      question: nextQuestion,
      isDeepDive: false,
      reason: "前の回答で主要な確認はできたため、別の観点に進みます。",
      evaluation: Object.assign({}, normalized, {
        nextQuestion: nextQuestion
      })
    };
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
    var hasSourceEvidence = Array.isArray(safeSettings.sourceEsEntries) && safeSettings.sourceEsEntries.length;
    var unverifiedClaims = [];
    var fairnessFlags = [];

    if (/\d|%|倍|全国|優勝|受賞|売上|利益|精度|改善率/.test(safeAnswer) && !hasSourceEvidence) {
      unverifiedClaims.push("回答内に実績・数字・固有名詞の可能性がありますが、ESや企業メモでは確認できません。");
    }
    if (/家族|父|母|親|兄弟|姉妹|本籍|出生地|出身地|宗教|政党|思想|信条|健康|障害|病気|妊娠|結婚|国籍|年齢|性別|容姿|声質/.test(safeAnswer)) {
      fairnessFlags.push("職務適性と直接関係しない個人属性の可能性があります。加点・減点の根拠にはしません。");
    }

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
      unverifiedClaims: unverifiedClaims,
      fairnessFlags: fairnessFlags,
      scoreConfidence: safeAnswer.length < 50 || unverifiedClaims.length ? "low" : hasSourceEvidence ? "medium" : "low",
      esConsistency: {
        status: safeSettings.sourceEsEntries && safeSettings.sourceEsEntries.length ? "unchecked_by_mock" : "insufficient_evidence",
        notes: "モック採点ではESとの厳密な矛盾検出は行わず、回答内の企業名・職種名・具体性を中心に見ています。"
      },
      scoringRationale: "ローカルの簡易採点です。OpenAI設定が有効な場合は、期待回答データ、全ES、企業情報、会話履歴を使って採点します。",
      expectedAnswerData: expected,
      deepDiveQuestion: generateFollowUpQuestion(safeAnswer, safeSettings),
      shouldAskDeepDive: safeAnswer.length < 50 || unverifiedClaims.length > 0 || score < 65,
      followUpReason: missingElements.length
        ? "前の回答で「" + missingElements.slice(0, 2).join("、") + "」がまだ確認できないため、そこだけ追加で確認します。"
        : unverifiedClaims.length
          ? "前の回答に未確認の実績や数字があるため、根拠を確認します。"
          : "",
      followUpTarget: missingElements[0] || unverifiedClaims[0] || "",
      topicResult: normalizeTopicResult(null, appState.currentQuestionTopic, {
        score: score,
        missingElements: missingElements,
        unverifiedClaims: unverifiedClaims,
        scoreConfidence: safeAnswer.length < 50 || unverifiedClaims.length ? "low" : hasSourceEvidence ? "medium" : "low"
      }),
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
          "rubricLevelsを使い、回答内の根拠がどの段階を満たすかを見てください。mustIncludeの単純一致だけで採点しないでください。",
          "年齢、性別、国籍、健康状態、家族、出生地、思想信条、外見、声質など、職務適性と関係ない属性は加点・減点の根拠にしないでください。該当する場合はfairnessFlagsに入れてください。",
          "ES・企業メモ・会話履歴で確認できない実績、数字、固有名詞はunverifiedClaimsに入れ、必要なら深掘り質問で確認してください。",
          "scoreConfidenceはhigh / medium / lowのいずれかで返してください。根拠不足、回答短すぎ、未確認情報が多い場合はlowにしてください。",
          "改善点は実際に次の回答で直せる粒度にしてください。",
          "次の質問を作る前に、これまでの会話履歴の question / answer / summary / missingElements / unverifiedClaims を確認してください。",
          "既に回答済みの内容、同じ意図、同じ経験の要約を再度聞かないでください。",
          "deepDiveQuestionを出してよいのは、現在の回答に明確な不足がある場合だけです。例: 質問に直接答えていない、本人の役割・行動・判断理由・結果・学び・再現性が不足、未確認の数字や役割がある、ESや過去回答と矛盾がある、回答が短すぎる・抽象的すぎる。",
          "十分に答えられている場合は shouldAskDeepDive=false、deepDiveQuestion=\"\"、followUpReason=\"\"、followUpTarget=\"\" にし、nextQuestionには未出の別観点の質問を入れてください。",
          "深掘りする場合は shouldAskDeepDive=true にし、followUpReasonにユーザーへ説明できる具体的な理由、followUpTargetに確認対象を入れてください。一度に確認する不足点は1つだけにしてください。",
          "nextQuestionも既出質問と同じ内容・同じ確認観点にしないでください。",
          "topicResultには、currentTopicが今回の回答で十分確認できたらstatus=answered、不足や未確認が残るならstatus=weak、質問と回答がずれていればstatus=unrelatedを入れてください。",
          "nextQuestionはtopicCoverageの未回答テーマを優先してください。weakTopicsへ戻るのは深掘りが必要な場合だけです。",
          buildAiContext(settings),
          "topicCoverage:",
          JSON.stringify(buildTopicCoverageContext()),
          "currentTopic:",
          JSON.stringify(topicSummary(appState.currentQuestionTopic)),
          "expectedAnswerData:",
          JSON.stringify(expected),
          "これまでの会話履歴:",
          JSON.stringify(getPreviousTurns()),
          "質問: " + question,
          "回答: " + answer
        ].join("\n"),
        schemas.answer_evaluation
      );
      return normalizeEvaluationFlow(Object.assign({}, fallback, result, {
        score: Math.max(0, Math.min(100, Math.round(Number(result.score) || fallback.score))),
        axisScores: normalizeAxisScores(result.axisScores, fallback.axisScores),
        goodPoints: sanitizeStringArray(result.goodPoints, fallback.goodPoints),
        improvements: sanitizeStringArray(result.improvements, fallback.improvements),
        issues: sanitizeStringArray(result.issues, fallback.issues),
        missingElements: sanitizeStringArray(result.missingElements, fallback.missingElements),
        unverifiedClaims: sanitizeStringArray(result.unverifiedClaims, fallback.unverifiedClaims),
        fairnessFlags: sanitizeStringArray(result.fairnessFlags, fallback.fairnessFlags),
        scoreConfidence: normalizeScoreConfidence(result.scoreConfidence, fallback.scoreConfidence),
        esConsistency: result.esConsistency || fallback.esConsistency,
        scoringRationale: result.scoringRationale || fallback.scoringRationale,
        expectedAnswerData: expected,
        shouldAskDeepDive: Boolean(result.shouldAskDeepDive),
        followUpReason: String(result.followUpReason || ""),
        followUpTarget: String(result.followUpTarget || ""),
        topicResult: normalizeTopicResult(result.topicResult, appState.currentQuestionTopic, result),
        nextQuestion: result.nextQuestion || fallback.nextQuestion,
        createdAt: new Date().toISOString()
      }), fallback);
    } catch (error) {
      console.warn("AI answer evaluation failed. Falling back to mock.", error);
      return normalizeEvaluationFlow(fallback, fallback);
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

  function deleteInterviewLog(id, accountId) {
    saveInterviewLogs(loadInterviewLogs().filter(function (log) {
      return log.id !== id || (accountId && log.accountId !== accountId);
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
    releaseVideoClips();
    stopCameraMediaStream();
    var settings = resolveInterviewerSettings(readSettings());
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
    cameraInputState.isEnabled = Boolean(settings.cameraEnabled);
    cameraInputState.lastError = "";
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
      topicCoverage: initializeTopicCoverage(settings),
      startedAt: new Date().toISOString(),
      finalFeedback: null
    };
    appState.currentQuestionTopic = null;
    setText("currentQuestion", "質問を生成中です...");
    setText("feedbackSummary", "");
    setText("progressText", "質問 1 / " + settings.questionCount);
    var timeline = $("chatTimeline");
    if (timeline) {
      timeline.textContent = "";
    }
    showView("interviewView");
    if (cameraInputState.isEnabled) {
      await setupCameraCapture();
    } else {
      stopCameraMediaStream();
    }
    setBusy(true, "質問を生成中です...");
    appState.currentQuestion = await getInterviewQuestion(settings);
    setBusy(true, "評価基準を生成中です...");
    appState.currentExpectedAnswerData = await getExpectedAnswerData(appState.currentQuestion, settings);
    setText("currentQuestion", appState.currentQuestion);
    appState.currentQuestionShownAt = Date.now();
    speakQuestion(appState.currentQuestion);
    startCameraRecording();
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

  async function finalizeCameraCaptureBeforeSubmit() {
    if (!cameraInputState.isEnabled || !cameraInputState.isSupported) {
      return null;
    }
    if (cameraInputState.isRecording) {
      await stopCameraRecording();
    } else if (cameraInputState.recordingStopPromise) {
      await cameraInputState.recordingStopPromise;
    }
    return cameraInputState.pendingClip;
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

  // フィラーワード（つなぎ言葉）辞書。
  // 日本語には英語のような明確な単語区切りがなく、特に「あの」「その」は
  // 指示語（例:「あの人」「その資料」）としても使われるため、テキストの
  // 単純な文字列マッチングだけでは意味的に正確な検出はできない。
  // ここでは面接の発話で頻出する代表的なフィラーに絞り込み、
  // 明らかな過検出を避けることを優先した簡易実装としている。
  // （完璧な自然言語解析ではなく、あくまで出現回数の目安を示すもの）
  var FILLER_WORDS = [
    "えーと",
    "えっと",
    "ええと",
    "あのー",
    "そのー",
    "まあ",
    "なんか",
    "あー",
    "うーんと",
    "うーん"
  ];
  // 「あの」「その」は単独では「あの人」「その資料」のような通常の指示語と
  // 見分けがつかず誤検出が多くなるため、辞書からは外し、長音を伴う
  // 「あのー」「そのー」（明確につなぎ言葉として使われる形）のみを対象にしている。

  function escapeFillerWordRegExp(word) {
    return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function countFillerWords(text) {
    if (!text) {
      return { total: 0, breakdown: [] };
    }
    var source = String(text);
    // 「うーんと」は「うーん」を部分文字列として含む。単純に短い語も
    // 独立してカウントしたり、マッチ箇所を文字列から取り除いてから次の語を
    // 探したりすると、削除によって残った文字同士がたまたま連結して別の
    // フィラーワードに見えてしまう（意図しない誤検出）ことがある。
    // そのため、元のテキスト上での出現位置(range)を長い語から優先的に
    // 確保し、既に確保された範囲と重なる短い語の出現は数えない、という
    // 非重複マッチングを行う。
    var wordsByLengthDesc = FILLER_WORDS.slice().sort(function (a, b) {
      return b.length - a.length;
    });
    var claimed = new Array(source.length).fill(false);
    var counts = {};
    wordsByLengthDesc.forEach(function (word) {
      var pattern = new RegExp(escapeFillerWordRegExp(word), "g");
      var match;
      var count = 0;
      while ((match = pattern.exec(source)) !== null) {
        var start = match.index;
        var end = start + word.length;
        var overlaps = false;
        for (var i = start; i < end; i += 1) {
          if (claimed[i]) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          for (var j = start; j < end; j += 1) {
            claimed[j] = true;
          }
          count += 1;
        }
      }
      counts[word] = count;
    });
    var breakdown = FILLER_WORDS.filter(function (word) {
      return counts[word] > 0;
    }).map(function (word) {
      return { word: word, count: counts[word] };
    }).sort(function (a, b) {
      return b.count - a.count;
    });
    var total = breakdown.reduce(function (sum, item) {
      return sum + item.count;
    }, 0);
    return { total: total, breakdown: breakdown };
  }

  function calculateSpeakingPace(text, durationMs) {
    if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
      return null;
    }
    var minutes = durationMs / 60000;
    if (!(minutes > 0)) {
      return null;
    }
    var charCount = text ? String(text).length : 0;
    // 日本語は英語のような単語の分かち書きがないため、単語数ではなく
    // 「1分あたりの文字数」を話速の指標として用いる。
    return Math.round(charCount / minutes);
  }

  function analyzeEntrySpeech(entry) {
    var text = entry && entry.transcript && entry.transcript.text ? entry.transcript.text : ((entry && entry.answer) || "");
    var fillerWords = countFillerWords(text);
    var durationMs = entry && entry.audio ? entry.audio.durationMs : undefined;
    var paceCharsPerMinute = calculateSpeakingPace(text, durationMs);
    return {
      fillerWords: fillerWords,
      paceCharsPerMinute: paceCharsPerMinute,
      // 集計側でセッション全体の話速を「総文字数 / 総録音時間」として
      // 正しく重み付けできるよう、パース済みの元データも返しておく。
      charCount: paceCharsPerMinute !== null ? String(text).length : 0,
      durationMs: paceCharsPerMinute !== null ? durationMs : 0,
      usedVoiceInput: Boolean(entry && entry.answerInputMode === "voice")
    };
  }

  async function submitAnswer() {
    if (!appState.interviewLog || appState.finished || appState.isBusy) {
      return;
    }
    var answerInput = $("answerInput");
    var answer = answerInput && typeof answerInput.value === "string" ? answerInput.value.trim() : "";
    if (!answer) {
      setText("feedbackSummary", "回答を入力してから送信してください。");
      return;
    }
    var answerSubmittedAt = Date.now();

    var audioClip = await finalizeVoiceCaptureBeforeSubmit();
    var videoClip = await finalizeCameraCaptureBeforeSubmit();
    var bodyLanguageMetrics = (cameraInputState.isEnabled && cameraInputState.isSupported && cameraInputState.lastBodyLanguageMetrics)
      ? cameraInputState.lastBodyLanguageMetrics
      : createUnavailableBodyLanguageMetrics();

    setBusy(true, "回答を評価中です...");
    var expectedAnswerData = appState.currentExpectedAnswerData || await getExpectedAnswerData(appState.currentQuestion, appState.settings);
    var questionTopic = appState.currentQuestionTopic;
    var evaluation = await getAnswerEvaluation(appState.currentQuestion, answer, appState.settings, expectedAnswerData);
    var message = {
      id: makeId("msg"),
      sessionId: appState.interviewLog.id,
      questionNumber: appState.questionIndex + 1,
      question: appState.currentQuestion,
      topic: topicSummary(questionTopic),
      answer: answer,
      answerInputMode: audioClip ? "voice" : "text",
      transcript: createTranscriptRecord(answer, audioClip),
      audio: createAudioMetadata(audioClip),
      audioClipId: audioClip ? audioClip.id : null,
      videoClipId: videoClip ? videoClip.id : null,
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
    evaluationRecord.topicResult = updateTopicCoverageFromEvaluation(evaluationRecord, questionTopic);

    appState.interviewLog.messages.push(message);
    appState.interviewLog.evaluations.push(evaluationRecord);
    appState.interviewLog.entries.push({
      id: message.id,
      evaluationId: evaluationRecord.id,
      questionNumber: appState.questionIndex + 1,
      question: appState.currentQuestion,
      topic: topicSummary(questionTopic),
      answer: answer,
      answerInputMode: message.answerInputMode,
      transcript: message.transcript,
      audio: message.audio,
      audioClipId: message.audioClipId,
      videoClipId: message.videoClipId,
      expectedAnswerData: expectedAnswerData,
      evaluation: evaluationRecord,
      responseTimeMs: typeof appState.currentQuestionShownAt === "number"
        ? (answerSubmittedAt - appState.currentQuestionShownAt)
        : null,
      bodyLanguageMetrics: bodyLanguageMetrics
    });
    voiceInputState.pendingClip = null;
    voiceInputState.finalTranscript = "";
    cameraInputState.pendingClip = null;
    cameraInputState.lastBodyLanguageMetrics = null;
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

    var nextQuestionPlan = await chooseNextQuestion(evaluationRecord, appState.settings);
    Object.assign(evaluationRecord, nextQuestionPlan.evaluation);
    appState.currentQuestion = nextQuestionPlan.question;
    appState.currentExpectedAnswerData = null;
    setBusy(true, "次の評価基準を生成中です...");
    appState.currentExpectedAnswerData = await getExpectedAnswerData(appState.currentQuestion, appState.settings);
    setText("currentQuestion", appState.currentQuestion);
    appState.currentQuestionShownAt = Date.now();
    speakQuestion(appState.currentQuestion);
    startCameraRecording();
    setText("progressText", "質問 " + (appState.questionIndex + 1) + " / " + appState.settings.questionCount);
    setText("feedbackSummary", nextQuestionPlan.isDeepDive
      ? (nextQuestionPlan.reason || "前の回答で確認しきれない点があるため、そこだけ追加で確認します。")
      : "前の回答で主要な確認はできたため、別の観点に進みます。");
    setBusy(false);
  }

  function renderImmediateFeedback(evaluation) {
    var score = evaluation && typeof evaluation.score === "number" ? evaluation.score : null;
    setText("feedbackSummary", score !== null
      ? "回答を受け付けました（今回のスコア: " + score + "点）。次の質問を準備しています..."
      : "回答を受け付けました。次の質問を準備しています...");
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
    var missing = sanitizeStringArray(evaluation && evaluation.missingElements, []);
    var unverified = sanitizeStringArray(evaluation && evaluation.unverifiedClaims, []);
    var reason = String(evaluation && evaluation.followUpReason || makeFollowUpReason(evaluation) || "");
    if (missing.length || unverified.length || reason) {
      var reasonEl = document.createElement("p");
      reasonEl.className = "timeline-followup-note";
      reasonEl.textContent = reason || "前の回答で確認しきれない点があるため、次の質問で補足します。";
      item.appendChild(reasonEl);
    }
    timeline.appendChild(item);
  }

  async function finishInterview() {
    if (!appState.interviewLog || appState.finished || appState.isBusy) {
      return;
    }
    stopCameraMediaStream();
    setBusy(true, "最終フィードバックを作成中です...");
    appState.interviewLog.finishedAt = new Date().toISOString();
    appState.interviewLog.finalFeedback = await getFinalFeedback(appState.interviewLog);
    appState.interviewLog = saveInterviewLog(appState.interviewLog);
    appState.finished = true;
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
    renderSpeechMetricsSummary();
    renderResponseTimeSummary();
    renderBodyLanguageSummary();
    renderAudioReview();
    renderVideoReview();
  }

  function renderSpeechMetricsSummary() {
    var container = $("speechMetricsSummary");
    if (!container) {
      return;
    }
    container.textContent = "";
    var entries = appState.interviewLog && Array.isArray(appState.interviewLog.entries) ? appState.interviewLog.entries : [];
    if (!entries.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "分析対象の回答がありません。";
      container.appendChild(empty);
      return;
    }

    var totalFillerCount = 0;
    var fillerWordTotals = {};
    var totalPaceCharCount = 0;
    var totalPaceDurationMs = 0;
    var usedVoiceInput = false;

    entries.forEach(function (entry) {
      var analysis = analyzeEntrySpeech(entry);
      totalFillerCount += analysis.fillerWords.total;
      analysis.fillerWords.breakdown.forEach(function (item) {
        fillerWordTotals[item.word] = (fillerWordTotals[item.word] || 0) + item.count;
      });
      if (analysis.usedVoiceInput) {
        usedVoiceInput = true;
      }
      if (analysis.paceCharsPerMinute !== null) {
        totalPaceCharCount += analysis.charCount;
        totalPaceDurationMs += analysis.durationMs;
      }
    });

    var topFillerWords = Object.keys(fillerWordTotals).map(function (word) {
      return { word: word, count: fillerWordTotals[word] };
    }).sort(function (a, b) {
      return b.count - a.count;
    }).slice(0, 5);

    var fillerSummary = document.createElement("p");
    fillerSummary.className = "item-meta";
    fillerSummary.textContent = "フィラーワード合計: " + totalFillerCount + "回" +
      (topFillerWords.length
        ? "（" + topFillerWords.map(function (item) {
          return item.word + "×" + item.count;
        }).join(", ") + "）"
        : "");
    container.appendChild(fillerSummary);

    var paceSummary = document.createElement("p");
    paceSummary.className = "item-meta";
    if (totalPaceDurationMs > 0) {
      // 各回答ごとの「文字/分」を単純平均すると、短い回答と長い回答が
      // 同じ重みになり歪むため、総文字数 ÷ 総録音時間で計算する。
      var averagePace = Math.round(totalPaceCharCount / (totalPaceDurationMs / 60000));
      paceSummary.textContent = "平均話速（音声入力の回答のみ対象）: " + averagePace + "文字/分";
    } else if (usedVoiceInput) {
      paceSummary.textContent = "音声入力はありましたが、録音時間を計測できなかったため話速は算出できませんでした。";
    } else {
      paceSummary.textContent = "このセッションでは音声入力が使われなかったため話速は計測されていません。";
    }
    container.appendChild(paceSummary);
  }

  function renderResponseTimeSummary() {
    var container = $("responseTimeSummary");
    if (!container) {
      return;
    }
    container.textContent = "";
    var entries = appState.interviewLog && Array.isArray(appState.interviewLog.entries) ? appState.interviewLog.entries : [];
    if (!entries.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "分析対象の回答がありません。";
      container.appendChild(empty);
      return;
    }

    var measuredEntries = entries.filter(function (entry) {
      return typeof entry.responseTimeMs === "number" && Number.isFinite(entry.responseTimeMs) && entry.responseTimeMs >= 0;
    });

    if (!measuredEntries.length) {
      var noData = document.createElement("p");
      noData.className = "item-meta";
      noData.textContent = "回答時間を計測できませんでした。";
      container.appendChild(noData);
      return;
    }

    var totalMs = measuredEntries.reduce(function (sum, entry) {
      return sum + entry.responseTimeMs;
    }, 0);
    var averageMs = totalMs / measuredEntries.length;
    var slowestEntry = measuredEntries.reduce(function (slowest, entry) {
      return (!slowest || entry.responseTimeMs > slowest.responseTimeMs) ? entry : slowest;
    }, null);

    var averageSummary = document.createElement("p");
    averageSummary.className = "item-meta";
    averageSummary.textContent = "平均回答時間: " + formatDuration(averageMs);
    container.appendChild(averageSummary);

    if (slowestEntry) {
      var slowestSummary = document.createElement("p");
      slowestSummary.className = "item-meta";
      slowestSummary.textContent = "最も時間がかかった質問: 質問" + slowestEntry.questionNumber +
        "（" + formatDuration(slowestEntry.responseTimeMs) + "）";
      container.appendChild(slowestSummary);
    }

    var list = document.createElement("ul");
    list.className = "feedback-list";
    entries.forEach(function (entry) {
      var item = document.createElement("li");
      var hasTime = typeof entry.responseTimeMs === "number" && Number.isFinite(entry.responseTimeMs) && entry.responseTimeMs >= 0;
      item.textContent = "質問" + entry.questionNumber + ": " + (hasTime ? formatDuration(entry.responseTimeMs) : "計測不可");
      list.appendChild(item);
    });
    container.appendChild(list);
  }

  function describeMotionLevel(score) {
    if (score < 34) {
      return "動きが少なめ";
    }
    if (score > 66) {
      return "動きが多め";
    }
    return "標準的";
  }

  function renderBodyLanguageSummary() {
    var container = $("bodyLanguageSummary");
    if (!container) {
      return;
    }
    container.textContent = "";
    var entries = appState.interviewLog && Array.isArray(appState.interviewLog.entries) ? appState.interviewLog.entries : [];
    var usedEntries = entries.filter(function (entry) {
      return entry.bodyLanguageMetrics && entry.bodyLanguageMetrics.available;
    });

    if (!usedEntries.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "この面接ではカメラが使用されなかったため、映像の傾向分析はありません。";
      container.appendChild(empty);
      return;
    }

    var motionEntries = usedEntries.filter(function (entry) {
      return entry.bodyLanguageMetrics.motionLevel && entry.bodyLanguageMetrics.motionLevel.available &&
        typeof entry.bodyLanguageMetrics.motionLevel.score === "number" &&
        Number.isFinite(entry.bodyLanguageMetrics.motionLevel.score);
    });

    var motionSummary = document.createElement("p");
    motionSummary.className = "item-meta";
    if (motionEntries.length) {
      var motionTotal = motionEntries.reduce(function (sum, entry) {
        return sum + entry.bodyLanguageMetrics.motionLevel.score;
      }, 0);
      var motionAverage = Math.round(motionTotal / motionEntries.length);
      motionSummary.textContent = "平均的な映像の変化量: " + motionAverage + "/100（" +
        describeMotionLevel(motionAverage) + "、参考値）";
    } else {
      motionSummary.textContent = "映像の変化量: 算出できませんでした。";
    }
    container.appendChild(motionSummary);

    var stabilityEntries = usedEntries.filter(function (entry) {
      return entry.bodyLanguageMetrics.faceStability && entry.bodyLanguageMetrics.faceStability.available &&
        typeof entry.bodyLanguageMetrics.faceStability.score === "number" &&
        Number.isFinite(entry.bodyLanguageMetrics.faceStability.score);
    });

    var stabilitySummary = document.createElement("p");
    stabilitySummary.className = "item-meta";
    if (stabilityEntries.length) {
      var stabilityTotal = stabilityEntries.reduce(function (sum, entry) {
        return sum + entry.bodyLanguageMetrics.faceStability.score;
      }, 0);
      var stabilityAverage = Math.round(stabilityTotal / stabilityEntries.length);
      stabilitySummary.textContent = "平均的な顔位置の安定度: " + stabilityAverage + "/100（参考値）";
    } else {
      // 録画当時にFaceDetectorが使えたかどうかは、閲覧中ブラウザの対応状況ではなく
      // 記録時にstopBodyLanguageSampling()が保存したunavailableReasonで判定する
      // （履歴を別のブラウザで開いた場合でも当時の状況が正しく表示されるようにするため）。
      var unsupportedAtRecording = usedEntries.some(function (entry) {
        return entry.bodyLanguageMetrics.faceStability &&
          entry.bodyLanguageMetrics.faceStability.unavailableReason === "unsupported";
      });
      stabilitySummary.textContent = unsupportedAtRecording
        ? "顔位置の安定度: この環境（ブラウザ）では利用できません（映像の変化量のみ分析対象です）。"
        : "顔位置の安定度: 顔を検出できなかったため、今回は算出できませんでした。";
    }
    container.appendChild(stabilitySummary);

    var list = document.createElement("ul");
    list.className = "feedback-list";
    entries.forEach(function (entry) {
      var metrics = entry.bodyLanguageMetrics;
      var item = document.createElement("li");
      if (!metrics || !metrics.available) {
        item.textContent = "質問" + entry.questionNumber + ": カメラ映像なし";
        list.appendChild(item);
        return;
      }
      var parts = [];
      if (metrics.motionLevel && metrics.motionLevel.available && typeof metrics.motionLevel.score === "number" &&
        Number.isFinite(metrics.motionLevel.score)) {
        parts.push("変化量" + Math.round(metrics.motionLevel.score) + "/100");
      }
      if (metrics.faceStability && metrics.faceStability.available && typeof metrics.faceStability.score === "number" &&
        Number.isFinite(metrics.faceStability.score)) {
        parts.push("安定度" + Math.round(metrics.faceStability.score) + "/100");
      }
      item.textContent = "質問" + entry.questionNumber + ": " + (parts.length ? parts.join(" / ") : "算出不可");
      list.appendChild(item);
    });
    container.appendChild(list);
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

  function getVideoClip(clipId) {
    return clipId && appState.videoClips ? appState.videoClips[clipId] || null : null;
  }

  function renderVideoReview() {
    var list = $("videoReviewList");
    if (!list) {
      return;
    }
    list.textContent = "";
    var entries = appState.interviewLog && Array.isArray(appState.interviewLog.entries) ? appState.interviewLog.entries : [];
    var videoEntries = entries.map(function (entry) {
      return {
        entry: entry,
        clip: getVideoClip(entry.videoClipId)
      };
    }).filter(function (item) {
      return item.clip && item.clip.url;
    });

    if (!videoEntries.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "この面接で確認できる録画はありません。";
      list.appendChild(empty);
      return;
    }

    videoEntries.forEach(function (item) {
      var block = document.createElement("article");
      var title = document.createElement("p");
      var meta = document.createElement("p");
      var transcript = document.createElement("p");
      var video = document.createElement("video");
      block.className = "video-review-item";
      title.textContent = "Q" + item.entry.questionNumber + " 録画";
      meta.textContent = [
        item.clip.mimeType || "video",
        item.clip.size ? Math.round(item.clip.size / 1024) + "KB" : "",
        formatDuration(item.clip.durationMs)
      ].filter(Boolean).join(" / ");
      transcript.textContent = "文字起こし: " + (item.entry.transcript && item.entry.transcript.text ? item.entry.transcript.text : item.entry.answer || "");
      video.controls = true;
      video.src = item.clip.url;
      block.appendChild(title);
      block.appendChild(meta);
      block.appendChild(video);
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

  function releaseVideoClips() {
    Object.keys(appState.videoClips || {}).forEach(function (clipId) {
      var clip = appState.videoClips[clipId];
      if (clip && clip.url && window.URL && typeof window.URL.revokeObjectURL === "function") {
        window.URL.revokeObjectURL(clip.url);
      }
    });
    appState.videoClips = {};
    cameraInputState.pendingClip = null;
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

  var HISTORY_FILTER_CATEGORY_ORDER = [
    "self_pr",
    "motivation",
    "student_life",
    "strength_weakness",
    "research",
    "development",
    "team",
    "failure",
    "career",
    "reverse_question"
  ];

  var HISTORY_SORT_OPTIONS = [
    { value: "date_desc", label: "日付が新しい順" },
    { value: "date_asc", label: "日付が古い順" },
    { value: "score_desc", label: "点数が高い順" },
    { value: "score_asc", label: "点数が低い順" }
  ];

  function getHistoryLogTimestamp(log) {
    var value = log.savedAt || log.finishedAt || log.startedAt;
    var date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  }

  function getHistoryLogScore(log) {
    return log.finalFeedback && typeof log.finalFeedback.finalScore === "number" ?
      log.finalFeedback.finalScore : -1;
  }

  function applyHistoryFilterAndSort(logs) {
    var filter = appState.historyFilter || {};
    var filtered = (logs || []).filter(function (log) {
      if (filter.companyName && getLogCompanyName(log) !== filter.companyName) {
        return false;
      }
      if (filter.category) {
        var settings = log.settings || {};
        if (normalizeCategory(settings.category) !== normalizeCategory(filter.category)) {
          return false;
        }
      }
      return true;
    });

    var sort = filter.sort || "date_desc";
    filtered.sort(function (a, b) {
      if (sort === "date_asc") {
        return getHistoryLogTimestamp(a) - getHistoryLogTimestamp(b);
      }
      if (sort === "score_desc") {
        return getHistoryLogScore(b) - getHistoryLogScore(a);
      }
      if (sort === "score_asc") {
        return getHistoryLogScore(a) - getHistoryLogScore(b);
      }
      return getHistoryLogTimestamp(b) - getHistoryLogTimestamp(a);
    });

    return filtered;
  }

  function computeAchievements(logs) {
    var completed = (logs || []).filter(function (log) {
      return log.finalFeedback && typeof log.finalFeedback.finalScore === "number";
    });
    var completedCount = completed.length;

    // 日時が取れないログ（savedAt/finishedAt/startedAtが全て欠落、getHistoryLogTimestampが0を返す）は
    // 「最初に完了した練習」「連続日数」の判定対象から除く。0（1970年扱い）のまま計算に混ぜると、
    // 練習回数のカウントには影響しないものの、日付起点の判定だけが不自然にずれるため。
    var datedCompleted = completed.filter(function (log) {
      return getHistoryLogTimestamp(log) > 0;
    });

    var sortedByDate = datedCompleted.slice().sort(function (a, b) {
      return getHistoryLogTimestamp(a) - getHistoryLogTimestamp(b);
    });
    var firstScore = sortedByDate.length > 0 ? sortedByDate[0].finalFeedback.finalScore : null;

    var maxScore = completed.reduce(function (max, log) {
      return Math.max(max, log.finalFeedback.finalScore);
    }, -Infinity);

    // 完了済み練習の「日付のみ」（ローカル年月日）を重複除去して昇順に並べ、
    // 連続する日数の最長runを求める。DSTの影響を避けるため、年月日の値から
    // Date.UTCで再構成したタイムスタンプで差分を比較する（暦日単位の比較にするため）。
    var dayTimestamps = [];
    var seenDays = {};
    datedCompleted.forEach(function (log) {
      var date = new Date(getHistoryLogTimestamp(log));
      var dayKey = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      if (!seenDays[dayKey]) {
        seenDays[dayKey] = true;
        dayTimestamps.push(dayKey);
      }
    });
    dayTimestamps.sort(function (a, b) {
      return a - b;
    });

    var oneDayMs = 24 * 60 * 60 * 1000;
    var longestStreak = dayTimestamps.length > 0 ? 1 : 0;
    var currentStreak = dayTimestamps.length > 0 ? 1 : 0;
    for (var i = 1; i < dayTimestamps.length; i++) {
      if (dayTimestamps[i] - dayTimestamps[i - 1] === oneDayMs) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    }

    return ACHIEVEMENT_DEFINITIONS.map(function (definition) {
      var earned = false;
      var progressText = null;

      if (definition.category === "practice") {
        earned = completedCount >= definition.threshold;
        if (!earned) {
          progressText = "あと" + (definition.threshold - completedCount) + "回で解禁";
        }
      } else if (definition.category === "streak") {
        earned = longestStreak >= definition.threshold;
        if (!earned) {
          progressText = "過去最長の連続記録: " + longestStreak + "日（あと" +
            (definition.threshold - longestStreak) + "日で解禁）";
        }
      } else if (definition.category === "score") {
        var bestScore = completedCount > 0 ? maxScore : 0;
        earned = completedCount > 0 && maxScore >= definition.threshold;
        if (!earned) {
          progressText = "現在の自己ベスト: " + bestScore + "点（あと" +
            (definition.threshold - bestScore) + "点で解禁）";
        }
      } else {
        // improvement category（score_improve_10）
        if (completedCount < 2 || firstScore === null) {
          earned = false;
          progressText = "まず2回以上練習すると表示されます";
        } else {
          var improvement = maxScore - firstScore;
          earned = improvement >= 10;
          if (!earned) {
            progressText = "現在の向上幅: " + improvement + "点（あと" +
              (10 - improvement) + "点で解禁）";
          }
        }
      }

      return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        earned: earned,
        progressText: earned ? null : progressText
      };
    });
  }

  function updateHistoryCompanyFilterOptions(logs) {
    var select = $("historyCompanyFilter");
    if (!select) {
      return;
    }
    var currentValue = (appState.historyFilter && appState.historyFilter.companyName) || "";
    var names = [];
    var seen = {};
    (logs || []).forEach(function (log) {
      var name = getLogCompanyName(log);
      if (name && !seen[name]) {
        seen[name] = true;
        names.push(name);
      }
    });

    var signature = names.join(" ");
    if (select.dataset.optionsSignature !== signature) {
      select.textContent = "";
      var allOption = document.createElement("option");
      allOption.value = "";
      allOption.textContent = "すべての企業";
      select.appendChild(allOption);
      names.forEach(function (name) {
        var option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
      select.dataset.optionsSignature = signature;
    }

    if (currentValue && names.indexOf(currentValue) !== -1) {
      select.value = currentValue;
    } else {
      select.value = "";
      if (currentValue) {
        appState.historyFilter.companyName = "";
      }
    }
  }

  function ensureHistoryFilterBar(logs) {
    var bar = $("historyFilterBar");

    if (!bar) {
      var listTitle = $("historyListTitle");
      var list = $("historyList");
      if (!listTitle || !list || !listTitle.parentNode) {
        return;
      }

      bar = document.createElement("div");
      bar.id = "historyFilterBar";
      bar.className = "history-filter-bar";

      var companyField = document.createElement("div");
      companyField.className = "history-filter-field";
      var companyLabel = document.createElement("label");
      companyLabel.setAttribute("for", "historyCompanyFilter");
      companyLabel.textContent = "企業";
      var companySelect = document.createElement("select");
      companySelect.id = "historyCompanyFilter";
      companyField.appendChild(companyLabel);
      companyField.appendChild(companySelect);

      var categoryField = document.createElement("div");
      categoryField.className = "history-filter-field";
      var categoryLabel = document.createElement("label");
      categoryLabel.setAttribute("for", "historyCategoryFilter");
      categoryLabel.textContent = "カテゴリ";
      var categorySelect = document.createElement("select");
      categorySelect.id = "historyCategoryFilter";
      var allCategoryOption = document.createElement("option");
      allCategoryOption.value = "";
      allCategoryOption.textContent = "すべてのカテゴリ";
      categorySelect.appendChild(allCategoryOption);
      HISTORY_FILTER_CATEGORY_ORDER.forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = formatCategoryLabel(value);
        categorySelect.appendChild(option);
      });
      categoryField.appendChild(categoryLabel);
      categoryField.appendChild(categorySelect);

      var sortField = document.createElement("div");
      sortField.className = "history-filter-field";
      var sortLabel = document.createElement("label");
      sortLabel.setAttribute("for", "historySortSelect");
      sortLabel.textContent = "並び替え";
      var sortSelect = document.createElement("select");
      sortSelect.id = "historySortSelect";
      HISTORY_SORT_OPTIONS.forEach(function (opt) {
        var option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        sortSelect.appendChild(option);
      });
      sortField.appendChild(sortLabel);
      sortField.appendChild(sortSelect);

      bar.appendChild(companyField);
      bar.appendChild(categoryField);
      bar.appendChild(sortField);

      listTitle.insertAdjacentElement("afterend", bar);

      companySelect.addEventListener("change", function () {
        appState.historyFilter.companyName = companySelect.value;
        renderHistory();
      });
      categorySelect.addEventListener("change", function () {
        appState.historyFilter.category = categorySelect.value;
        renderHistory();
      });
      sortSelect.addEventListener("change", function () {
        appState.historyFilter.sort = sortSelect.value;
        renderHistory();
      });
    }

    updateHistoryCompanyFilterOptions(logs);

    var categorySelectEl = $("historyCategoryFilter");
    if (categorySelectEl) {
      categorySelectEl.value = (appState.historyFilter && appState.historyFilter.category) || "";
    }
    var sortSelectEl = $("historySortSelect");
    if (sortSelectEl) {
      sortSelectEl.value = (appState.historyFilter && appState.historyFilter.sort) || "date_desc";
    }
  }

  function ensureHistoryScoreChart() {
    var chart = $("historyScoreChart");
    if (chart) {
      return;
    }

    var anchor = $("historyFilterBar") || $("historyListTitle");
    var list = $("historyList");
    if (!anchor || !list || !anchor.parentNode) {
      return;
    }

    chart = document.createElement("section");
    chart.id = "historyScoreChart";
    chart.className = "history-score-chart";
    chart.setAttribute("aria-label", "スコア推移");

    var heading = document.createElement("h4");
    heading.className = "history-score-chart-title";
    heading.textContent = "スコア推移";
    chart.appendChild(heading);

    var note = document.createElement("p");
    note.className = "history-score-chart-note";
    note.textContent = "絞り込み条件（企業・カテゴリ）は反映されますが、グラフは常に日付が古い順に表示されます。並び替え設定は一覧のみに適用されます。";
    chart.appendChild(note);

    var body = document.createElement("div");
    body.id = "historyScoreChartBody";
    body.className = "history-score-chart-body";
    chart.appendChild(body);

    anchor.insertAdjacentElement("afterend", chart);
  }

  function renderHistoryScoreChart(filteredLogs) {
    var body = $("historyScoreChartBody");
    if (!body) {
      return;
    }
    body.textContent = "";

    var points = (filteredLogs || [])
      .filter(function (log) {
        return log.finalFeedback && typeof log.finalFeedback.finalScore === "number";
      })
      .slice()
      .sort(function (a, b) {
        return getHistoryLogTimestamp(a) - getHistoryLogTimestamp(b);
      })
      .map(function (log) {
        return {
          score: log.finalFeedback.finalScore,
          dateLabel: formatDate(log.savedAt || log.finishedAt || log.startedAt)
        };
      });

    if (points.length < 2) {
      var empty = document.createElement("p");
      empty.className = "history-score-chart-empty";
      empty.textContent = "データが不足しています（2件以上の面接記録が必要です）。";
      body.appendChild(empty);
      return;
    }

    var width = 640;
    var height = 220;
    var marginLeft = 40;
    var marginRight = 16;
    var marginTop = 16;
    var marginBottom = 28;
    var plotWidth = width - marginLeft - marginRight;
    var plotHeight = height - marginTop - marginBottom;
    var svgNs = "http://www.w3.org/2000/svg";

    function yForScore(score) {
      var clamped = Math.max(0, Math.min(100, score));
      return marginTop + plotHeight - (clamped / 100) * plotHeight;
    }

    function xForIndex(index) {
      if (points.length === 1) {
        return marginLeft + plotWidth / 2;
      }
      return marginLeft + (index / (points.length - 1)) * plotWidth;
    }

    var svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", height);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "面接スコアの推移グラフ");
    svg.classList.add("history-score-chart-svg");

    [0, 25, 50, 75, 100].forEach(function (tick) {
      var y = yForScore(tick);
      var gridLine = document.createElementNS(svgNs, "line");
      gridLine.setAttribute("x1", String(marginLeft));
      gridLine.setAttribute("x2", String(width - marginRight));
      gridLine.setAttribute("y1", String(y));
      gridLine.setAttribute("y2", String(y));
      gridLine.setAttribute("class", "history-score-chart-grid");
      svg.appendChild(gridLine);

      var label = document.createElementNS(svgNs, "text");
      label.setAttribute("x", String(marginLeft - 8));
      label.setAttribute("y", String(y));
      label.setAttribute("class", "history-score-chart-axis-label");
      label.setAttribute("text-anchor", "end");
      label.setAttribute("dominant-baseline", "middle");
      label.textContent = String(tick);
      svg.appendChild(label);
    });

    var baseline = document.createElementNS(svgNs, "line");
    baseline.setAttribute("x1", String(marginLeft));
    baseline.setAttribute("x2", String(width - marginRight));
    baseline.setAttribute("y1", String(marginTop + plotHeight));
    baseline.setAttribute("y2", String(marginTop + plotHeight));
    baseline.setAttribute("class", "history-score-chart-axis");
    svg.appendChild(baseline);

    var pathData = points.map(function (point, index) {
      var x = xForIndex(index);
      var y = yForScore(point.score);
      return (index === 0 ? "M" : "L") + x + "," + y;
    }).join(" ");
    var path = document.createElementNS(svgNs, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("class", "history-score-chart-line");
    svg.appendChild(path);

    points.forEach(function (point, index) {
      var x = xForIndex(index);
      var y = yForScore(point.score);
      var circle = document.createElementNS(svgNs, "circle");
      circle.setAttribute("cx", String(x));
      circle.setAttribute("cy", String(y));
      circle.setAttribute("r", "5");
      circle.setAttribute("class", "history-score-chart-point");
      circle.setAttribute("tabindex", "0");

      var pointTitle = document.createElementNS(svgNs, "title");
      pointTitle.textContent = point.dateLabel + " / " + point.score + "点";
      circle.appendChild(pointTitle);

      svg.appendChild(circle);
    });

    body.appendChild(svg);
  }

  function renderAchievementBadges(logs) {
    var container = $("achievementBadges");
    if (!container) {
      return;
    }
    container.textContent = "";

    var achievements = computeAchievements(logs);
    achievements.forEach(function (achievement) {
      var card = document.createElement("article");
      card.className = "achievement-badge" + (achievement.earned ? " is-earned" : " is-locked");

      var title = document.createElement("p");
      title.className = "achievement-badge-title";
      title.textContent = achievement.title;
      card.appendChild(title);

      var description = document.createElement("p");
      description.className = "achievement-badge-description";
      description.textContent = achievement.description;
      card.appendChild(description);

      if (achievement.earned) {
        var earnedLabel = document.createElement("p");
        earnedLabel.className = "achievement-badge-status";
        earnedLabel.textContent = "達成済み";
        card.appendChild(earnedLabel);
      } else if (achievement.progressText) {
        var progress = document.createElement("p");
        progress.className = "achievement-badge-progress";
        progress.textContent = achievement.progressText;
        card.appendChild(progress);
      }

      container.appendChild(card);
    });
  }

  function renderHistory() {
    var logs = appState.activeAccountId ? getAccountInterviewLogs(appState.activeAccountId) : [];
    var list = $("historyList");
    var detail = $("historyDetail");
    appState.selectedHistoryId = null;

    ensureHistoryFilterBar(logs);
    var filteredLogs = applyHistoryFilterAndSort(logs);
    ensureHistoryScoreChart();
    renderHistoryScoreChart(filteredLogs);
    renderAchievementBadges(logs);

    if (list) {
      list.textContent = "";
      if (!filteredLogs.length) {
        var empty = document.createElement("p");
        empty.textContent = logs.length ? "条件に一致する履歴がありません。" : "保存された面接ログはありません。";
        list.appendChild(empty);
      }
      filteredLogs.forEach(function (log) {
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
      detail.textContent = filteredLogs.length ? "履歴を選択してください。" : "";
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
        topic: message.topic || null,
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

  function appendRubricLevels(parent, rubricLevels) {
    var safeLevels = sanitizeRubricLevels(rubricLevels, []);
    if (!safeLevels.length) {
      return;
    }
    var items = safeLevels.map(function (level) {
      var keys = level.requiredEvidenceKeys && level.requiredEvidenceKeys.length
        ? " / 根拠: " + level.requiredEvidenceKeys.join(", ")
        : "";
      return "Lv" + level.level + " " + level.label + ": " + level.description + keys;
    });
    appendCompactList(parent, "5段階ルーブリック", items);
  }

  function appendExpectedAnswerData(parent, expectedAnswerData, evaluation) {
    if (!expectedAnswerData) {
      return;
    }
    var normalized = normalizeExpectedAnswerData(expectedAnswerData, expectedAnswerData);
    var section = document.createElement("div");
    var meta = document.createElement("p");
    var intent = document.createElement("p");
    var notice = document.createElement("p");
    section.className = "expected-answer-block";
    meta.textContent = "評価分類: " + (normalized.questionCategory || "default") + " / " + (normalized.intentLabel || "general_interview_fit") + " / 信頼度: " + (normalized.scoreConfidence || "medium");
    intent.textContent = "評価基準: " + (normalized.questionIntent || "なし");
    notice.textContent = "注意: 未確認の事実や職務適性と関係ない個人属性は、採点根拠にしません。";
    section.appendChild(meta);
    section.appendChild(intent);
    section.appendChild(notice);
    appendCompactList(section, "必ず見る条件", normalized.mustInclude);
    appendCompactList(section, "加点要素", normalized.shouldInclude);
    appendCompactList(section, "確認する根拠項目", normalized.evidenceFields);
    appendRubricLevels(section, normalized.rubricLevels);
    appendCompactList(section, "ESから参照した事実", normalized.referenceFactsFromES);
    appendCompactList(section, "リスク", normalized.riskSignals);
    appendCompactList(section, "未確認事実の扱い", normalized.unverifiedClaims);
    appendCompactList(section, "評価禁止・注意事項", normalized.fairnessRisks);
    appendCompactList(section, "深掘り観点", normalized.followUpFocus);
    if (evaluation && evaluation.missingElements && evaluation.missingElements.length) {
      appendCompactList(section, "今回不足していた要素", evaluation.missingElements);
    }
    if (evaluation && evaluation.unverifiedClaims && evaluation.unverifiedClaims.length) {
      appendCompactList(section, "今回の未確認情報", evaluation.unverifiedClaims);
    }
    if (evaluation && evaluation.fairnessFlags && evaluation.fairnessFlags.length) {
      appendCompactList(section, "公平性チェック", evaluation.fairnessFlags);
    }
    if (evaluation && evaluation.scoreConfidence) {
      var confidence = document.createElement("p");
      confidence.textContent = "今回の採点信頼度: " + evaluation.scoreConfidence;
      section.appendChild(confidence);
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
      "面接官: " + getInterviewerType(settings.interviewerType).label + (settings.interviewerTypeMode === "random" ? "（ランダム選択）" : ""),
      "総合点: " + (log.finalFeedback ? log.finalFeedback.finalScore + "点" : "未評価"),
      "日時: " + formatDate(log.savedAt || log.finishedAt || log.startedAt)
    ].join(" / ");
    detail.appendChild(meta);

    var actions = document.createElement("div");
    actions.className = "form-actions history-detail-actions";
    var reuseButton = document.createElement("button");
    reuseButton.type = "button";
    reuseButton.className = "button button-secondary button-small";
    reuseButton.dataset.action = "reuse-history-settings";
    reuseButton.dataset.historyId = log && log.id ? log.id : "";
    reuseButton.textContent = "同じ設定で再練習";
    var copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "button button-secondary button-small";
    copyButton.dataset.action = "copy-history-detail";
    copyButton.dataset.historyId = log && log.id ? log.id : "";
    copyButton.textContent = "詳細をコピー";
    var exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "button button-secondary button-small";
    exportButton.dataset.action = "export-history-json";
    exportButton.dataset.historyId = log && log.id ? log.id : "";
    exportButton.textContent = "JSONでエクスポート";
    actions.appendChild(reuseButton);
    actions.appendChild(copyButton);
    actions.appendChild(exportButton);
    detail.appendChild(actions);

    var actionStatus = document.createElement("p");
    actionStatus.id = "historyDetailActionStatus";
    actionStatus.className = "history-detail-action-status";
    detail.appendChild(actionStatus);

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
      var topic = document.createElement("p");
      var a = document.createElement("p");
      var transcript = document.createElement("p");
      var audioNote = document.createElement("p");
      var fillerNote = document.createElement("p");
      var paceNote = document.createElement("p");
      var responseTimeNote = document.createElement("p");
      var bodyLanguageNote = document.createElement("p");
      var e = document.createElement("p");
      var deepDive = document.createElement("p");
      var followUpReason = document.createElement("p");
      heading.textContent = "Q" + entry.questionNumber;
      q.textContent = "Q. " + entry.question;
      topic.textContent = "テーマ: " + (entry.topic && entry.topic.label ? entry.topic.label : "未記録");
      a.textContent = "A. " + entry.answer;
      transcript.textContent = "文字起こし: " + (entry.transcript && entry.transcript.text ? entry.transcript.text : entry.answer || "");
      audioNote.textContent = entry.audio && entry.audio.reviewAvailableDuringSession
        ? "音声: 長期保存なし。面接終了直後の画面でのみ確認可能です。"
        : "音声: 保存なし";
      var speechAnalysis = analyzeEntrySpeech(entry);
      fillerNote.className = "item-meta";
      fillerNote.textContent = "フィラーワード: " + (speechAnalysis.fillerWords.total > 0
        ? speechAnalysis.fillerWords.total + "回（" + speechAnalysis.fillerWords.breakdown.map(function (item) {
          return item.word + "×" + item.count;
        }).join(", ") + "）"
        : "なし");
      paceNote.className = "item-meta";
      paceNote.textContent = "話速: " + (speechAnalysis.paceCharsPerMinute !== null
        ? speechAnalysis.paceCharsPerMinute + "文字/分"
        : "計測不可（音声入力なし）");
      responseTimeNote.className = "item-meta";
      responseTimeNote.textContent = "回答時間: " + (typeof entry.responseTimeMs === "number" && Number.isFinite(entry.responseTimeMs) && entry.responseTimeMs >= 0
        ? formatDuration(entry.responseTimeMs)
        : "計測不可");
      bodyLanguageNote.className = "item-meta";
      if (entry.bodyLanguageMetrics && entry.bodyLanguageMetrics.available) {
        var blParts = [];
        if (entry.bodyLanguageMetrics.motionLevel && entry.bodyLanguageMetrics.motionLevel.available &&
          typeof entry.bodyLanguageMetrics.motionLevel.score === "number" &&
          Number.isFinite(entry.bodyLanguageMetrics.motionLevel.score)) {
          blParts.push("変化量" + Math.round(entry.bodyLanguageMetrics.motionLevel.score) + "/100");
        }
        if (entry.bodyLanguageMetrics.faceStability && entry.bodyLanguageMetrics.faceStability.available &&
          typeof entry.bodyLanguageMetrics.faceStability.score === "number" &&
          Number.isFinite(entry.bodyLanguageMetrics.faceStability.score)) {
          blParts.push("安定度" + Math.round(entry.bodyLanguageMetrics.faceStability.score) + "/100");
        }
        bodyLanguageNote.textContent = "映像の傾向（参考値）: " + (blParts.length ? blParts.join(" / ") : "算出不可");
      }
      e.textContent = "評価: " + (entry.evaluation ? entry.evaluation.score + "点 - " + entry.evaluation.summary : "なし");
      deepDive.textContent = "深掘り質問: " + (entry.evaluation && entry.evaluation.deepDiveQuestion ? entry.evaluation.deepDiveQuestion : "なし");
      followUpReason.textContent = "追加確認の理由: " + (entry.evaluation && entry.evaluation.followUpReason ? entry.evaluation.followUpReason : "なし");
      block.appendChild(heading);
      block.appendChild(q);
      block.appendChild(topic);
      block.appendChild(a);
      if (entry.transcript || entry.audio) {
        block.appendChild(transcript);
        block.appendChild(audioNote);
      }
      block.appendChild(fillerNote);
      block.appendChild(paceNote);
      block.appendChild(responseTimeNote);
      if (entry.bodyLanguageMetrics && entry.bodyLanguageMetrics.available) {
        block.appendChild(bodyLanguageNote);
      }
      block.appendChild(e);
      block.appendChild(deepDive);
      block.appendChild(followUpReason);
      appendExpectedAnswerData(block, getEntryExpectedAnswerData(entry), entry.evaluation);
      detail.appendChild(block);
    });
  }

  function reuseHistorySettings(log) {
    if (!log) {
      return;
    }
    var settings = log.settings || {};
    var company = settings.companyId ? findCompany(settings.companyId, appState.activeAccountId) : null;
    if (company) {
      setValue("setupCompanySelect", company.id);
      appState.pendingSourceCompanyId = company.id;
      setValue("companyInput", company.companyName || settings.company || "");
      setValue("roleInput", company.role || settings.role || "");
    } else {
      setValue("setupCompanySelect", "");
      appState.pendingSourceCompanyId = null;
      setValue("companyInput", settings.company || "");
      setValue("roleInput", settings.role || "");
    }
    setValue("interviewTypeSelect", settings.interviewType || DEFAULT_SETTINGS.interviewType);
    setValue("targetTypeSelect", settings.targetType || DEFAULT_SETTINGS.targetType);
    setValue("categorySelect", normalizeCategory(settings.category || DEFAULT_SETTINGS.category));
    setValue("questionSourceSelect", settings.questionSource || DEFAULT_SETTINGS.questionSource);
    setValue("questionCountSelect", settings.questionCount || DEFAULT_SETTINGS.questionCount);
    setValue("userProfileInput", settings.userProfile || "");
    // カメラ利用は毎セッション明示的な同意操作を必須にするため、過去の設定から
    // 有効状態を復元しない（チェックは常にユーザーの今回の操作に委ねる）。
    var cameraEnabledCheckbox = $("cameraEnabledInput");
    if (cameraEnabledCheckbox && !cameraEnabledCheckbox.disabled) {
      cameraEnabledCheckbox.checked = false;
    }
    selectInterviewerType(settings.interviewerTypeMode === "random"
      ? RANDOM_INTERVIEWER_TYPE_ID
      : settings.interviewerTypeSelection || settings.interviewerType || DEFAULT_SETTINGS.interviewerType);
    renderSetupCompanySelect();
    setValue("setupCompanySelect", company ? company.id : "");
    if (company) {
      renderSourceEsPreview(company, getCompanyEsEntries(company.id, company.accountId));
    } else {
      renderSourceEsPreview(null, []);
    }
    showView("setupView");
  }

  function buildHistoryDetailText(log) {
    if (!log) {
      return "";
    }
    var settings = log.settings || {};
    var entries = getLogEntries(log);
    var lines = [];
    lines.push(getLogCompanyName(log) + " / " + (settings.role || "職種未設定"));
    lines.push("面接タイプ: " + formatInterviewTypeLabel(settings.interviewType));
    lines.push("カテゴリ: " + formatCategoryLabel(settings.category));
    lines.push("面接官: " + getInterviewerType(settings.interviewerType).label + (settings.interviewerTypeMode === "random" ? "（ランダム選択）" : ""));
    lines.push("総合点: " + (log.finalFeedback ? log.finalFeedback.finalScore + "点" : "未評価"));
    lines.push("日時: " + formatDate(log.savedAt || log.finishedAt || log.startedAt));
    lines.push("");
    var sourceEsEntries = getLogSourceEsEntries(log);
    if (sourceEsEntries.length) {
      lines.push("使用したES一覧");
      sourceEsEntries.forEach(function (sourceEsEntry, index) {
        lines.push("ES" + (index + 1) + " 設問: " + (sourceEsEntry.questionText || "未入力"));
        lines.push("ES" + (index + 1) + " 回答: " + (sourceEsEntry.answerText || "未入力"));
      });
      lines.push("");
    }
    entries.forEach(function (entry) {
      lines.push("Q" + entry.questionNumber + ". " + entry.question);
      if (entry.topic && entry.topic.label) {
        lines.push("テーマ: " + entry.topic.label);
      }
      lines.push("A. " + (entry.answer || ""));
      if (typeof entry.responseTimeMs === "number" && Number.isFinite(entry.responseTimeMs) && entry.responseTimeMs >= 0) {
        lines.push("回答時間: " + formatDuration(entry.responseTimeMs));
      }
      if (entry.bodyLanguageMetrics && entry.bodyLanguageMetrics.available) {
        var textBlParts = [];
        if (entry.bodyLanguageMetrics.motionLevel && entry.bodyLanguageMetrics.motionLevel.available &&
          typeof entry.bodyLanguageMetrics.motionLevel.score === "number" &&
          Number.isFinite(entry.bodyLanguageMetrics.motionLevel.score)) {
          textBlParts.push("変化量" + Math.round(entry.bodyLanguageMetrics.motionLevel.score) + "/100");
        }
        if (entry.bodyLanguageMetrics.faceStability && entry.bodyLanguageMetrics.faceStability.available &&
          typeof entry.bodyLanguageMetrics.faceStability.score === "number" &&
          Number.isFinite(entry.bodyLanguageMetrics.faceStability.score)) {
          textBlParts.push("安定度" + Math.round(entry.bodyLanguageMetrics.faceStability.score) + "/100");
        }
        if (textBlParts.length) {
          lines.push("映像の傾向（参考値）: " + textBlParts.join(" / "));
        }
      }
      lines.push("評価: " + (entry.evaluation ? entry.evaluation.score + "点 - " + entry.evaluation.summary : "なし"));
      if (entry.evaluation && entry.evaluation.deepDiveQuestion) {
        lines.push("深掘り質問: " + entry.evaluation.deepDiveQuestion);
      }
      if (entry.evaluation && entry.evaluation.followUpReason) {
        lines.push("追加確認の理由: " + entry.evaluation.followUpReason);
      }
      lines.push("");
    });
    return lines.join("\n").replace(/\n+$/, "\n");
  }

  function copyHistoryDetailToClipboard(log) {
    if (!log) {
      return;
    }
    var text = buildHistoryDetailText(log);
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      setText("historyDetailActionStatus", "このブラウザ・環境ではクリップボードへのコピーに対応していません。");
      return;
    }
    navigator.clipboard.writeText(text).then(function () {
      setText("historyDetailActionStatus", "履歴の詳細をクリップボードにコピーしました。");
    }).catch(function (error) {
      console.warn("Failed to copy history detail to clipboard:", error);
      setText("historyDetailActionStatus", "コピーに失敗しました: " + (error && error.message ? error.message : "不明なエラー"));
    });
  }

  function exportHistoryDetailAsJson(log) {
    if (!log) {
      return;
    }
    try {
      var json = JSON.stringify(log, null, 2);
      var blob = new Blob([json], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");
      var rawName = getLogCompanyName(log) || log.id || "interview-log";
      var safeName = String(rawName).replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || "interview-log";
      var dateSource = log.savedAt || log.finishedAt || log.startedAt;
      var dateValue = dateSource ? new Date(dateSource) : new Date();
      var datePart = Number.isNaN(dateValue.getTime()) ? "" : dateValue.toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = "interview-log-" + safeName + (datePart ? "-" + datePart : "") + ".json";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setText("historyDetailActionStatus", "JSONファイルをダウンロードしました。");
    } catch (error) {
      console.warn("Failed to export history detail as JSON:", error);
      setText("historyDetailActionStatus", "エクスポートに失敗しました: " + (error && error.message ? error.message : "不明なエラー"));
    }
  }

  function handleHistoryDetailClick(event) {
    var target = event && event.target && typeof event.target.closest === "function"
      ? event.target.closest("[data-action]")
      : null;
    if (!target) {
      return;
    }
    var historyId = target.dataset ? target.dataset.historyId : null;
    if (!historyId) {
      return;
    }
    var log = loadInterviewLogs().find(function (item) {
      return item.id === historyId && item.accountId === appState.activeAccountId;
    });
    if (!log) {
      setText("historyDetailActionStatus", "対象の履歴が見つかりませんでした。");
      return;
    }
    var action = target.dataset.action;
    if (action === "reuse-history-settings") {
      reuseHistorySettings(log);
    } else if (action === "copy-history-detail") {
      copyHistoryDetailToClipboard(log);
    } else if (action === "export-history-json") {
      exportHistoryDetailAsJson(log);
    }
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
    releaseVideoClips();
    stopCameraMediaStream();
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
    if (cloudState.user && cloudState.service) {
      signOutGoogle();
      return;
    }
    releaseAudioClips();
    releaseVideoClips();
    stopCameraMediaStream();
    if (appState.editingCompanyId) {
      cancelEditCompany();
    }
    if (appState.editingEsEntryId) {
      resetEsEditingState();
    }
    rememberActiveAccount(null);
    appState.selectedCompanyId = null;
    appState.pendingSourceCompanyId = null;
    renderSourceEsPreview(null, []);
    renderAccounts();
    showView("accountView");
  }

  function clearHistory() {
    if (!appState.activeAccountId) {
      return;
    }
    var logs = getAccountInterviewLogs(appState.activeAccountId);
    if (!logs.length) {
      return;
    }
    var confirmed = window.confirm("選択中アカウントの面接履歴をすべて削除します。この操作は元に戻せません。よろしいですか？");
    if (!confirmed) {
      return;
    }
    var activeAccountId = appState.activeAccountId;
    var remainingLogs = loadInterviewLogs().filter(function (log) {
      return log.accountId !== activeAccountId;
    });
    saveInterviewLogs(remainingLogs);
    appState.selectedHistoryId = null;
    renderHistory();
  }

  function deleteSelectedHistory() {
    if (!appState.selectedHistoryId) {
      setText("historyDetail", "削除する履歴を一覧から選択してください。");
      return;
    }
    var targetLog = loadInterviewLogs().find(function (log) {
      return log.id === appState.selectedHistoryId;
    });
    if (!targetLog || targetLog.accountId !== appState.activeAccountId) {
      setText("historyDetail", "削除する履歴を一覧から選択してください。");
      appState.selectedHistoryId = null;
      return;
    }
    var companyLabel = getLogCompanyName(targetLog);
    var confirmed = window.confirm("「" + companyLabel + "」の面接履歴を削除します。この操作は元に戻せません。よろしいですか？");
    if (!confirmed) {
      return;
    }
    deleteInterviewLog(appState.selectedHistoryId, appState.activeAccountId);
    appState.selectedHistoryId = null;
    renderHistory();
  }

  function handleAccountListClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    if (!target || !target.dataset.accountId) {
      return;
    }
    var accountId = target.dataset.accountId;
    if (target.dataset.action === "select-account") {
      selectAccount(accountId);
    } else if (target.dataset.action === "edit-account") {
      startEditAccount(accountId);
    } else if (target.dataset.action === "delete-account") {
      deleteAccountCascade(accountId);
    }
  }

  function handleCompanyListClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    if (!target || !target.dataset.companyId) {
      return;
    }
    var companyId = target.dataset.companyId;
    if (target.dataset.action === "select-company") {
      selectCompany(companyId);
    } else if (target.dataset.action === "edit-company") {
      startEditCompany(companyId);
    } else if (target.dataset.action === "duplicate-company") {
      duplicateCompany(companyId);
    } else if (target.dataset.action === "delete-company") {
      deleteCompany(companyId);
    }
  }

  function handleEsEntryListClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    if (!target || !target.dataset.esEntryId) {
      return;
    }
    var entryId = target.dataset.esEntryId;
    if (target.dataset.action === "use-es-entry") {
      useEsEntry(entryId);
    } else if (target.dataset.action === "edit-es-entry") {
      startEditEsEntry(entryId);
    } else if (target.dataset.action === "duplicate-es-entry") {
      duplicateEsEntry(entryId);
    } else if (target.dataset.action === "delete-es-entry") {
      deleteEsEntry(entryId);
    }
  }

  function handleInterviewerAvatarClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action='select-interviewer-type']") : null;
    if (target && target.dataset.interviewerType) {
      selectInterviewerType(target.dataset.interviewerType);
    }
  }

  function handleInterviewerAvatarKeydown(event) {
    var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", " ", "Enter"];
    if (keys.indexOf(event.key) === -1) {
      return;
    }
    var options = Array.prototype.slice.call(document.querySelectorAll("[data-action='select-interviewer-type']"));
    if (!options.length) {
      return;
    }
    var currentIndex = Math.max(0, options.indexOf(document.activeElement));
    var nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }
    event.preventDefault();
    var next = options[nextIndex];
    if (next && next.dataset.interviewerType) {
      var nextType = next.dataset.interviewerType;
      selectInterviewerType(nextType);
      var refreshed = document.querySelector("[data-action='select-interviewer-type'][data-interviewer-type='" + nextType + "']");
      if (refreshed) {
        refreshed.focus();
      }
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

  function getSupportedVideoMimeType() {
    if (!window.MediaRecorder || typeof window.MediaRecorder.isTypeSupported !== "function") {
      return "";
    }
    return [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4"
    ].find(function (type) {
      return window.MediaRecorder.isTypeSupported(type);
    }) || "";
  }

  function stopCameraMediaStream() {
    try {
      clearBodyLanguageSamplingInterval();
    } catch (error) {
      console.warn("Body language sampling interval could not be cleared during teardown:", error);
    }
    if (cameraInputState.mediaRecorder && cameraInputState.mediaRecorder.state !== "inactive") {
      try {
        cameraInputState.mediaRecorder.stop();
      } catch (error) {
        console.warn("Camera recorder could not be stopped during teardown:", error);
      }
    }
    cameraInputState.mediaRecorder = null;
    cameraInputState.recordingStopPromise = null;
    cameraInputState.videoChunks = [];
    cameraInputState.recordingStartedAt = null;
    if (cameraInputState.mediaStream && typeof cameraInputState.mediaStream.getTracks === "function") {
      cameraInputState.mediaStream.getTracks().forEach(function (track) {
        if (track && typeof track.stop === "function") {
          track.stop();
        }
      });
    }
    cameraInputState.mediaStream = null;
    cameraInputState.isRecording = false;
    var preview = $("cameraSelfPreview");
    if (preview) {
      preview.srcObject = null;
    }
    var panel = $("cameraPreviewPanel");
    if (panel) {
      panel.hidden = true;
    }
  }

  async function setupCameraCapture() {
    cameraInputState.lastError = "";
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function" || !window.MediaRecorder) {
      cameraInputState.isSupported = false;
      cameraInputState.lastError = "unsupported";
      setText("cameraStatus", "このブラウザはカメラ録画に対応していません。テキスト回答や音声入力など他の機能は通常通り利用できます。");
      var unsupportedPanel = $("cameraPreviewPanel");
      if (unsupportedPanel) {
        unsupportedPanel.hidden = false;
      }
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraInputState.mediaStream = stream;
      cameraInputState.isSupported = true;
      var preview = $("cameraSelfPreview");
      if (preview) {
        preview.srcObject = stream;
      }
      var panel = $("cameraPreviewPanel");
      if (panel) {
        panel.hidden = false;
      }
      setText("cameraStatus", "カメラ映像を録画しています。録画はこの面接セッション中のみ確認でき、終了後は破棄されます。");
    } catch (error) {
      cameraInputState.isSupported = false;
      cameraInputState.mediaStream = null;
      cameraInputState.lastError = error && error.message ? error.message : "camera-unavailable";
      setText("cameraStatus", "カメラ・マイクを利用できませんでした（" + cameraInputState.lastError + "）。テキスト回答や音声入力など他の機能には影響しません。");
      var errorPanel = $("cameraPreviewPanel");
      if (errorPanel) {
        errorPanel.hidden = false;
      }
      console.warn("Camera capture could not be started:", error);
    }
  }

  function createVideoClipFromBlob(blob, startedAt) {
    if (!blob || !blob.size || !window.URL || typeof window.URL.createObjectURL !== "function") {
      return null;
    }
    var clip = {
      id: makeId("video"),
      url: window.URL.createObjectURL(blob),
      mimeType: blob.type || "video/webm",
      size: blob.size,
      durationMs: startedAt ? Math.max(0, Date.now() - startedAt) : null,
      createdAt: new Date().toISOString()
    };
    appState.videoClips[clip.id] = clip;
    return clip;
  }

  function isFaceDetectorSupported() {
    return typeof window.FaceDetector === "function";
  }

  function setupFaceDetectorForSampling() {
    cameraInputState.faceDetector = null;
    cameraInputState.faceDetectorSupported = false;
    if (!isFaceDetectorSupported()) {
      return;
    }
    try {
      cameraInputState.faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      // API自体はあってもコンストラクタが失敗する環境があるため、実際に初期化できた
      // 場合だけ「対応している」とみなす。この値をサンプリング終了時の結果に焼き込み、
      // 履歴表示時は閲覧中ブラウザの対応状況ではなく録画当時の値を使う。
      cameraInputState.faceDetectorSupported = true;
    } catch (error) {
      cameraInputState.faceDetector = null;
      console.warn("FaceDetector could not be initialized:", error);
    }
  }

  function ensureBodyLanguageSampleCanvas() {
    if (cameraInputState.sampleCanvas && cameraInputState.sampleCanvasCtx) {
      return;
    }
    try {
      var canvas = document.createElement("canvas");
      canvas.width = BODY_LANGUAGE_SAMPLE_WIDTH;
      canvas.height = BODY_LANGUAGE_SAMPLE_HEIGHT;
      cameraInputState.sampleCanvas = canvas;
      cameraInputState.sampleCanvasCtx = canvas.getContext("2d", { willReadFrequently: true });
    } catch (error) {
      cameraInputState.sampleCanvas = null;
      cameraInputState.sampleCanvasCtx = null;
      console.warn("Body language sample canvas could not be created:", error);
    }
  }

  // videoを縮小したオフスクリーンcanvasをグレースケール化し、前フレームとの平均絶対差分（0-255スケール、正規化前）を返す。
  // 差分を取れる前フレームがまだない場合はnullを返す。
  function sampleMotionDiff(video) {
    var canvas = cameraInputState.sampleCanvas;
    var ctx = cameraInputState.sampleCanvasCtx;
    if (!canvas || !ctx) {
      return null;
    }
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var pixelCount = canvas.width * canvas.height;
      var gray = new Float32Array(pixelCount);
      for (var i = 0; i < pixelCount; i += 1) {
        var offset = i * 4;
        gray[i] = frame.data[offset] * 0.299 + frame.data[offset + 1] * 0.587 + frame.data[offset + 2] * 0.114;
      }
      var diff = null;
      if (cameraInputState.lastFrameData && cameraInputState.lastFrameData.length === pixelCount) {
        var sum = 0;
        for (var j = 0; j < pixelCount; j += 1) {
          sum += Math.abs(gray[j] - cameraInputState.lastFrameData[j]);
        }
        diff = sum / pixelCount;
      }
      cameraInputState.lastFrameData = gray;
      return diff;
    } catch (error) {
      console.warn("Motion diff sampling failed:", error);
      return null;
    }
  }

  // FaceDetectorで検出した最初の顔の中心座標を、video解像度に対する0-1の相対座標として返す。未検出・失敗時はnull。
  async function detectFacePosition(video) {
    if (!cameraInputState.faceDetector || !video.videoWidth || !video.videoHeight) {
      return null;
    }
    try {
      var faces = await cameraInputState.faceDetector.detect(video);
      if (!faces || !faces.length || !faces[0].boundingBox) {
        return null;
      }
      var box = faces[0].boundingBox;
      return {
        x: (box.x + box.width / 2) / video.videoWidth,
        y: (box.y + box.height / 2) / video.videoHeight
      };
    } catch (error) {
      console.warn("Face detection failed:", error);
      return null;
    }
  }

  function clearBodyLanguageSamplingInterval() {
    if (cameraInputState.samplingIntervalId !== null) {
      clearInterval(cameraInputState.samplingIntervalId);
      cameraInputState.samplingIntervalId = null;
    }
  }

  // sessionIdは呼び出し時点のcameraInputState.samplingSessionIdを閉じ込めておき、
  // 非同期の顔検出待ち中に次の質問のstopBodyLanguageSampling()が呼ばれて
  // サンプル配列がリセットされても、古いtickの結果を新しい配列へ混入させないためのガード。
  function runBodyLanguageSamplingTick(video, sessionId) {
    if (cameraInputState.samplingTickInProgress) {
      return;
    }
    cameraInputState.samplingTickInProgress = true;
    Promise.resolve()
      .then(async function () {
        if (!video || !video.videoWidth || !video.videoHeight) {
          return;
        }
        cameraInputState.samplingTickCount += 1;
        var motionDiff = sampleMotionDiff(video);
        var facePosition = null;
        // 顔検出は重いため、動き検出より低頻度（2回に1回）で実行する。
        if (cameraInputState.faceDetector && cameraInputState.samplingTickCount % 2 === 0) {
          facePosition = await detectFacePosition(video);
        }
        if (cameraInputState.samplingSessionId !== sessionId) {
          // 待っている間に質問が切り替わっていたら、このtickの結果は捨てる。
          return;
        }
        cameraInputState.bodyLanguageSamples.push({
          facePosition: facePosition,
          motionDiff: motionDiff
        });
      })
      .catch(function (error) {
        console.warn("Body language sampling tick failed:", error);
      })
      .then(function () {
        cameraInputState.samplingTickInProgress = false;
      });
  }

  // 質問ごとの録画開始に合わせて呼び出す。FaceDetectorのfeature detection、
  // オフスクリーンcanvasの準備、サンプリング用setIntervalの起動を行う。
  // 失敗しても面接の進行・MediaRecorderでの録画自体には一切影響させない。
  function startBodyLanguageSampling() {
    try {
      clearBodyLanguageSamplingInterval();
      cameraInputState.bodyLanguageSamples = [];
      cameraInputState.lastFrameData = null;
      cameraInputState.samplingTickCount = 0;
      cameraInputState.samplingTickInProgress = false;
      cameraInputState.samplingSessionId += 1;
      var sessionId = cameraInputState.samplingSessionId;
      ensureBodyLanguageSampleCanvas();
      setupFaceDetectorForSampling();
      var video = $("cameraSelfPreview");
      if (!video || !cameraInputState.sampleCanvas) {
        return;
      }
      // 質問が短時間で回答された場合でも最低1件の動き量サンプルを確保できるよう、
      // intervalの初回発火を待たずに即座に1回サンプリングしておく（1回目は前フレームが
      // ないためmotionDiffはnullになるが、2回目以降の差分計算の基準フレームにはなる）。
      runBodyLanguageSamplingTick(video, sessionId);
      cameraInputState.samplingIntervalId = setInterval(function () {
        runBodyLanguageSamplingTick(video, sessionId);
      }, BODY_LANGUAGE_SAMPLE_INTERVAL_MS);
    } catch (error) {
      console.warn("Body language sampling could not be started:", error);
    }
  }

  function createUnavailableBodyLanguageMetrics() {
    return {
      available: false,
      faceStability: { available: false, score: null, sampleCount: 0, unavailableReason: "no_camera" },
      motionLevel: { available: false, score: null, sampleCount: 0 }
    };
  }

  // setIntervalを止め、蓄積したサンプルからfaceStability/motionLevelスコアを集計して返す
  // （motionLevelは0-100で高いほど「動きが大きい」、faceStabilityは0-100で高いほど「位置が安定」という
  // 意味であり、どちらも「高い=良い」という評価ではない。単なる傾向の目安値）。
  // 次の質問のサンプリングに影響しないよう、蓄積状態もリセットする。
  function stopBodyLanguageSampling() {
    var result = createUnavailableBodyLanguageMetrics();
    result.faceStability.unavailableReason = cameraInputState.faceDetectorSupported ? "not_detected" : "unsupported";
    try {
      clearBodyLanguageSamplingInterval();
      // 進行中の非同期tickが古いsessionIdの結果を誤って新しい配列にpushしないよう、
      // ここでsessionを進めておく（runBodyLanguageSamplingTick側のガードと対になる）。
      cameraInputState.samplingSessionId += 1;
      var samples = cameraInputState.bodyLanguageSamples || [];

      var motionValues = samples
        .map(function (sample) { return sample.motionDiff; })
        .filter(function (value) { return typeof value === "number" && isFinite(value); });
      if (motionValues.length > 0) {
        var avgMotion = motionValues.reduce(function (sum, value) { return sum + value; }, 0) / motionValues.length;
        var motionScore = Math.max(0, Math.min(100, (avgMotion / BODY_LANGUAGE_MAX_MOTION_DIFF) * 100));
        result.motionLevel = {
          available: true,
          score: Math.round(motionScore),
          sampleCount: motionValues.length
        };
      }

      var facePositions = samples
        .map(function (sample) { return sample.facePosition; })
        .filter(function (position) {
          return position && typeof position.x === "number" && typeof position.y === "number";
        });
      if (facePositions.length > 0) {
        var meanX = facePositions.reduce(function (sum, position) { return sum + position.x; }, 0) / facePositions.length;
        var meanY = facePositions.reduce(function (sum, position) { return sum + position.y; }, 0) / facePositions.length;
        var varianceSum = facePositions.reduce(function (sum, position) {
          var dx = position.x - meanX;
          var dy = position.y - meanY;
          return sum + (dx * dx + dy * dy);
        }, 0);
        var spread = Math.sqrt(varianceSum / facePositions.length);
        var stabilityScore = Math.max(0, Math.min(100, (1 - spread / BODY_LANGUAGE_MAX_FACE_SPREAD) * 100));
        result.faceStability = {
          available: true,
          score: Math.round(stabilityScore),
          sampleCount: facePositions.length
        };
      }

      // 「サンプルを1件でも取れたか」ではなく「実際に使えるスコアが1つでもあるか」で判定する。
      // 1件目のtickはmotionDiffの基準フレームを作るだけでスコアにならないため、これがないと
      // 短時間の回答でサンプル自体は残るのにavailable:trueだけが立つケースがあった。
      result.available = result.motionLevel.available || result.faceStability.available;
    } catch (error) {
      console.warn("Body language sampling could not be finalized:", error);
    } finally {
      cameraInputState.bodyLanguageSamples = [];
      cameraInputState.lastFrameData = null;
      cameraInputState.samplingTickCount = 0;
      cameraInputState.samplingTickInProgress = false;
    }
    return result;
  }

  function startCameraRecording() {
    if (!cameraInputState.isEnabled || !cameraInputState.isSupported || !cameraInputState.mediaStream || !window.MediaRecorder) {
      return;
    }
    try {
      var mimeType = getSupportedVideoMimeType();
      var options = mimeType ? { mimeType: mimeType } : undefined;
      // onstop/ondataavailable はこのrecorder・chunksをクロージャで直接参照する。
      // cameraInputState.mediaRecorder経由で読むと、途中でstopCameraMediaStream()が
      // 参照をnullに戻した場合にTypeErrorになるため。
      var chunks = [];
      var startedAt = Date.now();
      var recorder = new window.MediaRecorder(cameraInputState.mediaStream, options);
      cameraInputState.videoChunks = chunks;
      cameraInputState.pendingClip = null;
      cameraInputState.recordingStartedAt = startedAt;
      cameraInputState.mediaRecorder = recorder;
      recorder.ondataavailable = function (event) {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      cameraInputState.recordingStopPromise = new Promise(function (resolve) {
        recorder.onstop = function () {
          var type = recorder.mimeType || mimeType || "video/webm";
          var blob = chunks.length ? new Blob(chunks, { type: type }) : null;
          var clip = createVideoClipFromBlob(blob, startedAt);
          if (cameraInputState.mediaRecorder === recorder) {
            cameraInputState.pendingClip = clip;
            cameraInputState.isRecording = false;
          }
          resolve(clip);
        };
      });
      recorder.start();
      cameraInputState.isRecording = true;
      startBodyLanguageSampling();
    } catch (error) {
      cameraInputState.isRecording = false;
      cameraInputState.recordingStopPromise = null;
      cameraInputState.lastError = error && error.message ? error.message : "camera-recording-unavailable";
      console.warn("Camera recording could not be started:", error);
    }
  }

  function stopCameraRecording() {
    try {
      cameraInputState.lastBodyLanguageMetrics = stopBodyLanguageSampling();
    } catch (error) {
      cameraInputState.lastBodyLanguageMetrics = null;
      console.warn("Body language sampling could not be finalized on stop:", error);
    }
    if (cameraInputState.mediaRecorder && cameraInputState.mediaRecorder.state !== "inactive") {
      cameraInputState.mediaRecorder.stop();
      return cameraInputState.recordingStopPromise || Promise.resolve(null);
    }
    cameraInputState.isRecording = false;
    return Promise.resolve(cameraInputState.pendingClip);
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

  function confirmLeaveInterviewIfNeeded() {
    if (!hasUnsavedInterviewProgress()) {
      return true;
    }
    var confirmed = window.confirm("進行中の面接には保存されていない回答があります。移動すると内容は失われます。移動しますか？");
    if (confirmed) {
      appState.interviewLog = null;
    }
    return confirmed;
  }

  function guardedNavigation(handler) {
    return async function (event) {
      if (!confirmLeaveInterviewIfNeeded()) {
        if (event && typeof event.preventDefault === "function") {
          event.preventDefault();
        }
        return;
      }
      // 画面遷移のたびに、進行中のカメラ録画・音声録音を止め、
      // レビュー用クリップ（フィードバック画面限定の再生用データ）を解放する。
      // クリップが無い場合や録画中でない場合は何もしないため、面接と無関係な
      // 画面遷移（例: 設定画面→履歴画面）で呼んでも副作用はない。
      if (cameraInputState.isRecording) {
        await stopCameraRecording();
      }
      stopCameraMediaStream();
      releaseVideoClips();
      releaseAudioClips();
      handler(event);
    };
  }

  function bindEvents() {
    on("createAccountBtn", "click", createAccount);
    on("accountForm", "submit", createAccount);
    on("accountList", "click", handleAccountListClick);
    on("companyForm", "submit", saveCompanyFromForm);
    on("saveCompanyBtn", "click", saveCompanyFromForm);
    on("cancelEditCompanyBtn", "click", cancelEditCompany);
    on("companyList", "click", handleCompanyListClick);
    on("esForm", "submit", saveEsFromForm);
    on("saveEsBtn", "click", saveEsFromForm);
    on("esAnswerInput", "input", updateEsCharCount);
    on("esMaxCharsInput", "input", updateEsCharCount);
    on("esEntryList", "click", handleEsEntryListClick);
    on("setupCompanySelect", "change", handleSetupCompanySelectChange);
    on("interviewerAvatarGrid", "click", handleInterviewerAvatarClick);
    on("interviewerAvatarGrid", "keydown", handleInterviewerAvatarKeydown);
    on("saveAiSettingsBtn", "click", saveAiSettingsFromForm);
    on("testAiConnectionBtn", "click", testAiConnection);
    on("clearAiSettingsBtn", "click", clearAiSettings);
    on("googleSignInBtn", "click", signInWithGoogle);
    on("googleSignOutBtn", "click", signOutGoogle);
    on("migrateLocalDataBtn", "click", migrateLocalDataToCloud);
    on("startInterviewBtn", "click", startInterview);
    on("submitAnswerBtn", "click", submitAnswer);
    on("finishInterviewBtn", "click", finishInterview);
    on("replayQuestionSpeechBtn", "click", replayQuestionSpeech);
    on("stopQuestionSpeechBtn", "click", stopQuestionSpeechFromEvent);
    on("toggleQuestionSpeechBtn", "click", toggleQuestionSpeech);
    on("startVoiceInputBtn", "click", startVoiceInput);
    on("stopVoiceInputBtn", "click", stopVoiceInput);
    on("showWorkspaceBtn", "click", guardedNavigation(showWorkspace));
    on("showSettingsBtn", "click", guardedNavigation(showSettings));
    on("showHistoryBtn", "click", guardedNavigation(renderHistory));
    on("backToSetupBtn", "click", guardedNavigation(restart));
    on("switchAccountBtn", "click", guardedNavigation(switchAccount));
    on("restartBtn", "click", restart);
    on("clearHistoryBtn", "click", clearHistory);
    on("deleteHistoryItemBtn", "click", deleteSelectedHistory);
    on("historyDetail", "click", handleHistoryDetailClick);

    var answerInput = $("answerInput");
    if (answerInput) {
      answerInput.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          submitAnswer();
        }
      });
    }
    window.addEventListener("beforeunload", function (event) {
      stopQuestionSpeech();
      releaseAudioClips();
      stopVoiceMediaStream();
      releaseVideoClips();
      stopCameraMediaStream();
      if (hasUnsavedInterviewProgress() || hasPendingCloudInterviewLogSave()) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
  }

  function setupCameraInput() {
    var supportsCamera = Boolean(navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === "function"
      && window.MediaRecorder);
    if (!supportsCamera) {
      var checkbox = $("cameraEnabledInput");
      if (checkbox) {
        checkbox.checked = false;
        checkbox.disabled = true;
      }
      setText("cameraConsentHelp", "このブラウザはカメラ録画に対応していません。テキスト回答や音声入力は通常通りご利用いただけます。");
    }
  }

  function init() {
    captureLocalMigrationSnapshot();
    bindEvents();
    setupQuestionSpeech();
    setupVoiceInput();
    setupCameraInput();
    selectInterviewerType(getValue("interviewerTypeSelect", DEFAULT_SETTINGS.interviewerType));
    renderAccounts();
    renderAiSettings();
    initializeCloudIntegration();
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
