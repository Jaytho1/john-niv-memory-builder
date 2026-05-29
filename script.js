const datasetSources = {
  en: "./data/john-quiz-data.json",
  ko: "./data/john-quiz-data-ko.json",
};

const datasets = {
  en: window.JOHN_QUIZ_DATA || null,
  ko: window.JOHN_QUIZ_DATA_KO || null,
};

const datasetLoadPromises = {};
const hiddenTokenIndexCache = new WeakMap();
const chapterVisibleBlankCountCache = new Map();
const overallVisibleBlankCountCache = new Map();

const progressStorageKey = "john-quiz-progress-v2";
const draftStorageKey = "john-quiz-drafts-v1";
const difficultyStorageKey = "john-quiz-difficulty-v1";
const sessionStorageKey = "john-quiz-session-v1";
const leaderboardRankStorageKey = "john-quiz-ranks-v1";
const languageStorageKey = "john-quiz-language-v1";
const autosaveIntervalMs = 2 * 60 * 1000;
const storageSaveDelayMs = 250;

const elements = {
  authOverlay: document.querySelector("#auth-overlay"),
  authForm: document.querySelector("#auth-form"),
  authSectionLabel: document.querySelector("#auth-section-label"),
  authTitle: document.querySelector("#auth-title"),
  authCopy: document.querySelector("#auth-copy"),
  authNameLabel: document.querySelector("#auth-name-label"),
  authName: document.querySelector("#auth-name"),
  authLanguageLabel: document.querySelector("#auth-language-label"),
  authLanguage: document.querySelector("#auth-language"),
  authEmailLabel: document.querySelector("#auth-email-label"),
  authEmail: document.querySelector("#auth-email"),
  authSubmit: document.querySelector("#auth-submit"),
  authError: document.querySelector("#auth-error"),
  headerEyebrow: document.querySelector("#header-eyebrow"),
  siteTitle: document.querySelector("#site-title"),
  headerCopy: document.querySelector("#header-copy"),
  languageToggle: document.querySelector("#language-toggle"),
  languageToggleButtons: [...document.querySelectorAll("[data-language-toggle]")],
  userName: document.querySelector("#user-name"),
  signOut: document.querySelector("#sign-out"),
  chaptersHeading: document.querySelector("#chapters-heading"),
  dbStatus: document.querySelector("#db-status"),
  overviewLabel: document.querySelector("#overview-label"),
  chapterList: document.querySelector("#chapter-list"),
  scopeTitle: document.querySelector("#scope-title"),
  overallProgressLabel: document.querySelector("#overall-progress-label"),
  overallProgressValue: document.querySelector("#overall-progress-value"),
  overallProgressFill: document.querySelector("#overall-progress-fill"),
  stats: document.querySelector("#stats"),
  leaderboardLabel: document.querySelector("#leaderboard-label"),
  leaderboardTitle: document.querySelector("#leaderboard-title"),
  leaderboard: document.querySelector("#leaderboard"),
  levelsSection: document.querySelector("#levels-section"),
  recommendationsLabel: document.querySelector("#recommendations-label"),
  recommendationsTitle: document.querySelector("#recommendations-title"),
  recommendations: document.querySelector("#recommendations"),
  quizLabel: document.querySelector("#quiz-label"),
  difficultyLabel: document.querySelector("#difficulty-label"),
  difficultySelect: document.querySelector("#difficulty-select"),
  chapterResetLabel: document.querySelector("#chapter-reset-label"),
  resetChapter: document.querySelector("#reset-chapter"),
  nextChapter: document.querySelector("#next-chapter"),
  chapterTitle: document.querySelector("#chapter-title"),
  chapterSummary: document.querySelector("#chapter-summary"),
  chapterQuiz: document.querySelector("#chapter-quiz"),
};

const uiCopy = {
  en: {
    htmlLang: "en",
    documentTitle: "John NIV Memory Builder",
    headerEyebrow: "Memorize John",
    siteTitle: "John NIV Fill-In Quiz",
    headerCopy: "",
    authSectionLabel: "Sign In",
    authTitle: "Start Memorizing John",
    authCopy: "Enter your name and email once. Your name will be used on the leaderboard.",
    authNameLabel: "Name",
    authLanguageLabel: "Language",
    authEmailLabel: "Email",
    authSubmit: "Enter",
    signOut: "Sign out",
    notSignedIn: "Not signed in",
    chaptersHeading: "Chapters",
    overviewLabel: "Overview",
    leaderboardLabel: "Leaderboard",
    recommendationsLabel: "Recommendations",
    recommendationsTitle: "Where To Focus",
    quizLabel: "Quiz",
    difficultyLabel: "Difficulty",
    chapterResetLabel: "Chapter reset",
    resetChapter: "Reset this chapter",
    nextChapter: "Next chapter",
    languageToggleLabel: "Language toggle",
    dbChecking: "Checking database status...",
    dbConnected: "Postgres connected",
    dbDisconnected: "Database not connected yet",
    dbAnalyticsError: "Could not load analytics yet.",
    difficultyLabels: {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
      difficult: "Difficult",
      extreme: "Extreme",
    },
    difficultyDescriptions: {
      easy: "Easy keeps one keyword blank per sentence.",
      medium: "Medium hides one to two keywords per sentence.",
      hard: "Hard hides up to three keywords per sentence.",
      difficult: "Difficult hides up to six testable words per sentence.",
      extreme: "Extreme hides every testable word.",
    },
    overallProgressLabel: (difficultyLabel) => `${difficultyLabel} overall progress`,
    formatChapterLabel: (chapterId) => `John ${chapterId}`,
    formatScopeTitle: (chapterId) => `John ${chapterId}`,
    formatChapterTitle: (chapterId) => `John ${chapterId}`,
    chapterSummary: (description, verseCount) => `${description} ${verseCount} verses in this chapter.`,
    leaderboardTitle: (difficultyLabel) => `${difficultyLabel} Leaderboard`,
    noScores: () => "No scores yet for this difficulty.",
    levelsLabel: "Levels",
    levelsTitle: "Collection Level",
    currentLevel: (level) => `Level ${level}`,
    maxLevel: "Max level",
    levelProgress: (current, required) => `${current} / ${required}`,
    rewardFound: (label) => `Collect ${label}`,
    demoLabel: "Reward demo",
    collectiblesLabel: "Collectibles",
    solvedRewardLabel: "Solved",
    tapToClaim: "Tap to claim",
    tapToOpen: "Tap to open",
    tapToOpenTreasureChest: "Tap to open treasure chest",
    collectibleLabels: {
      fire: "Fire",
      target: "Heart",
      scythe: "Dove",
      heart: "Crown",
      golden_apple: "Golden Apple",
      wooden_cross: "Cross",
    },
    rarityLabels: {
      common: "Common",
      uncommon: "Uncommon",
      rare: "Rare",
      epic: "Epic",
      legendary: "Legendary",
      mythical: "Mythical",
    },
    achievementLabels: {
      golden_apple: "Golden Apple",
      wooden_cross: "Cross",
    },
    statLabels: {
      difficulty: "Difficulty",
      visibleBlanks: "Visible blanks",
      solvedBlanks: "Solved blanks",
      attempts: "Attempts",
      correctIncorrect: "Correct / Incorrect",
    },
    statsValueDifficulty: (difficultyLabel) => difficultyLabel,
    rankLabel: (rank) => `Rank #${rank}`,
    recommendationsEmpty: (description) => `${description} Answer a few words and this panel will start recommending chapters and verses to review.`,
    recommendationCompletion: (difficultyLabel, completion) => `${difficultyLabel} completion: ${completion}%`,
    recommendationSolved: (solved, visible) => `Solved blanks: ${solved} / ${visible}`,
    recommendationVerse: (verseId) => `Start again at verse: ${verseId ?? "Completed"}`,
    solvedPreviously: "Solved previously",
    correct: "Correct",
    hintStartsWith: (value) => `Hint: ${value}`,
    correctWord: (value) => `Answer: ${value}`,
    answerSaveError: "Could not save that answer yet.",
    wordAriaLabel: (chapterId, verseId) => `John ${chapterId}:${verseId} word`,
    metaPerformance: (correctCount, accuracyPercentage) => `Right ${correctCount} ${correctCount === 1 ? "time" : "times"} (${accuracyPercentage}% accuracy)`,
  },
  ko: {
    htmlLang: "ko",
    documentTitle: "요한복음 개역개정 암송 퀴즈",
    headerEyebrow: "요한복음 암송",
    siteTitle: "요한복음 개역개정 빈칸 퀴즈",
    headerCopy: "",
    authSectionLabel: "시작하기",
    authTitle: "요한복음 암송 시작",
    authCopy: "이름과 이메일을 한 번만 입력하세요. 이름은 리더보드에 표시됩니다.",
    authNameLabel: "이름",
    authLanguageLabel: "언어",
    authEmailLabel: "이메일",
    authSubmit: "입장하기",
    signOut: "로그아웃",
    notSignedIn: "로그인되지 않음",
    chaptersHeading: "장 목록",
    overviewLabel: "개요",
    leaderboardLabel: "리더보드",
    recommendationsLabel: "추천",
    recommendationsTitle: "집중할 곳",
    quizLabel: "퀴즈",
    difficultyLabel: "난이도",
    chapterResetLabel: "장 초기화",
    resetChapter: "이 장 다시 시작",
    nextChapter: "다음 장",
    languageToggleLabel: "언어 전환",
    dbChecking: "데이터베이스 상태 확인 중...",
    dbConnected: "Postgres 연결됨",
    dbDisconnected: "데이터베이스가 아직 연결되지 않았습니다",
    dbAnalyticsError: "분석 정보를 아직 불러오지 못했습니다.",
    difficultyLabels: {
      easy: "쉬움",
      medium: "보통",
      hard: "어려움",
      difficult: "매우 어려움",
      extreme: "극한",
    },
    difficultyDescriptions: {
      easy: "쉬움은 문장마다 핵심 단어 하나만 빈칸으로 남깁니다.",
      medium: "보통은 문장마다 핵심 단어 하나에서 두 개를 가립니다.",
      hard: "어려움은 문장마다 최대 세 단어를 가립니다.",
      difficult: "매우 어려움은 문장마다 최대 여섯 개의 학습 단어를 가립니다.",
      extreme: "극한은 학습 가능한 모든 단어를 가립니다.",
    },
    overallProgressLabel: (difficultyLabel) => `${difficultyLabel} 전체 진행률`,
    formatChapterLabel: (chapterId) => `요한복음 ${chapterId}장`,
    formatScopeTitle: (chapterId) => `요한복음 ${chapterId}장`,
    formatChapterTitle: (chapterId) => `요한복음 ${chapterId}장`,
    chapterSummary: (description, verseCount) => `${description} 이 장에는 ${verseCount}개의 절이 있습니다.`,
    leaderboardTitle: (difficultyLabel) => `${difficultyLabel} 리더보드`,
    noScores: () => "이 난이도에는 아직 기록이 없습니다.",
    levelsLabel: "레벨",
    levelsTitle: "수집 레벨",
    currentLevel: (level) => `${level}레벨`,
    maxLevel: "최대 레벨",
    levelProgress: (current, required) => `${current} / ${required}`,
    rewardFound: (label) => `${label} 수집`,
    demoLabel: "보상 데모",
    collectiblesLabel: "수집품",
    solvedRewardLabel: "완료",
    tapToClaim: "탭하여 받기",
    tapToOpen: "탭하여 열기",
    tapToOpenTreasureChest: "탭하여 보물 상자 열기",
    collectibleLabels: {
      fire: "불꽃",
      target: "하트",
      scythe: "비둘기",
      heart: "왕관",
      golden_apple: "황금 사과",
      wooden_cross: "십자가",
    },
    rarityLabels: {
      common: "일반",
      uncommon: "고급",
      rare: "희귀",
      epic: "영웅",
      legendary: "전설",
      mythical: "신화",
    },
    achievementLabels: {
      golden_apple: "황금 사과",
      wooden_cross: "십자가",
    },
    statLabels: {
      difficulty: "난이도",
      visibleBlanks: "보이는 빈칸",
      solvedBlanks: "맞춘 빈칸",
      attempts: "시도 횟수",
      correctIncorrect: "정답 / 오답",
    },
    statsValueDifficulty: (difficultyLabel) => difficultyLabel,
    rankLabel: (rank) => `순위 #${rank}`,
    recommendationsEmpty: (description) => `${description} 몇 단어만 풀어도 이 패널이 다시 볼 장과 절을 추천해 드립니다.`,
    recommendationCompletion: (difficultyLabel, completion) => `${difficultyLabel} 진행률: ${completion}%`,
    recommendationSolved: (solved, visible) => `맞춘 빈칸: ${solved} / ${visible}`,
    recommendationVerse: (verseId) => `다시 시작할 절: ${verseId ?? "완료"}`,
    solvedPreviously: "이전에 맞춤",
    correct: "정답",
    hintStartsWith: (value) => `힌트: ${value}`,
    correctWord: (value) => `정답: ${value}`,
    answerSaveError: "아직 이 답을 저장하지 못했습니다.",
    wordAriaLabel: (chapterId, verseId) => `요한복음 ${chapterId}:${verseId} 단어`,
    metaPerformance: (correctCount, accuracyPercentage) => `정답 ${correctCount}회 (정확도 ${accuracyPercentage}%)`,
  },
};

const keywordStopwordsByLanguage = {
  en: new Set([
    "about", "after", "again", "among", "around", "because", "before", "being",
    "came", "come", "does", "down", "each", "even", "every", "gave", "give",
    "going", "into", "just", "made", "many", "more", "most", "much", "only",
    "other", "over", "said", "same", "sent", "some", "such", "than", "that",
    "them", "then", "there", "these", "they", "this", "those", "through", "very",
    "were", "what", "when", "where", "which", "while", "with", "would",
  ]),
  ko: new Set(),
};

const priorityKeywordsByLanguage = {
  en: new Set([
    "abraham", "advocate", "alive", "amen", "angel", "anointed", "authority",
    "believe", "bread", "christ", "cross", "darkness", "david", "disciple",
    "disciples", "eternal", "faith", "father", "glory", "god", "grace",
    "heaven", "holy", "hour", "israel", "jews", "jesus", "jerusalem", "john",
    "judgment", "king", "kingdom", "lamb", "law", "life", "light",
    "lord", "love", "messiah", "miracle", "miracles", "moses", "nazareth",
    "passover", "peace", "peter", "pharisees", "pilate", "pray", "prophet",
    "rabbi", "resurrection", "sabbath", "salvation", "scripture", "shepherd",
    "sign", "signs", "sin", "sins", "son", "spirit", "teacher", "temple",
    "testify", "testimony", "truth", "vine", "water", "witness", "word", "world",
  ]),
  ko: new Set([
    "하나님", "예수", "예수께서", "그리스도", "말씀", "빛", "생명", "세상",
    "아버지", "아들", "영생", "성령", "진리", "사랑", "유대인", "모세",
    "제자", "베드로", "왕", "선지자", "부활", "양", "포도나무", "물", "떡",
    "길", "은혜", "영광", "어린", "양이로다",
  ]),
};

const deprioritizedWordsByLanguage = {
  en: new Set([
    "answered", "asking", "asked", "asks", "brought", "called", "calling",
    "cried", "declared", "found", "gave", "heard", "knew", "know", "knowing",
    "looked", "looking", "passed", "passing", "replied", "replies", "saying",
    "says", "showed", "speaking", "spoke", "standing", "stood", "taken", "tell",
    "telling", "tells", "told", "went",
  ]),
  ko: new Set(),
};

const koreanParticleSuffixes = [
  "에게로부터",
  "께로부터",
  "으로부터",
  "에서부터",
  "께서는",
  "에게서는",
  "에게서",
  "에게는",
  "으로서는",
  "로서는",
  "에서는",
  "으로서",
  "로부터",
  "에서의",
  "에게도",
  "께서도",
  "으로의",
  "까지는",
  "부터는",
  "으로는",
  "와는",
  "과는",
  "으로",
  "로서",
  "보다",
  "처럼",
  "까지",
  "부터",
  "마다",
  "조차",
  "마저",
  "께는",
  "와도",
  "과도",
  "에게",
  "께서",
  "에서",
  "에는",
  "께",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "와",
  "과",
  "의",
  "도",
  "로",
];

const collectibleTypes = [
  {
    id: "fire",
    label: "Fire",
    rarity: "Common",
    chance: 40,
    icon: "🔥",
    levelUnits: 1,
    levelColor: "#f97316",
  },
  {
    id: "target",
    label: "Heart",
    rarity: "Uncommon",
    chance: 30,
    icon: "💜",
    levelUnits: 1.1,
    levelColor: "#a855f7",
  },
  {
    id: "scythe",
    label: "Dove",
    rarity: "Rare",
    chance: 15,
    icon: "🕊",
    levelUnits: 2,
    levelColor: "#cbd5e1",
  },
  {
    id: "heart",
    label: "Crown",
    rarity: "Epic",
    chance: 10,
    icon: "👑",
    levelUnits: 3,
    levelColor: "#8b5cf6",
  },
  {
    id: "golden_apple",
    label: "Apple",
    rarity: "Legendary",
    chance: 4,
    icon: "🍏",
    levelUnits: 8,
    levelColor: "#f5b82e",
    shiny: true,
    achievement: true,
  },
  {
    id: "wooden_cross",
    label: "Cross",
    rarity: "Mythical",
    chance: 1,
    icon: "✝",
    levelUnits: 20,
    levelColor: "#a16207",
    shiny: true,
    achievement: true,
  },
];

const collectibleTypeById = Object.fromEntries(collectibleTypes.map((type) => [type.id, type]));
const maxCollectionLevel = 100;
const rewardDemoEnabled = new URLSearchParams(window.location.search).has("reward-demo");
const rewardTestShortcutTimeoutMs = 900;
let rewardTestShortcutSequence = "";
let rewardTestShortcutTimer = 0;
let pendingStorageSaveTimer = 0;
const pendingStorageSaves = new Map();

const state = {
  selectedChapterId: 1,
  summary: null,
  leaderboard: [],
  dbConnected: false,
  progress: loadJson(progressStorageKey),
  drafts: loadJson(draftStorageKey),
  previousRanks: loadJson(leaderboardRankStorageKey),
  currentUser: loadJson(sessionStorageKey),
  currentLanguage: loadLanguage(),
  pendingFocusKey: null,
  pendingAchievementType: null,
};

if (state.currentUser?.preferredLanguage && datasetSources[state.currentUser.preferredLanguage]) {
  state.currentLanguage = state.currentUser.preferredLanguage;
}

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function flushPendingStorageSaves() {
  if (pendingStorageSaveTimer) {
    window.clearTimeout(pendingStorageSaveTimer);
    pendingStorageSaveTimer = 0;
  }

  pendingStorageSaves.forEach((getValue, key) => {
    saveJson(key, getValue());
  });
  pendingStorageSaves.clear();
}

function saveJsonBatched(key, getValue, options = {}) {
  if (options.immediate) {
    pendingStorageSaves.delete(key);
    saveJson(key, getValue());
    return;
  }

  pendingStorageSaves.set(key, getValue);
  if (pendingStorageSaveTimer) {
    return;
  }

  pendingStorageSaveTimer = window.setTimeout(flushPendingStorageSaves, storageSaveDelayMs);
}

function loadLanguage() {
  const stored = localStorage.getItem(languageStorageKey);
  return stored === "ko" ? "ko" : "en";
}

function normalizeLanguage(value) {
  return value === "ko" ? "ko" : "en";
}

async function ensureDataset(language = state.currentLanguage) {
  const normalizedLanguage = normalizeLanguage(language);
  if (datasets[normalizedLanguage]) {
    return datasets[normalizedLanguage];
  }

  if (!datasetLoadPromises[normalizedLanguage]) {
    datasetLoadPromises[normalizedLanguage] = fetch(datasetSources[normalizedLanguage])
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load ${normalizedLanguage} quiz data.`);
        }
        return response.json();
      })
      .then((dataset) => {
        datasets[normalizedLanguage] = dataset;
        return dataset;
      });
  }

  return datasetLoadPromises[normalizedLanguage];
}

async function ensureDatasets(languages) {
  await Promise.all([...new Set([...languages].map(normalizeLanguage))].map(ensureDataset));
}

function saveLanguage() {
  localStorage.setItem(languageStorageKey, state.currentLanguage);
}

function saveProgress(options = {}) {
  saveJsonBatched(progressStorageKey, () => state.progress, options);
}

function saveDrafts(options = {}) {
  saveJsonBatched(draftStorageKey, () => state.drafts, options);
}

function saveRanks() {
  saveJson(leaderboardRankStorageKey, state.previousRanks);
}

function saveSession() {
  localStorage.setItem(sessionStorageKey, JSON.stringify(state.currentUser || null));
}

function clearLocalWork() {
  state.progress = {};
  state.drafts = {};
  saveProgress({ immediate: true });
  saveDrafts({ immediate: true });
}

function getCopy() {
  return uiCopy[state.currentLanguage] || uiCopy.en;
}

function getData(language = state.currentLanguage) {
  return datasets[normalizeLanguage(language)] || datasets.en || datasets.ko || null;
}

function getChapter() {
  return getData()?.chapters.find((chapter) => chapter.id === state.selectedChapterId) || null;
}

function getNextChapter() {
  const chapters = getData()?.chapters || [];
  const currentIndex = chapters.findIndex((chapter) => chapter.id === state.selectedChapterId);
  if (currentIndex === -1) return null;
  return chapters[currentIndex + 1] ?? null;
}

function getDifficulty() {
  return elements.difficultySelect.value;
}

function getDifficultyStorageKey() {
  return `${state.currentLanguage}:${getDifficulty()}`;
}

function getDifficultyLabel(difficulty) {
  return getCopy().difficultyLabels[difficulty] || difficulty;
}

function getDifficultyDescription(difficulty) {
  return getCopy().difficultyDescriptions[difficulty] || difficulty;
}

function setDifficulty(value) {
  elements.difficultySelect.value = value;
  localStorage.setItem(difficultyStorageKey, value);
}

function normalizeAnswer(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isHangulWord(value) {
  return /^[가-힣]+$/u.test(value);
}

function getKoreanParticleCandidate(tokenValue) {
  if (!isHangulWord(tokenValue)) {
    return null;
  }

  const normalizedValue = tokenValue.toLowerCase();

  for (const suffix of koreanParticleSuffixes) {
    if (!normalizedValue.endsWith(suffix)) {
      continue;
    }

    const stemLength = normalizedValue.length - suffix.length;
    if (stemLength <= 0) {
      continue;
    }

    const minStemLength = suffix.length === 1 && suffix !== "께" ? 2 : 1;
    if (stemLength < minStemLength) {
      continue;
    }

    const normalizedStem = normalizedValue.slice(0, stemLength);
    if (isKoreanParticleSplitBlocked(normalizedValue, normalizedStem, suffix)) {
      continue;
    }

    return {
      answer: tokenValue.slice(0, stemLength),
      normalizedAnswer: normalizedStem,
      particle: tokenValue.slice(stemLength),
    };
  }

  return null;
}

function isKoreanParticleSplitBlocked(normalizedValue, normalizedStem, suffix) {
  if (
    normalizedValue === "함께"
    || normalizedValue === "그대로"
    || normalizedValue === "그러므로"
    || normalizedValue === "참으로"
    || normalizedValue === "진실로"
    || normalizedValue === "실로"
  ) {
    return true;
  }

  if ((suffix === "로" || suffix === "으로") && normalizedValue.endsWith("므로")) {
    return true;
  }

  if (suffix === "와" && (normalizedValue.endsWith("거니와") || normalizedValue.endsWith("려니와"))) {
    return true;
  }

  return false;
}

function getKoreanParticleSplit(tokenValue) {
  return getKoreanParticleCandidate(tokenValue);
}

function getBlankPromptForToken(token, language = state.currentLanguage) {
  if (language === "ko" && token.type === "word") {
    const split = getKoreanParticleSplit(token.value);
    if (split) {
      return split;
    }
  }

  return {
    answer: token.value,
    normalizedAnswer: token.normalized,
    particle: "",
  };
}

function getSubmittedAnswerForInput(input) {
  const answer = normalizeAnswer(input.value);
  if (!answer) {
    return "";
  }

  const expected = input.dataset.answer || "";
  const particle = normalizeAnswer(input.dataset.particle || "");
  if (particle && answer === `${expected}${particle}`) {
    return expected;
  }

  return answer;
}

function formatChapterLabel(chapterId) {
  return getCopy().formatChapterLabel(chapterId);
}

function getTokenKey(chapterId, verseId, tokenIndex) {
  return `${state.currentUser?.id || "guest"}:${state.currentLanguage}:${getDifficulty()}:${chapterId}:${verseId}:${tokenIndex}`;
}

function getProgressPrefix(language = state.currentLanguage, difficulty = getDifficulty()) {
  return `${state.currentUser?.id || "guest"}:${language}:${difficulty}:`;
}

function getCollectionProgressPrefix(language = state.currentLanguage) {
  return `${state.currentUser?.id || "guest"}:${language}:`;
}

function getTokenProgress(chapterId, verseId, tokenIndex) {
  return state.progress[getTokenKey(chapterId, verseId, tokenIndex)] || null;
}

function getTokenDraft(chapterId, verseId, tokenIndex) {
  return state.drafts[getTokenKey(chapterId, verseId, tokenIndex)] || "";
}

function setTokenProgress(chapterId, verseId, tokenIndex, value) {
  state.progress[getTokenKey(chapterId, verseId, tokenIndex)] = value;
  saveProgress();
}

function setTokenDraft(chapterId, verseId, tokenIndex, value, options = {}) {
  const key = getTokenKey(chapterId, verseId, tokenIndex);
  if (value) {
    state.drafts[key] = value;
  } else {
    delete state.drafts[key];
  }
  if (!options.deferSave) {
    saveDrafts(options);
  }
}

function clearChapterProgress(chapterId) {
  const prefix = `${getProgressPrefix()}${chapterId}:`;
  Object.keys(state.progress).forEach((key) => {
    if (key.startsWith(prefix)) {
      delete state.progress[key];
    }
  });
  Object.keys(state.drafts).forEach((key) => {
    if (key.startsWith(prefix)) {
      delete state.drafts[key];
    }
  });
  saveProgress({ immediate: true });
  saveDrafts({ immediate: true });
}

function isKeywordToken(token, language = state.currentLanguage) {
  if (token.type !== "word" || !token.testable) {
    return false;
  }

  if (language === "ko") {
    return token.normalized.length > 1;
  }

  return token.normalized.length > 2
    && !keywordStopwordsByLanguage.en.has(token.normalized);
}

function scoreTokenForDifficulty(token, language = state.currentLanguage) {
  const priorityKeywords = priorityKeywordsByLanguage[language] || new Set();
  const deprioritizedWords = deprioritizedWordsByLanguage[language] || new Set();
  let score = token.value.length;
  if (priorityKeywords.has(token.normalized)) {
    score += 100;
  }
  if (language === "en" && /^[A-Z]/.test(token.value)) {
    score += 8;
  }
  if (deprioritizedWords.has(token.normalized)) {
    score -= 40;
  }
  return score;
}

function getSentenceSegments(tokens) {
  const segments = [];
  let current = [];
  tokens.forEach((token, index) => {
    current.push(index);
    if (token.type === "punct" && /[.!?]/.test(token.value)) {
      segments.push(current);
      current = [];
    }
  });
  if (current.length) {
    segments.push(current);
  }
  return segments;
}

function getPerSentenceLimit(difficulty, candidateCount) {
  if (!candidateCount) return 0;
  if (difficulty === "easy") return 1;
  if (difficulty === "medium") return Math.min(2, Math.max(1, candidateCount));
  if (difficulty === "hard") return Math.min(3, candidateCount);
  if (difficulty === "difficult") return Math.min(6, candidateCount);
  return candidateCount;
}

function pickIndicesFromCandidates(candidateIndices, tokens, limit, language = state.currentLanguage) {
  if (candidateIndices.length <= limit) {
    return candidateIndices;
  }
  return [...candidateIndices]
    .sort((left, right) => (
      scoreTokenForDifficulty(tokens[right], language) - scoreTokenForDifficulty(tokens[left], language)
      || tokens[right].value.length - tokens[left].value.length
      || left - right
    ))
    .slice(0, limit)
    .sort((left, right) => left - right);
}

function getHiddenTokenIndexSet(tokens, difficulty, language = state.currentLanguage) {
  const cacheKey = `${normalizeLanguage(language)}:${difficulty}`;
  let tokenCache = hiddenTokenIndexCache.get(tokens);
  if (!tokenCache) {
    tokenCache = new Map();
    hiddenTokenIndexCache.set(tokens, tokenCache);
  }

  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey);
  }

  const hiddenIndices = new Set();
  if (difficulty === "extreme") {
    tokens.forEach((token, index) => {
      if (token.type === "word" && token.testable) {
        hiddenIndices.add(index);
      }
    });
    tokenCache.set(cacheKey, hiddenIndices);
    return hiddenIndices;
  }

  getSentenceSegments(tokens).forEach((segment) => {
    const candidateIndices = segment.filter((index) => {
      const currentToken = tokens[index];
      if (difficulty === "difficult") {
        return currentToken.type === "word" && currentToken.testable;
      }
      return isKeywordToken(currentToken, language);
    });

    pickIndicesFromCandidates(
      candidateIndices,
      tokens,
      getPerSentenceLimit(difficulty, candidateIndices.length),
      language
    ).forEach((index) => hiddenIndices.add(index));
  });

  tokenCache.set(cacheKey, hiddenIndices);
  return hiddenIndices;
}

function shouldHideToken(tokens, tokenIndex, difficulty, language = state.currentLanguage) {
  return getHiddenTokenIndexSet(tokens, difficulty, language).has(tokenIndex);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

async function login(name, email) {
  const payload = await api("/api/login", {
    method: "POST",
    body: JSON.stringify({ name, email, preferredLanguage: state.currentLanguage }),
  });
  state.currentUser = {
    ...payload.user,
    language: payload.user.preferredLanguage || state.currentLanguage,
    preferredLanguage: payload.user.preferredLanguage || state.currentLanguage,
  };
  state.currentLanguage = state.currentUser.preferredLanguage;
  saveLanguage();
  saveSession();
  await ensureDataset(state.currentLanguage);
  elements.userName.textContent = payload.user.name;
  elements.authOverlay.classList.remove("visible");
  elements.authError.textContent = "";
  clearLocalWork();
  await hydrateSolvedProgress();
  await Promise.all([loadSummary(), loadLeaderboard()]);
  render();
}

function signOut() {
  state.currentUser = null;
  saveSession();
  clearLocalWork();
  elements.userName.textContent = getCopy().notSignedIn;
  elements.authOverlay.classList.add("visible");
  render();
}

async function loadSummary() {
  if (!state.currentUser?.id) return;
  try {
    const difficulty = encodeURIComponent(getDifficulty());
    const language = encodeURIComponent(state.currentLanguage);
    const payload = await api(`/api/progress/summary?userId=${state.currentUser.id}&language=${language}&difficulty=${difficulty}`);
    state.summary = payload;
    state.dbConnected = payload.db.connected;
  } catch {
    state.summary = null;
    state.dbConnected = false;
    elements.dbStatus.textContent = getCopy().dbAnalyticsError;
  }
}

async function persistUserPreferences() {
  if (!state.currentUser?.id) return;
  try {
    const payload = await api("/api/user-preferences", {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUser.id,
        preferredLanguage: state.currentLanguage,
      }),
    });
    state.currentUser = {
      ...state.currentUser,
      ...payload.user,
      language: payload.user.preferredLanguage || state.currentLanguage,
      preferredLanguage: payload.user.preferredLanguage || state.currentLanguage,
    };
    saveSession();
  } catch {
    // Keep the UI responsive even if preference sync fails.
  }
}

async function loadLeaderboard() {
  if (!state.currentUser?.id) return;
  const difficulty = encodeURIComponent(getDifficulty());
  try {
    const payload = await api(`/api/leaderboard?difficulty=${difficulty}&userId=${state.currentUser.id}`);
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const scoreLanguages = rows.flatMap((row) => (
      Array.isArray(row.scores) ? row.scores.map((score) => score.language) : [row.language]
    ));
    await ensureDatasets([state.currentLanguage, ...scoreLanguages]);
    state.leaderboard = buildSharedLeaderboardRows(rows);
    state.dbConnected = payload.db.connected;
  } catch {
    state.leaderboard = [];
  }
}

async function hydrateSolvedProgress() {
  if (!state.currentUser?.id) return;
  try {
    const difficulty = encodeURIComponent(getDifficulty());
    const language = encodeURIComponent(state.currentLanguage);
    const payload = await api(`/api/user-progress?userId=${state.currentUser.id}&language=${language}&difficulty=${difficulty}`);
    const data = getData();
    if (!data) return;
    payload.rows.forEach((row) => {
      const token = data.chapters
        .find((chapter) => chapter.id === row.chapterId)
        ?.verses.find((verse) => verse.id === row.verseId)
        ?.tokens[row.tokenIndex];
      if (!token) return;
      const blankPrompt = getBlankPromptForToken(token, language);
      const key = getTokenKey(row.chapterId, row.verseId, row.tokenIndex);
      state.progress[key] = {
        solved: true,
        value: blankPrompt.answer,
        hintLevel: 0,
        rewardType: getCollectibleType(row.rewardType)?.id || "",
        collectedAt: row.collectedAt || "",
      };
    });
    saveProgress();
  } catch {
    // Keep local-only state if hydration fails.
  }
}

function syncLanguageControls() {
  elements.authLanguage.value = state.currentLanguage;
  elements.languageToggle.setAttribute("aria-label", getCopy().languageToggleLabel);
  elements.languageToggleButtons.forEach((button) => {
    const isActive = button.dataset.languageToggle === state.currentLanguage;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderDifficultyOptions() {
  [...elements.difficultySelect.options].forEach((option) => {
    option.textContent = getDifficultyLabel(option.value);
  });
}

function renderStaticCopy() {
  const copy = getCopy();
  document.documentElement.lang = copy.htmlLang;
  document.title = copy.documentTitle;
  elements.headerEyebrow.textContent = copy.headerEyebrow;
  elements.siteTitle.textContent = copy.siteTitle;
  elements.headerCopy.textContent = copy.headerCopy;
  elements.headerCopy.hidden = !copy.headerCopy;
  elements.authSectionLabel.textContent = copy.authSectionLabel;
  elements.authTitle.textContent = copy.authTitle;
  elements.authCopy.textContent = copy.authCopy;
  elements.authNameLabel.textContent = copy.authNameLabel;
  elements.authLanguageLabel.textContent = copy.authLanguageLabel;
  elements.authEmailLabel.textContent = copy.authEmailLabel;
  elements.authSubmit.textContent = copy.authSubmit;
  elements.signOut.textContent = copy.signOut;
  elements.chaptersHeading.textContent = copy.chaptersHeading;
  elements.overviewLabel.textContent = copy.overviewLabel;
  elements.leaderboardLabel.textContent = copy.leaderboardLabel;
  elements.leaderboardTitle.textContent = copy.leaderboardTitle(getDifficultyLabel(getDifficulty()));
  elements.recommendationsLabel.textContent = copy.recommendationsLabel;
  elements.recommendationsTitle.textContent = copy.recommendationsTitle;
  elements.quizLabel.textContent = copy.quizLabel;
  elements.difficultyLabel.textContent = copy.difficultyLabel;
  elements.chapterResetLabel.textContent = copy.chapterResetLabel;
  elements.resetChapter.textContent = copy.resetChapter;
  elements.scopeTitle.textContent = copy.formatScopeTitle(state.selectedChapterId);
  elements.overallProgressLabel.textContent = copy.overallProgressLabel(getDifficultyLabel(getDifficulty()));
  elements.chapterTitle.textContent = copy.formatChapterTitle(state.selectedChapterId);
  if (!state.currentUser?.id) {
    elements.userName.textContent = copy.notSignedIn;
  }
  if (!elements.dbStatus.textContent || elements.dbStatus.textContent === uiCopy.en.dbChecking || elements.dbStatus.textContent === uiCopy.ko.dbChecking) {
    elements.dbStatus.textContent = copy.dbChecking;
  }
  renderDifficultyOptions();
  syncLanguageControls();
  renderRewardDemoPanel();
}

function renderAuth() {
  if (state.currentUser?.id) {
    elements.authOverlay.classList.remove("visible");
    elements.userName.textContent = state.currentUser.name;
    return;
  }
  elements.authOverlay.classList.add("visible");
  elements.userName.textContent = getCopy().notSignedIn;
}

function scrollToChapterStart() {
  window.requestAnimationFrame(() => {
    elements.chapterTitle.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function renderChapterList() {
  const data = getData();
  if (!data) return;
  elements.chapterList.innerHTML = "";
  data.chapters.forEach((chapter) => {
    const visibleBlanks = getChapterVisibleBlankCount(chapter);
    const solvedBlanks = getChapterSolvedCount(chapter);
    const percent = visibleBlanks ? Math.round((solvedBlanks / visibleBlanks) * 100) : 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chapter-button${chapter.id === state.selectedChapterId ? " active" : ""}`;
    button.style.setProperty("--fill-width", `${percent}%`);
    button.innerHTML = `
      <span class="chapter-button-fill"></span>
      <span class="chapter-button-content">
        <span>${formatChapterLabel(chapter.id)}</span>
        <span class="chapter-button-meta">${percent}%</span>
      </span>
    `;
    button.addEventListener("click", () => {
      state.selectedChapterId = chapter.id;
      render();
      scrollToChapterStart();
    });
    elements.chapterList.append(button);
  });
}

function getChapterSolvedCount(chapter) {
  return chapter.verses.reduce((count, verse) => {
    let solvedCount = 0;
    getHiddenTokenIndexSet(verse.tokens, getDifficulty()).forEach((tokenIndex) => {
      if (getTokenProgress(chapter.id, verse.id, tokenIndex)?.solved) {
        solvedCount += 1;
      }
    });
    return count + solvedCount;
  }, 0);
}

function getChapterVisibleBlankCount(chapter, language = state.currentLanguage, difficulty = getDifficulty()) {
  const cacheKey = `${normalizeLanguage(language)}:${difficulty}:${chapter.id}`;
  if (chapterVisibleBlankCountCache.has(cacheKey)) {
    return chapterVisibleBlankCountCache.get(cacheKey);
  }

  const count = chapter.verses.reduce((total, verse) => (
    total + getHiddenTokenIndexSet(verse.tokens, difficulty, language).size
  ), 0);
  chapterVisibleBlankCountCache.set(cacheKey, count);
  return count;
}

function getOverallVisibleBlankCount(language = state.currentLanguage, difficulty = getDifficulty()) {
  const data = getData(language);
  if (!data) return 0;
  const cacheKey = `${normalizeLanguage(language)}:${difficulty}`;
  if (overallVisibleBlankCountCache.has(cacheKey)) {
    return overallVisibleBlankCountCache.get(cacheKey);
  }

  const count = data.chapters.reduce((total, chapter) => (
    total + getChapterVisibleBlankCount(chapter, language, difficulty)
  ), 0);
  overallVisibleBlankCountCache.set(cacheKey, count);
  return count;
}

function getOverallDifficultyProgress() {
  const data = getData();
  if (!data) {
    return { visible: 0, solved: 0, percent: 0 };
  }
  const totals = data.chapters.reduce((accumulator, chapter) => {
    accumulator.visible += getChapterVisibleBlankCount(chapter);
    accumulator.solved += getChapterSolvedCount(chapter);
    return accumulator;
  }, { visible: 0, solved: 0 });
  return {
    ...totals,
    percent: totals.visible ? Math.round((totals.solved / totals.visible) * 100) : 100,
  };
}

function getCollectibleType(typeId) {
  return collectibleTypeById[typeId] || null;
}

function createCollectibleCounts() {
  return Object.fromEntries(collectibleTypes.map((type) => [type.id, 0]));
}

function normalizeCollectibleCounts(counts = {}) {
  const normalized = createCollectibleCounts();
  collectibleTypes.forEach((type) => {
    normalized[type.id] = Math.max(0, Number(counts[type.id]) || 0);
  });
  return normalized;
}

function getCurrentLeaderboardRow() {
  return state.leaderboard.find((row) => row.userId === state.currentUser?.id) || null;
}

function getLocalCollectionProgressItems() {
  const prefix = getCollectionProgressPrefix();
  const itemsByToken = new Map();

  Object.entries(state.progress).forEach(([key, progress]) => {
    if (!key.startsWith(prefix) || !progress?.solved) {
      return;
    }
    const collectible = getCollectibleType(progress.rewardType);
    if (!collectible) {
      return;
    }

    const [, chapterId, verseId, tokenIndex] = key.slice(prefix.length).split(":");
    const tokenKey = `${chapterId}:${verseId}:${tokenIndex}`;
    const timestamp = Date.parse(progress.collectedAt || "") || 0;
    const existing = itemsByToken.get(tokenKey);
    if (!existing || timestamp < existing.timestamp) {
      itemsByToken.set(tokenKey, {
        rewardType: collectible.id,
        timestamp,
      });
    }
  });

  return [...itemsByToken.values()];
}

function getCurrentCollectibleCounts() {
  const leaderboardRow = getCurrentLeaderboardRow();
  if (leaderboardRow?.rewardCounts) {
    return normalizeCollectibleCounts(leaderboardRow.rewardCounts);
  }

  const counts = createCollectibleCounts();
  getLocalCollectionProgressItems().forEach((progress) => {
    const collectible = getCollectibleType(progress.rewardType);
    if (collectible) {
      counts[collectible.id] += 1;
    }
  });
  return counts;
}

function getLatestCollectibleType() {
  const leaderboardRow = getCurrentLeaderboardRow();
  if (getCollectibleType(leaderboardRow?.latestRewardType)) {
    return leaderboardRow.latestRewardType;
  }

  return getLocalCollectionProgressItems()
    .sort((left, right) => (
      right.timestamp - left.timestamp
    ))[0]?.rewardType || "";
}

function getCollectionPoints(counts) {
  return collectibleTypes.reduce((total, type) => (
    total + ((Number(counts[type.id]) || 0) * type.levelUnits)
  ), 0);
}

function getLevelRequirement(level) {
  if (level >= maxCollectionLevel) {
    return Infinity;
  }
  return Math.max(1, Math.round(level * Math.pow(1.035, level - 1)));
}

function calculateCollectionLevel(counts) {
  let remainingPoints = getCollectionPoints(counts);
  let level = 1;

  while (level < maxCollectionLevel) {
    const required = getLevelRequirement(level);
    if (remainingPoints < required) {
      break;
    }
    remainingPoints -= required;
    level += 1;
  }

  const nextRequirement = getLevelRequirement(level);
  return {
    level,
    current: level >= maxCollectionLevel ? nextRequirement : remainingPoints,
    required: nextRequirement,
    percent: level >= maxCollectionLevel ? 100 : Math.min(100, Math.round((remainingPoints / nextRequirement) * 100)),
    totalPoints: getCollectionPoints(counts),
  };
}

function formatLevelUnits(value) {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCollectibleRarityId(collectible) {
  return String(collectible?.rarity || "").toLowerCase();
}

function getCollectibleLabel(collectible) {
  return getCopy().collectibleLabels?.[collectible?.id] || collectible?.label || "";
}

function getCollectibleRarityLabel(collectible) {
  const rarityId = getCollectibleRarityId(collectible);
  return getCopy().rarityLabels?.[rarityId] || collectible?.rarity || "";
}

function getCollectibleAccessibleLabel(collectible) {
  return `${getCollectibleLabel(collectible)} ${getCollectibleRarityLabel(collectible)}`.trim();
}

function renderRewardBadge(typeId, options = {}) {
  const collectible = getCollectibleType(typeId);
  if (!collectible) {
    return `<span class="reward-badge reward-empty" aria-label="${escapeHtml(getCopy().solvedRewardLabel)}">✓</span>`;
  }
  const label = getCollectibleAccessibleLabel(collectible);
  const rarityId = getCollectibleRarityId(collectible);
  const classes = [
    "reward-badge",
    `reward-${collectible.id}`,
    `rarity-${rarityId}`,
    collectible.shiny ? "is-shiny" : "",
    options.large ? "large" : "",
  ].filter(Boolean).join(" ");
  return `<span class="${classes}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><span class="reward-icon">${escapeHtml(collectible.icon)}</span></span>`;
}

function renderCollectibleCounts(counts, options = {}) {
  const normalizedCounts = normalizeCollectibleCounts(counts);
  return collectibleTypes.map((type) => `
    <div class="collectible-count${options.compact ? " compact" : ""}">
      ${renderRewardBadge(type.id)}
      <div>
        <strong>${escapeHtml(getCollectibleLabel(type))}</strong>
        <span class="collectible-rarity rarity-text-${getCollectibleRarityId(type)}">${escapeHtml(getCollectibleRarityLabel(type))} · ${normalizedCounts[type.id]}</span>
      </div>
    </div>
  `).join("");
}

function renderLevelsSection() {
  if (!(elements.levelsSection instanceof HTMLElement)) return;
  const copy = getCopy();
  const counts = getCurrentCollectibleCounts();
  const level = calculateCollectionLevel(counts);
  const latestCollectible = getCollectibleType(getLatestCollectibleType());
  const progressColor = latestCollectible?.levelColor || "#4d9f76";
  const isMaxLevel = level.level >= maxCollectionLevel;
  elements.levelsSection.innerHTML = `
    <div class="levels-heading">
      <div>
        <p class="section-label">${copy.levelsLabel}</p>
        <h3>${copy.levelsTitle}</h3>
      </div>
    </div>
    <div class="level-progress">
      <div class="level-progress-copy">
        <strong>${isMaxLevel ? "100%" : `${level.percent}%`}</strong>
      </div>
      <div class="level-progress-track">
        <div class="level-progress-fill" style="width: ${isMaxLevel ? 100 : level.percent}%; --level-color: ${progressColor};"></div>
      </div>
    </div>
    <div class="collectible-grid">
      ${renderCollectibleCounts(counts)}
    </div>
  `;
}

function buildSharedLeaderboardRows(rows) {
  const difficulty = getDifficulty();
  return rows
    .map((row) => {
      const scores = Array.isArray(row.scores) && row.scores.length
        ? row.scores
        : [{ language: row.language || state.currentLanguage, solvedCount: row.solvedCount || 0 }];
      const bestScore = scores
        .map((score) => {
          const language = score.language === "ko" ? "ko" : "en";
          const visibleCount = getOverallVisibleBlankCount(language, difficulty);
          const solvedCount = Number(score.solvedCount) || 0;
          const rewardCounts = normalizeCollectibleCounts(score.rewardCounts);
          const ratio = visibleCount ? solvedCount / visibleCount : 0;
          return {
            language,
            solvedCount,
            visibleCount,
            rewardCounts,
            hasRewards: getCollectionPoints(rewardCounts) > 0,
            latestRewardType: getCollectibleType(score.latestRewardType)?.id || "",
            latestCollectedAt: score.latestCollectedAt || "",
            ratio,
            percent: Math.round(ratio * 100),
          };
        })
        .sort((left, right) => (
          right.ratio - left.ratio
          || right.solvedCount - left.solvedCount
          || left.language.localeCompare(right.language)
        ))[0];

      return {
        userId: Number(row.userId),
        name: row.name,
        collectionLevel: calculateCollectionLevel(bestScore.rewardCounts),
        ...bestScore,
      };
    })
    .filter((row) => row.solvedCount > 0 || row.hasRewards || row.userId === state.currentUser?.id)
    .sort((left, right) => (
      right.ratio - left.ratio
      || right.solvedCount - left.solvedCount
      || left.name.localeCompare(right.name)
    ))
    .slice(0, 12)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function renderOverallProgress() {
  const difficulty = getDifficulty();
  const progress = getOverallDifficultyProgress();
  elements.overallProgressLabel.textContent = getCopy().overallProgressLabel(getDifficultyLabel(difficulty));
  elements.overallProgressValue.textContent = `${progress.percent}%`;
  elements.overallProgressFill.style.width = `${progress.percent}%`;
}

function renderStats() {
  const copy = getCopy();
  const chapter = getChapter();
  if (!chapter) return;
  const chapterSummary = state.summary?.chapters?.find((item) => item.chapterId === chapter.id);
  const totalAttempts = chapterSummary?.attempts ?? 0;
  const accuracy = chapterSummary?.accuracy ?? 0;
  const incorrect = totalAttempts ? 100 - accuracy : 0;
  elements.scopeTitle.textContent = copy.formatScopeTitle(chapter.id);
  elements.stats.innerHTML = [
    [copy.statLabels.difficulty, copy.statsValueDifficulty(getDifficultyLabel(getDifficulty()))],
    [copy.statLabels.visibleBlanks, getChapterVisibleBlankCount(chapter)],
    [copy.statLabels.solvedBlanks, getChapterSolvedCount(chapter)],
    [copy.statLabels.attempts, totalAttempts],
    [copy.statLabels.correctIncorrect, `${accuracy}% / ${incorrect}%`],
  ].map(([label, value]) => `
    <div class="stat">
      <span class="stat-label">${label}</span>
      <strong class="stat-value">${value}</strong>
    </div>
  `).join("");
}

function renderLeaderboard() {
  const copy = getCopy();
  const difficultyKey = `shared:${getDifficulty()}`;
  elements.leaderboardTitle.textContent = copy.leaderboardTitle(getDifficultyLabel(getDifficulty()));

  if (!state.leaderboard.length) {
    elements.leaderboard.innerHTML = `<p class="muted">${copy.noScores()}</p>`;
    return;
  }

  const previousRank = state.previousRanks[difficultyKey];

  elements.leaderboard.innerHTML = state.leaderboard.map((row) => {
    let medal = "";
    if (row.rank === 1) {
      medal = "🥇";
    } else if (row.rank === 2) {
      medal = "🥈";
    } else if (row.rank === 3) {
      medal = "🥉";
    }

    let status = "";
    if (row.userId === state.currentUser?.id) {
      if (previousRank && row.rank < previousRank) {
        status = "👟";
      } else if (previousRank && row.rank > previousRank) {
        status = "⬇";
      }
      state.previousRanks[difficultyKey] = row.rank;
    }
    const levelText = copy.currentLevel(row.collectionLevel?.level || 1);
    return `
      <details class="leaderboard-entry${row.userId === state.currentUser?.id ? " current-user" : ""}">
        <summary class="leaderboard-row">
          <div>
            <div><strong>${escapeHtml(row.name)}</strong><span class="leaderboard-status">${medal}${status}</span></div>
            <div class="leaderboard-rank">${copy.rankLabel(row.rank)} · ${levelText}</div>
          </div>
          <div class="leaderboard-score">
            <span>${row.percent}%</span>
          </div>
        </summary>
        <div class="leaderboard-rewards">
          ${renderCollectibleCounts(row.rewardCounts, { compact: true })}
        </div>
      </details>
    `;
  }).join("");

  saveRanks();
}

function renderRecommendations() {
  const copy = getCopy();
  const data = getData();
  if (!data) return;
  elements.dbStatus.textContent = state.dbConnected
    ? copy.dbConnected
    : copy.dbDisconnected;

  const difficulty = getDifficulty();
  const tailoredChapters = data.chapters
    .map((chapter) => {
      const visibleBlanks = getChapterVisibleBlankCount(chapter);
      const solvedBlanks = getChapterSolvedCount(chapter);
      const completion = visibleBlanks ? Math.round((solvedBlanks / visibleBlanks) * 100) : 100;
      const firstUnsolvedVerse = chapter.verses.find((verse) => {
        for (const tokenIndex of getHiddenTokenIndexSet(verse.tokens, difficulty)) {
          if (!getTokenProgress(chapter.id, verse.id, tokenIndex)?.solved) {
            return true;
          }
        }
        return false;
      })?.id ?? null;
      return { chapterId: chapter.id, visibleBlanks, solvedBlanks, completion, firstUnsolvedVerse };
    })
    .filter((chapter) => chapter.visibleBlanks > 0)
    .sort((left, right) => left.completion - right.completion || right.visibleBlanks - left.visibleBlanks)
    .slice(0, 4);

  if (!tailoredChapters.length) {
    elements.recommendations.innerHTML = `<p class="muted">${copy.recommendationsEmpty(getDifficultyDescription(difficulty))}</p>`;
    return;
  }

  elements.recommendations.innerHTML = tailoredChapters.map((chapter) => `
    <article class="recommendation-item">
      <strong>${formatChapterLabel(chapter.chapterId)}</strong>
      <div>${copy.recommendationCompletion(getDifficultyLabel(difficulty), chapter.completion)}</div>
      <div>${copy.recommendationSolved(chapter.solvedBlanks, chapter.visibleBlanks)}</div>
      <div>${copy.recommendationVerse(chapter.firstUnsolvedVerse)}</div>
    </article>
  `).join("");
}

function buildMetaText(result) {
  return getCopy().metaPerformance(
    result.correctCount,
    result.correctPercentage
  );
}

function createAnswerMeta() {
  const meta = document.createElement("span");
  meta.className = "answer-meta";
  meta.textContent = "";
  return meta;
}

function createRewardBadgeElement(typeId, fallbackIcon = "✓") {
  const badge = document.createElement("span");
  const collectible = getCollectibleType(typeId);
  if (!collectible) {
    badge.className = "reward-badge reward-empty";
    const icon = document.createElement("span");
    icon.className = "reward-icon";
    icon.textContent = fallbackIcon;
    badge.append(icon);
    badge.setAttribute("aria-label", getCopy().solvedRewardLabel);
    return badge;
  }

  const rarityId = getCollectibleRarityId(collectible);
  badge.className = [
    "reward-badge",
    `reward-${collectible.id}`,
    `rarity-${rarityId}`,
    collectible.shiny ? "is-shiny" : "",
  ].filter(Boolean).join(" ");
  const icon = document.createElement("span");
  icon.className = "reward-icon";
  icon.textContent = collectible.icon;
  badge.append(icon);
  badge.title = `${getCollectibleLabel(collectible)} (${getCollectibleRarityLabel(collectible)})`;
  badge.setAttribute("aria-label", badge.title);
  return badge;
}

function setMetaContent(meta, { status = "", detail = "", hint = "", rewardType = "", fallbackIcon = "" } = {}) {
  const classNames = ["answer-meta"];
  if (status) classNames.push(status);
  if (hint) classNames.push("has-hint");
  if (rewardType || fallbackIcon) classNames.push("has-reward");
  meta.className = classNames.join(" ");
  meta.innerHTML = "";

  if (rewardType || fallbackIcon) {
    meta.append(createRewardBadgeElement(rewardType, fallbackIcon || "✓"));
  }

  if (detail) {
    const detailSpan = document.createElement("span");
    detailSpan.className = "answer-meta-detail";
    detailSpan.textContent = detail;
    meta.append(detailSpan);
  }

  if (hint) {
    const hintSpan = document.createElement("span");
    hintSpan.className = "answer-meta-hint";
    hintSpan.textContent = hint;
    meta.append(hintSpan);
  }
}

function focusQuizInput(input) {
  if (!(input instanceof HTMLInputElement)) return;
  input.scrollIntoView({ block: "nearest", inline: "nearest" });
  input.focus();
}

function focusInputByKey(focusKey) {
  if (!focusKey) return false;
  const target = document.querySelector(`[data-focus-key="${focusKey}"]`);
  if (target instanceof HTMLInputElement) {
    focusQuizInput(target);
    return true;
  }
  return false;
}

function renderPostAttemptPanels() {
  if (!state.currentUser?.id) return;
  renderChapterList();
  renderLeaderboard();
  renderLevelsSection();
  renderRecommendations();
  renderOverallProgress();
  renderStats();
}

function getAchievementDisplayLabel(collectible) {
  return getCopy().achievementLabels?.[collectible?.id] || getCollectibleLabel(collectible);
}

function launchAchievementPrize(rewardType) {
  const collectible = getCollectibleType(rewardType);
  if (!collectible?.achievement) return;

  document.querySelectorAll(".achievement-overlay, .achievement-chest-overlay").forEach((node) => node.remove());

  const overlay = document.createElement("div");
  overlay.className = `achievement-overlay reward-${collectible.id}`;
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.innerHTML = `
    <div class="achievement-aura"></div>
    ${renderRewardBadge(collectible.id, { large: true })}
    <div class="achievement-copy">
      <strong>${escapeHtml(getAchievementDisplayLabel(collectible))}</strong>
      <span class="collectible-rarity rarity-text-${getCollectibleRarityId(collectible)}">${escapeHtml(getCollectibleRarityLabel(collectible))}</span>
      <span class="achievement-claim">${escapeHtml(getCopy().tapToClaim)}</span>
    </div>
  `;
  document.body.append(overlay);

  const removeOverlay = () => overlay.remove();
  overlay.addEventListener("click", removeOverlay, { once: true });
}

function launchAchievement(rewardType) {
  const collectible = getCollectibleType(rewardType);
  if (!collectible?.achievement) return;

  document.querySelectorAll(".achievement-overlay, .achievement-chest-overlay").forEach((node) => node.remove());

  const chestOverlay = document.createElement("div");
  chestOverlay.className = `achievement-chest-overlay reward-${collectible.id}`;
  chestOverlay.setAttribute("role", "button");
  chestOverlay.setAttribute("tabindex", "0");
  chestOverlay.setAttribute("aria-label", getCopy().tapToOpenTreasureChest);
  chestOverlay.innerHTML = `
    <div class="reward-chest-scene" aria-hidden="true">
      <div class="reward-chest-light"></div>
      <div class="reward-chest">
        <span class="reward-chest-lid"></span>
        <span class="reward-chest-body"></span>
        <span class="reward-chest-band reward-chest-band-left"></span>
        <span class="reward-chest-band reward-chest-band-mid-left"></span>
        <span class="reward-chest-band reward-chest-band-mid-right"></span>
        <span class="reward-chest-band reward-chest-band-right"></span>
        <span class="reward-chest-latch"></span>
        <span class="reward-chest-lock"></span>
        <span class="reward-chest-keyhole"></span>
        <span class="reward-chest-foot reward-chest-foot-left"></span>
        <span class="reward-chest-foot reward-chest-foot-right"></span>
      </div>
    </div>
    <div class="achievement-copy chest-copy">
      <span class="achievement-claim">${escapeHtml(getCopy().tapToOpen)}</span>
    </div>
  `;

  let chestOpened = false;
  const openChest = () => {
    if (chestOpened) return;
    chestOpened = true;
    chestOverlay.remove();
    launchAchievementPrize(collectible.id);
  };
  chestOverlay.addEventListener("click", openChest, { once: true });
  chestOverlay.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openChest();
  });
  document.body.append(chestOverlay);
  chestOverlay.focus({ preventScroll: true });
}

function showDemoReward(rewardType) {
  const collectible = getCollectibleType(rewardType);
  if (!collectible) return;
  const preview = document.querySelector("#reward-demo-preview");
  if (preview instanceof HTMLElement) {
    preview.innerHTML = `
      ${renderRewardBadge(collectible.id)}
      <strong>${escapeHtml(getCollectibleLabel(collectible))}</strong>
      <span class="collectible-rarity rarity-text-${getCollectibleRarityId(collectible)}">${escapeHtml(getCollectibleRarityLabel(collectible))}</span>
    `;
  }
  launchAchievement(collectible.id);
}

function playRewardDemo(rewardType = "all") {
  const demoTypes = rewardType === "all"
    ? collectibleTypes
    : [getCollectibleType(rewardType)].filter(Boolean);
  let delay = 0;
  demoTypes.forEach((type) => {
    window.setTimeout(() => showDemoReward(type.id), delay);
    delay += type.achievement ? 2800 : 700;
  });
}

function setupRewardDemo() {
  window.johnQuizRewardDemo = playRewardDemo;
  if (!rewardDemoEnabled) return;

  const panel = document.createElement("div");
  panel.className = "reward-demo-panel";
  renderRewardDemoPanel(panel);
  panel.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-reward-demo]")
      : null;
    if (!(button instanceof HTMLElement)) return;
    showDemoReward(button.dataset.rewardDemo);
  });
  document.body.append(panel);
}

function renderRewardDemoPanel(panel = document.querySelector(".reward-demo-panel")) {
  if (!(panel instanceof HTMLElement)) return;
  panel.setAttribute("aria-label", getCopy().demoLabel);
  panel.innerHTML = `
    <div id="reward-demo-preview" class="reward-demo-preview">
      ${renderRewardBadge("fire")}
      <strong>${escapeHtml(getCopy().demoLabel)}</strong>
      <span>${escapeHtml(getCopy().collectiblesLabel)}</span>
    </div>
    <div class="reward-demo-buttons">
      ${collectibleTypes.map((type) => `
        <button type="button" class="secondary-button reward-demo-button" data-reward-demo="${type.id}" title="${escapeHtml(getCollectibleLabel(type))}">
          ${renderRewardBadge(type.id)}
        </button>
      `).join("")}
    </div>
  `;
}

function handleRewardTestShortcut(event) {
  if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key !== "d" && key !== "f") {
    return;
  }

  event.preventDefault();
  window.clearTimeout(rewardTestShortcutTimer);
  rewardTestShortcutSequence = `${rewardTestShortcutSequence}${key}`.slice(-2);

  if (rewardTestShortcutSequence === "df") {
    rewardTestShortcutSequence = "";
    launchAchievement("golden_apple");
    return;
  }

  if (rewardTestShortcutSequence === "fd") {
    rewardTestShortcutSequence = "";
    launchAchievement("wooden_cross");
    return;
  }

  rewardTestShortcutTimer = window.setTimeout(() => {
    rewardTestShortcutSequence = "";
  }, rewardTestShortcutTimeoutMs);
}

function findNextUnsolvedFocusKey(chapterId, verseId, tokenIndex) {
  const chapter = getChapter();
  if (!chapter) return null;
  const difficulty = getDifficulty();
  let passedCurrent = false;
  let nextFocusKey = null;

  for (const verse of chapter.verses) {
    for (const currentTokenIndex of getHiddenTokenIndexSet(verse.tokens, difficulty)) {
      if (!passedCurrent) {
        if (verse.id === verseId && currentTokenIndex === tokenIndex && chapter.id === chapterId) {
          passedCurrent = true;
        }
        continue;
      }

      const progress = getTokenProgress(chapter.id, verse.id, currentTokenIndex);
      if (!progress?.solved && !nextFocusKey) {
        nextFocusKey = `${chapter.id}:${verse.id}:${currentTokenIndex}`;
      }
    }

    if (nextFocusKey) return nextFocusKey;
  }

  return nextFocusKey;
}

function applyProgressToInput(input, meta, progress, displayValue) {
  const copy = getCopy();
  input.classList.remove("correct", "incorrect");
  input.disabled = false;
  input.placeholder = "";
  if (!progress) {
    if (!input.value) input.value = input.dataset.savedDraft || "";
    setMetaContent(meta);
    return;
  }
  if (progress.solved) {
    input.value = progress.value;
    input.classList.add("correct");
    input.disabled = true;
    setMetaContent(meta, {
      status: "correct",
      rewardType: progress.rewardType || "",
      fallbackIcon: "✓",
    });
    return;
  }
  input.value = "";
  input.classList.add("incorrect");
  if (progress.hintLevel === 1) {
    input.placeholder = displayValue.charAt(0);
    setMetaContent(meta, {
      status: "incorrect",
      hint: copy.hintStartsWith(displayValue.charAt(0)),
    });
    return;
  }
  if (progress.hintLevel >= 2) {
    input.placeholder = displayValue;
    setMetaContent(meta, {
      status: "incorrect",
      hint: copy.correctWord(displayValue),
    });
    return;
  }
  setMetaContent(meta, { status: "incorrect" });
}

function getAnswerMetaForInput(input) {
  return input.parentElement?.querySelector(".answer-meta") || null;
}

function refreshPostAttemptData() {
  if (!state.currentUser?.id) return;

  Promise.all([loadSummary(), loadLeaderboard()])
    .then(() => {
      renderPostAttemptPanels();
    })
    .catch(() => {
      // Keep the quiz responsive even if analytics refresh fails.
    });
}

async function submitAnswer(input, options = {}) {
  if (input.disabled || !state.currentUser?.id || input.dataset.submitting === "true") return;
  const shouldAdvanceOnCorrect = Boolean(options.advanceOnCorrect);
  const answer = getSubmittedAnswerForInput(input);
  const expected = input.dataset.answer;
  const chapterId = Number(input.dataset.chapterId);
  const verseId = Number(input.dataset.verseId);
  const tokenIndex = Number(input.dataset.tokenIndex);
  const meta = getAnswerMetaForInput(input);
  if (!(meta instanceof HTMLElement)) return;
  setTokenDraft(chapterId, verseId, tokenIndex, input.value.trim());
  if (!answer) {
    input.classList.remove("correct", "incorrect");
    input.placeholder = "";
    setMetaContent(meta);
    return;
  }

  const locallyCorrect = answer === expected;
  const nextFocusKey = locallyCorrect
    ? findNextUnsolvedFocusKey(chapterId, verseId, tokenIndex)
    : null;
  input.dataset.submitting = "true";

  try {
    const result = await api("/api/attempt", {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUser.id,
        language: state.currentLanguage,
        difficulty: getDifficulty(),
        chapterId,
        verseId,
        tokenIndex,
        expectedWord: expected,
        answer,
      }),
    });

    const prior = getTokenProgress(chapterId, verseId, tokenIndex) || { solved: false, hintLevel: 0 };
    if (result.isCorrect) {
      const progress = {
        solved: true,
        value: input.dataset.displayValue,
        hintLevel: 0,
        rewardType: getCollectibleType(result.rewardType)?.id || "",
        collectedAt: result.collectedAt || new Date().toISOString(),
      };
      setTokenProgress(chapterId, verseId, tokenIndex, progress);
      setTokenDraft(chapterId, verseId, tokenIndex, "");
      state.pendingFocusKey = null;
      applyProgressToInput(input, meta, progress, input.dataset.displayValue);
      if (shouldAdvanceOnCorrect) {
        focusInputByKey(nextFocusKey);
      }
      if (result.rewardAwarded) {
        launchAchievement(progress.rewardType);
      }
    } else {
      const progress = {
        solved: false,
        value: "",
        hintLevel: prior.hintLevel >= 1 ? 2 : 1,
        metaText: buildMetaText(result),
      };
      setTokenProgress(chapterId, verseId, tokenIndex, progress);
      setTokenDraft(chapterId, verseId, tokenIndex, "");
      state.pendingFocusKey = null;
      applyProgressToInput(input, meta, progress, input.dataset.displayValue);
      if (shouldAdvanceOnCorrect) {
        focusQuizInput(input);
      }
    }

    renderPostAttemptPanels();
    refreshPostAttemptData();
  } catch (error) {
    setMetaContent(meta, {
      status: "incorrect",
      detail: error.message || getCopy().answerSaveError,
    });
  } finally {
    input.dataset.submitting = "false";
  }
}

function renderVerseToken(token, chapterId, verseId, tokenIndex, difficulty, verseTokens) {
  if (token.type === "space") return document.createTextNode(token.value);
  if (token.type === "punct") return document.createTextNode(token.value);
  if (!shouldHideToken(verseTokens, tokenIndex, difficulty)) {
    const span = document.createElement("span");
    span.className = "kept-word";
    span.textContent = token.value;
    return span;
  }

  const wrapper = document.createElement("span");
  wrapper.className = "quiz-word";
  const blankPrompt = getBlankPromptForToken(token);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "quiz-input";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.style.setProperty("--chars", String(Math.max(blankPrompt.answer.length, 3)));
  input.dataset.answer = blankPrompt.normalizedAnswer;
  input.dataset.displayValue = blankPrompt.answer;
  input.dataset.particle = blankPrompt.particle;
  input.dataset.savedDraft = getTokenDraft(chapterId, verseId, tokenIndex);
  input.dataset.chapterId = String(chapterId);
  input.dataset.verseId = String(verseId);
  input.dataset.tokenIndex = String(tokenIndex);
  input.dataset.focusKey = `${chapterId}:${verseId}:${tokenIndex}`;
  input.dataset.isComposing = "false";
  input.dataset.submitting = "false";
  input.setAttribute("aria-label", getCopy().wordAriaLabel(chapterId, verseId));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (input.dataset.isComposing !== "true") {
        submitAnswer(input, { advanceOnCorrect: true });
      }
    }
  });
  input.addEventListener("compositionstart", () => {
    input.dataset.isComposing = "true";
  });
  input.addEventListener("compositionend", () => {
    input.dataset.isComposing = "false";
    setTokenDraft(chapterId, verseId, tokenIndex, input.value.trim());
  });
  input.addEventListener("input", () => {
    setTokenDraft(chapterId, verseId, tokenIndex, input.value.trim());
  });
  input.addEventListener("blur", () => submitAnswer(input));
  const meta = createAnswerMeta();
  applyProgressToInput(input, meta, getTokenProgress(chapterId, verseId, tokenIndex), blankPrompt.answer);

  wrapper.append(input);

  if (blankPrompt.particle) {
    const particle = document.createElement("span");
    particle.className = "quiz-particle";
    particle.textContent = `(${blankPrompt.particle})`;
    wrapper.append(particle);
  }

  wrapper.append(meta);
  return wrapper;
}

function renderQuiz() {
  const chapter = getChapter();
  if (!chapter) return;
  const nextChapter = getNextChapter();
  const difficulty = getDifficulty();
  elements.chapterTitle.textContent = getCopy().formatChapterTitle(chapter.id);
  elements.chapterSummary.textContent = getCopy().chapterSummary(
    getDifficultyDescription(difficulty),
    chapter.verses.length
  );
  elements.nextChapter.hidden = !nextChapter;
  elements.nextChapter.textContent = nextChapter
    ? `${getCopy().nextChapter}: ${formatChapterLabel(nextChapter.id)}`
    : getCopy().nextChapter;
  elements.chapterQuiz.innerHTML = "";

  chapter.verses.forEach((verse) => {
    const verseElement = document.createElement("article");
    verseElement.className = "verse";
    const verseNumber = document.createElement("span");
    verseNumber.className = "verse-number";
    verseNumber.textContent = `${verse.id}`;
    verseElement.append(verseNumber);
    verse.tokens.forEach((token, tokenIndex) => {
      verseElement.append(renderVerseToken(token, chapter.id, verse.id, tokenIndex, difficulty, verse.tokens));
    });
    elements.chapterQuiz.append(verseElement);
  });

  if (state.pendingFocusKey) {
    const target = document.querySelector(`[data-focus-key="${state.pendingFocusKey}"]`);
    if (target instanceof HTMLInputElement) {
      focusQuizInput(target);
    }
    state.pendingFocusKey = null;
  }

  if (state.pendingAchievementType) {
    window.requestAnimationFrame(() => launchAchievement(state.pendingAchievementType));
    state.pendingAchievementType = null;
  }
}

async function resetCurrentChapter() {
  if (!state.currentUser?.id) return;

  try {
    await api("/api/reset-chapter", {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUser.id,
        language: state.currentLanguage,
        difficulty: getDifficulty(),
        chapterId: state.selectedChapterId,
      }),
    });

    clearChapterProgress(state.selectedChapterId);
    await Promise.all([hydrateSolvedProgress(), loadSummary(), loadLeaderboard()]);
    render();
  } catch (error) {
    elements.dbStatus.textContent = error.message || getCopy().dbAnalyticsError;
  }
}

function autosaveVisibleDrafts(options = {}) {
  document.querySelectorAll(".quiz-input").forEach((input) => {
    if (input.disabled || !state.currentUser?.id) return;
    setTokenDraft(
      Number(input.dataset.chapterId),
      Number(input.dataset.verseId),
      Number(input.dataset.tokenIndex),
      input.value.trim(),
      { deferSave: true }
    );
  });
  saveDrafts(options);
}

async function handleDifficultyChange() {
  setDifficulty(getDifficulty());
  await Promise.all([hydrateSolvedProgress(), loadSummary(), loadLeaderboard()]);
  render();
}

function render() {
  renderStaticCopy();
  renderAuth();
  if (!state.currentUser?.id) return;
  if (!getData()) return;
  renderChapterList();
  renderLeaderboard();
  renderLevelsSection();
  renderRecommendations();
  renderOverallProgress();
  renderStats();
  renderQuiz();
}

async function setLanguage(language, options = {}) {
  const nextLanguage = normalizeLanguage(language);
  if (state.currentLanguage === nextLanguage && !options.force) {
    renderStaticCopy();
    render();
    return;
  }

  state.currentLanguage = nextLanguage;
  saveLanguage();
  renderStaticCopy();
  await ensureDataset(nextLanguage);

  if (state.currentUser) {
    state.currentUser.language = nextLanguage;
    state.currentUser.preferredLanguage = nextLanguage;
    saveSession();
  }

  if (!state.currentUser?.id) {
    render();
    return;
  }

  await Promise.all([persistUserPreferences(), hydrateSolvedProgress(), loadSummary(), loadLeaderboard()]);
  render();
}

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await setLanguage(elements.authLanguage.value, { force: true });
    await login(elements.authName.value.trim(), elements.authEmail.value.trim());
  } catch (error) {
    elements.authError.textContent = error.message;
  }
});

elements.authLanguage.addEventListener("change", () => {
  setLanguage(elements.authLanguage.value).catch((error) => {
    elements.authError.textContent = error.message;
  });
});
elements.languageToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.languageToggle).catch((error) => {
      elements.dbStatus.textContent = error.message;
    });
  });
});
elements.signOut.addEventListener("click", signOut);
elements.difficultySelect.addEventListener("change", handleDifficultyChange);
elements.resetChapter.addEventListener("click", resetCurrentChapter);
elements.nextChapter.addEventListener("click", () => {
  const nextChapter = getNextChapter();
  if (!nextChapter) return;
  state.selectedChapterId = nextChapter.id;
  render();
  scrollToChapterStart();
});
setupRewardDemo();

setInterval(autosaveVisibleDrafts, autosaveIntervalMs);
window.addEventListener("beforeunload", () => {
  autosaveVisibleDrafts({ immediate: true });
  flushPendingStorageSaves();
});
window.addEventListener("keydown", handleRewardTestShortcut);

function restoreSavedDifficulty() {
  const savedDifficulty = localStorage.getItem(difficultyStorageKey);
  if (savedDifficulty && getCopy().difficultyDescriptions[savedDifficulty]) {
    elements.difficultySelect.value = savedDifficulty;
  } else {
    elements.difficultySelect.value = "easy";
  }
}

async function initializeApp() {
  renderStaticCopy();
  renderAuth();
  await ensureDataset(state.currentLanguage);
  restoreSavedDifficulty();
  render();

  if (state.currentUser?.id) {
    await Promise.all([hydrateSolvedProgress(), loadSummary(), loadLeaderboard()]);
    render();
  }
}

initializeApp().catch((error) => {
  elements.dbStatus.textContent = error.message || getCopy().dbAnalyticsError;
  elements.authError.textContent = error.message || "";
});
