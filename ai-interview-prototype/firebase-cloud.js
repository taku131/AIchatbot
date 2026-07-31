const SDK_VERSION = "12.13.0";
const APP_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`;
const AUTH_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`;
const FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`;

const COLLECTIONS = {
  accounts: "accounts",
  companies: "companies",
  esEntries: "esEntries",
  interviewLogs: "interviewLogs"
};
const FIRESTORE_BATCH_LIMIT = 450;

let firebaseState = {
  configured: false,
  initialized: false,
  app: null,
  auth: null,
  db: null,
  modules: null,
  initPromise: null,
  lastError: ""
};

function getConfig() {
  const config = window.AI_INTERVIEW_FIREBASE_CONFIG;
  if (!config || typeof config !== "object") {
    return null;
  }
  if (!config.apiKey || !config.authDomain || !config.projectId) {
    return null;
  }
  return config;
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value == null ? null : value));
}

function normalizeId(value, fallback) {
  const id = String(value || "").trim();
  return id || fallback;
}

function createFallbackId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeRecord(record, fallbackId) {
  const copy = Object.assign({}, record || {});
  copy.id = normalizeId(copy.id, fallbackId);
  return copy;
}

function sanitizeOpenAiSettings(settings) {
  const copy = Object.assign({}, settings || {});
  delete copy.apiKey;
  delete copy.openAiApiKey;
  return copy;
}

function sanitizeSettings(settings) {
  const source = Object.assign({}, settings || {});
  const result = {};
  if (source.aiSettings && typeof source.aiSettings === "object") {
    result.aiSettings = sanitizeOpenAiSettings(source.aiSettings);
  }
  if (source.questionSpeechSettings && typeof source.questionSpeechSettings === "object") {
    result.questionSpeechSettings = clonePlain(source.questionSpeechSettings);
  }
  return result;
}

function userDocPath(uid, ...segments) {
  return ["users", uid].concat(segments);
}

async function loadModules() {
  if (firebaseState.modules) {
    return firebaseState.modules;
  }
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(APP_URL),
    import(AUTH_URL),
    import(FIRESTORE_URL)
  ]);
  firebaseState.modules = Object.assign({}, appModule, authModule, firestoreModule);
  return firebaseState.modules;
}

async function init() {
  if (firebaseState.initPromise) {
    return firebaseState.initPromise;
  }

  firebaseState.initPromise = (async function () {
    const config = getConfig();
    firebaseState.configured = Boolean(config);
    if (!config) {
      return {
        enabled: false,
        reason: "Firebase config is not set. Define window.AI_INTERVIEW_FIREBASE_CONFIG before firebase-cloud.js."
      };
    }

    const modules = await loadModules();
    const existingApp = modules.getApps().find(function (app) {
      return app.name === "[DEFAULT]";
    });
    firebaseState.app = existingApp || modules.initializeApp(config);
    firebaseState.auth = modules.getAuth(firebaseState.app);
    firebaseState.db = modules.getFirestore(firebaseState.app);
    firebaseState.initialized = true;
    return { enabled: true };
  })().catch(function (error) {
    firebaseState.lastError = error && error.message ? error.message : String(error);
    throw error;
  });

  return firebaseState.initPromise;
}

async function ensureReady() {
  const status = await init();
  if (!status.enabled) {
    throw new Error(status.reason || "Firebase is not configured.");
  }
  return firebaseState.modules;
}

async function signInWithGoogle() {
  const modules = await ensureReady();
  const provider = new modules.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await modules.signInWithPopup(firebaseState.auth, provider);
  return normalizeUser(result.user);
}

async function signOutGoogle() {
  await ensureReady();
  await firebaseState.modules.signOut(firebaseState.auth);
}

function onAuthStateChanged(callback) {
  init().then(function (status) {
    if (!status.enabled) {
      callback(null, status);
      return;
    }
    firebaseState.modules.onAuthStateChanged(firebaseState.auth, function (user) {
      callback(user ? normalizeUser(user) : null, status);
    });
  }).catch(function (error) {
    callback(null, { enabled: false, error: error && error.message ? error.message : String(error) });
  });
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || ""
  };
}

async function readCollection(uid, collectionName) {
  const modules = await ensureReady();
  const snapshot = await modules.getDocs(modules.collection(firebaseState.db, ...userDocPath(uid, collectionName)));
  return snapshot.docs.map(function (docSnap) {
    return Object.assign({ id: docSnap.id }, docSnap.data());
  });
}

async function readDoc(uid, ...segments) {
  const modules = await ensureReady();
  const docSnap = await modules.getDoc(modules.doc(firebaseState.db, ...userDocPath(uid, ...segments)));
  return docSnap.exists() ? docSnap.data() : null;
}

async function saveProfile(uid, profile) {
  const modules = await ensureReady();
  await modules.setDoc(
    modules.doc(firebaseState.db, ...userDocPath(uid, "profile", "main")),
    Object.assign({}, clonePlain(profile || {}), { updatedAt: new Date().toISOString() }),
    { merge: true }
  );
}

async function saveSettings(uid, settings) {
  const modules = await ensureReady();
  await modules.setDoc(
    modules.doc(firebaseState.db, ...userDocPath(uid, "settings", "main")),
    Object.assign({}, sanitizeSettings(settings), { updatedAt: new Date().toISOString() }),
    { merge: true }
  );
}

async function saveDocument(uid, collectionName, record) {
  const modules = await ensureReady();
  const item = sanitizeRecord(record, createFallbackId(collectionName));
  await modules.setDoc(
    modules.doc(firebaseState.db, ...userDocPath(uid, collectionName, item.id)),
    clonePlain(item),
    { merge: true }
  );
  return item;
}

async function deleteDocument(uid, collectionName, id) {
  const modules = await ensureReady();
  await modules.deleteDoc(modules.doc(firebaseState.db, ...userDocPath(uid, collectionName, id)));
}

async function replaceCollection(uid, collectionName, items) {
  const modules = await ensureReady();
  const safeItems = (Array.isArray(items) ? items : []).map(function (item, index) {
    return sanitizeRecord(item, `${collectionName}_${index}`);
  });
  const existing = await modules.getDocs(modules.collection(firebaseState.db, ...userDocPath(uid, collectionName)));
  const nextIds = new Set(safeItems.map(function (item) {
    return item.id;
  }));
  let batch = modules.writeBatch(firebaseState.db);
  let operationCount = 0;
  async function commitIfNeeded(force) {
    if (!force && operationCount < FIRESTORE_BATCH_LIMIT) {
      return;
    }
    if (operationCount === 0) {
      return;
    }
    await batch.commit();
    batch = modules.writeBatch(firebaseState.db);
    operationCount = 0;
  }
  for (const docSnap of existing.docs) {
    if (!nextIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
      operationCount += 1;
      await commitIfNeeded(false);
    }
  }
  for (const item of safeItems) {
    batch.set(modules.doc(firebaseState.db, ...userDocPath(uid, collectionName, item.id)), clonePlain(item), { merge: true });
    operationCount += 1;
    await commitIfNeeded(false);
  }
  await commitIfNeeded(true);
  return safeItems;
}

async function loadUserData(uid) {
  const [profile, settings, accounts, companies, esEntries, interviewLogs] = await Promise.all([
    readDoc(uid, "profile", "main"),
    readDoc(uid, "settings", "main"),
    readCollection(uid, COLLECTIONS.accounts),
    readCollection(uid, COLLECTIONS.companies),
    readCollection(uid, COLLECTIONS.esEntries),
    readCollection(uid, COLLECTIONS.interviewLogs)
  ]);
  return {
    profile: profile || {},
    settings: settings || {},
    accounts,
    companies,
    esEntries,
    interviewLogs
  };
}

async function migrateLocalDataToCloud(uid, localData) {
  const data = Object.assign({}, localData || {});
  const profile = Object.assign({}, data.profile || {}, {
    migratedAt: new Date().toISOString()
  });
  await saveProfile(uid, profile);
  await Promise.all([
    replaceCollection(uid, COLLECTIONS.accounts, data.accounts || []),
    replaceCollection(uid, COLLECTIONS.companies, data.companies || []),
    replaceCollection(uid, COLLECTIONS.esEntries, data.esEntries || []),
    replaceCollection(uid, COLLECTIONS.interviewLogs, data.interviewLogs || []),
    saveSettings(uid, sanitizeSettings(data.settings || {}))
  ]);
  return loadUserData(uid);
}

function getStatus() {
  return {
    configured: Boolean(getConfig()),
    initialized: firebaseState.initialized,
    lastError: firebaseState.lastError
  };
}

const api = {
  init,
  getStatus,
  signInWithGoogle,
  signOutGoogle,
  onAuthStateChanged,
  loadUserData,
  saveProfile,
  saveSettings,
  saveDocument,
  deleteDocument,
  replaceCollection,
  migrateLocalDataToCloud,
  sanitizeSettings,
  sanitizeOpenAiSettings,
  collections: COLLECTIONS
};

window.aiInterviewCloud = api;
window.dispatchEvent(new CustomEvent("aiInterviewCloudReady", { detail: api }));

export {
  init,
  getStatus,
  signInWithGoogle,
  signOutGoogle,
  onAuthStateChanged,
  loadUserData,
  saveProfile,
  saveSettings,
  saveDocument,
  deleteDocument,
  replaceCollection,
  migrateLocalDataToCloud,
  sanitizeSettings,
  sanitizeOpenAiSettings
};
