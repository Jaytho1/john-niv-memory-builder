const datasets = {
  en: window.JOHN_QUIZ_DATA,
  ko: window.JOHN_QUIZ_DATA_KO,
};

const progressStorageKey = "john-quiz-progress-v2";
const draftStorageKey = "john-quiz-drafts-v1";
const difficultyStorageKey = "john-quiz-difficulty-v1";
const sessionStorageKey = "john-quiz-session-v1";
const leaderboardRankStorageKey = "john-quiz-ranks-v1";
const languageStorageKey = "john-quiz-language-v1";
const autosaveIntervalMs = 2 * 60 * 1000;

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
    documentTitle: "요한복음 개역한글 암송 퀴즈",
    headerEyebrow: "요한복음 암송",
    siteTitle: "요한복음 개역한글 빈칸 퀴즈",
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
};

if (state.currentUser?.preferredLanguage && datasets[state.currentUser.preferredLanguage]) {
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

function loadLanguage() {
  const stored = localStorage.getItem(languageStorageKey);
  return stored === "ko" ? "ko" : "en";
}

function saveLanguage() {
  localStorage.setItem(languageStorageKey, state.currentLanguage);
}

function saveProgress() {
  saveJson(progressStorageKey, state.progress);
}

function saveDrafts() {
  saveJson(draftStorageKey, state.drafts);
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
  saveProgress();
  saveDrafts();
}

function getCopy() {
  return uiCopy[state.currentLanguage] || uiCopy.en;
}

function getData(language = state.currentLanguage) {
  return datasets[language] || datasets.en;
}

function getChapter() {
  return getData().chapters.find((chapter) => chapter.id === state.selectedChapterId);
}

function getNextChapter() {
  const chapters = getData().chapters;
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

function formatChapterLabel(chapterId) {
  return getCopy().formatChapterLabel(chapterId);
}

function getTokenKey(chapterId, verseId, tokenIndex) {
  return `${state.currentUser?.id || "guest"}:${state.currentLanguage}:${getDifficulty()}:${chapterId}:${verseId}:${tokenIndex}`;
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

function setTokenDraft(chapterId, verseId, tokenIndex, value) {
  const key = getTokenKey(chapterId, verseId, tokenIndex);
  if (value) {
    state.drafts[key] = value;
  } else {
    delete state.drafts[key];
  }
  saveDrafts();
}

function clearChapterProgress(chapterId) {
  const prefix = `${state.currentUser?.id || "guest"}:${state.currentLanguage}:${getDifficulty()}:${chapterId}:`;
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
  saveProgress();
  saveDrafts();
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

function shouldHideToken(tokens, tokenIndex, difficulty, language = state.currentLanguage) {
  const token = tokens[tokenIndex];
  if (token.type !== "word" || !token.testable) {
    return false;
  }
  if (difficulty === "extreme") {
    return true;
  }
  const targetSegment = getSentenceSegments(tokens).find((segment) => segment.includes(tokenIndex));
  if (!targetSegment) {
    return false;
  }
  const candidateIndices = targetSegment.filter((index) => {
    const currentToken = tokens[index];
    if (difficulty === "difficult") {
      return currentToken.type === "word" && currentToken.testable;
    }
    return isKeywordToken(currentToken, language);
  });
  return pickIndicesFromCandidates(
    candidateIndices,
    tokens,
    getPerSentenceLimit(difficulty, candidateIndices.length),
    language
  ).includes(tokenIndex);
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
    state.leaderboard = buildSharedLeaderboardRows(payload.rows);
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
    payload.rows.forEach((row) => {
      const token = data.chapters
        .find((chapter) => chapter.id === row.chapterId)
        ?.verses.find((verse) => verse.id === row.verseId)
        ?.tokens[row.tokenIndex];
      if (!token) return;
      const key = getTokenKey(row.chapterId, row.verseId, row.tokenIndex);
      state.progress[key] = {
        solved: true,
        value: token.value,
        hintLevel: 0,
        metaText: getCopy().solvedPreviously,
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
  elements.recommendationsLabel.textContent = copy.recommendationsLabel;
  elements.recommendationsTitle.textContent = copy.recommendationsTitle;
  elements.quizLabel.textContent = copy.quizLabel;
  elements.difficultyLabel.textContent = copy.difficultyLabel;
  elements.chapterResetLabel.textContent = copy.chapterResetLabel;
  elements.resetChapter.textContent = copy.resetChapter;
  if (!state.currentUser?.id) {
    elements.userName.textContent = copy.notSignedIn;
  }
  if (!elements.dbStatus.textContent || elements.dbStatus.textContent === uiCopy.en.dbChecking || elements.dbStatus.textContent === uiCopy.ko.dbChecking) {
    elements.dbStatus.textContent = copy.dbChecking;
  }
  renderDifficultyOptions();
  syncLanguageControls();
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

function renderChapterList() {
  const data = getData();
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
    });
    elements.chapterList.append(button);
  });
}

function getChapterSolvedCount(chapter) {
  return chapter.verses.reduce((count, verse) => (
    count + verse.tokens.filter((token, tokenIndex) => (
      shouldHideToken(verse.tokens, tokenIndex, getDifficulty())
      && Boolean(getTokenProgress(chapter.id, verse.id, tokenIndex)?.solved)
    )).length
  ), 0);
}

function getChapterVisibleBlankCount(chapter, language = state.currentLanguage, difficulty = getDifficulty()) {
  return chapter.verses.reduce((count, verse) => (
    count + verse.tokens.filter((token, tokenIndex) => shouldHideToken(verse.tokens, tokenIndex, difficulty, language)).length
  ), 0);
}

function getOverallVisibleBlankCount(language = state.currentLanguage, difficulty = getDifficulty()) {
  const data = getData(language);
  return data.chapters.reduce((count, chapter) => (
    count + getChapterVisibleBlankCount(chapter, language, difficulty)
  ), 0);
}

function getOverallDifficultyProgress() {
  const data = getData();
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
          const ratio = visibleCount ? solvedCount / visibleCount : 0;
          return {
            language,
            solvedCount,
            visibleCount,
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
        ...bestScore,
      };
    })
    .filter((row) => row.solvedCount > 0)
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
        status = "🔥";
      } else if (previousRank && row.rank > previousRank) {
        status = "⬇";
      }
      state.previousRanks[difficultyKey] = row.rank;
    }
    return `
      <article class="leaderboard-row${row.userId === state.currentUser?.id ? " current-user" : ""}">
        <div>
          <div><strong>${row.name}</strong><span class="leaderboard-status">${medal}${status}</span></div>
          <div class="leaderboard-rank">${copy.rankLabel(row.rank)}</div>
        </div>
        <div class="chapter-button-meta">${row.percent}%</div>
      </article>
    `;
  }).join("");

  saveRanks();
}

function renderRecommendations() {
  const copy = getCopy();
  const data = getData();
  elements.dbStatus.textContent = state.dbConnected
    ? copy.dbConnected
    : copy.dbDisconnected;

  const difficulty = getDifficulty();
  const tailoredChapters = data.chapters
    .map((chapter) => {
      const visibleBlanks = getChapterVisibleBlankCount(chapter);
      const solvedBlanks = getChapterSolvedCount(chapter);
      const completion = visibleBlanks ? Math.round((solvedBlanks / visibleBlanks) * 100) : 100;
      const firstUnsolvedVerse = chapter.verses.find((verse) => verse.tokens.some((token, tokenIndex) => (
        shouldHideToken(verse.tokens, tokenIndex, difficulty)
        && !getTokenProgress(chapter.id, verse.id, tokenIndex)?.solved
      )))?.id ?? null;
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

function setMetaContent(meta, { status = "", detail = "", hint = "" } = {}) {
  const classNames = ["answer-meta"];
  if (status) classNames.push(status);
  if (hint) classNames.push("has-hint");
  meta.className = classNames.join(" ");
  meta.innerHTML = "";

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

function findNextUnsolvedFocusKey(chapterId, verseId, tokenIndex) {
  const chapter = getChapter();
  const difficulty = getDifficulty();
  let passedCurrent = false;
  let nextFocusKey = null;

  for (const verse of chapter.verses) {
    verse.tokens.forEach((token, currentTokenIndex) => {
      if (token.type === "space" || token.type === "punct") return;
      if (!shouldHideToken(verse.tokens, currentTokenIndex, difficulty)) return;

      if (!passedCurrent) {
        if (verse.id === verseId && currentTokenIndex === tokenIndex && chapter.id === chapterId) {
          passedCurrent = true;
        }
        return;
      }

      const progress = getTokenProgress(chapter.id, verse.id, currentTokenIndex);
      if (!progress?.solved && !nextFocusKey) {
        nextFocusKey = `${chapter.id}:${verse.id}:${currentTokenIndex}`;
      }
    });

    if (nextFocusKey) return nextFocusKey;
  }

  return nextFocusKey;
}

function maybeSubmitOnExactMatch(input) {
  if (
    !(input instanceof HTMLInputElement) ||
    input.disabled ||
    input.dataset.isComposing === "true" ||
    input.dataset.submitting === "true"
  ) {
    return;
  }

  const answer = normalizeAnswer(input.value);
  if (answer && answer === input.dataset.answer) {
    submitAnswer(input);
  }
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
      detail: progress.metaText || copy.correct,
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

async function submitAnswer(input) {
  if (input.disabled || !state.currentUser?.id || input.dataset.submitting === "true") return;
  const answer = normalizeAnswer(input.value);
  const expected = input.dataset.answer;
  const chapterId = Number(input.dataset.chapterId);
  const verseId = Number(input.dataset.verseId);
  const tokenIndex = Number(input.dataset.tokenIndex);
  const meta = input.nextElementSibling;
  setTokenDraft(chapterId, verseId, tokenIndex, input.value.trim());
  if (!answer) {
    input.classList.remove("correct", "incorrect");
    input.placeholder = "";
    setMetaContent(meta);
    return;
  }

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
        metaText: buildMetaText(result),
      };
      setTokenProgress(chapterId, verseId, tokenIndex, progress);
      setTokenDraft(chapterId, verseId, tokenIndex, "");
      state.pendingFocusKey = findNextUnsolvedFocusKey(chapterId, verseId, tokenIndex);
      applyProgressToInput(input, meta, progress, input.dataset.displayValue);
    } else {
      const progress = {
        solved: false,
        value: "",
        hintLevel: prior.hintLevel >= 1 ? 2 : 1,
        metaText: buildMetaText(result),
      };
      setTokenProgress(chapterId, verseId, tokenIndex, progress);
      setTokenDraft(chapterId, verseId, tokenIndex, "");
      state.pendingFocusKey = `${chapterId}:${verseId}:${tokenIndex}`;
      applyProgressToInput(input, meta, progress, input.dataset.displayValue);
      input.value = "";
      focusQuizInput(input);
    }

    await Promise.all([loadSummary(), loadLeaderboard()]);
    render();
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
  const input = document.createElement("input");
  input.type = "text";
  input.className = "quiz-input";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.style.setProperty("--chars", String(Math.max(token.value.length, 3)));
  input.dataset.answer = token.normalized;
  input.dataset.displayValue = token.value;
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
      submitAnswer(input);
    }
  });
  input.addEventListener("compositionstart", () => {
    input.dataset.isComposing = "true";
  });
  input.addEventListener("compositionend", () => {
    input.dataset.isComposing = "false";
    setTokenDraft(chapterId, verseId, tokenIndex, input.value.trim());
    maybeSubmitOnExactMatch(input);
  });
  input.addEventListener("input", () => {
    setTokenDraft(chapterId, verseId, tokenIndex, input.value.trim());
    maybeSubmitOnExactMatch(input);
  });
  input.addEventListener("blur", () => submitAnswer(input));
  const meta = createAnswerMeta();
  applyProgressToInput(input, meta, getTokenProgress(chapterId, verseId, tokenIndex), token.value);
  wrapper.append(input, meta);
  return wrapper;
}

function renderQuiz() {
  const chapter = getChapter();
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

function autosaveVisibleDrafts() {
  document.querySelectorAll(".quiz-input").forEach((input) => {
    if (input.disabled || !state.currentUser?.id) return;
    setTokenDraft(
      Number(input.dataset.chapterId),
      Number(input.dataset.verseId),
      Number(input.dataset.tokenIndex),
      input.value.trim()
    );
  });
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
  renderChapterList();
  renderLeaderboard();
  renderRecommendations();
  renderOverallProgress();
  renderStats();
  renderQuiz();
}

function setLanguage(language, options = {}) {
  const nextLanguage = language === "ko" ? "ko" : "en";
  if (state.currentLanguage === nextLanguage && !options.force) {
    renderStaticCopy();
    render();
    return;
  }

  state.currentLanguage = nextLanguage;
  saveLanguage();
  renderStaticCopy();

  if (state.currentUser) {
    state.currentUser.language = nextLanguage;
    state.currentUser.preferredLanguage = nextLanguage;
    saveSession();
  }

  if (!state.currentUser?.id) {
    render();
    return;
  }

  Promise.all([persistUserPreferences(), hydrateSolvedProgress(), loadSummary(), loadLeaderboard()]).finally(render);
}

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLanguage(elements.authLanguage.value, { force: true });
  try {
    await login(elements.authName.value.trim(), elements.authEmail.value.trim());
  } catch (error) {
    elements.authError.textContent = error.message;
  }
});

elements.authLanguage.addEventListener("change", () => setLanguage(elements.authLanguage.value));
elements.languageToggleButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.languageToggle));
});
elements.signOut.addEventListener("click", signOut);
elements.difficultySelect.addEventListener("change", handleDifficultyChange);
elements.resetChapter.addEventListener("click", resetCurrentChapter);
elements.nextChapter.addEventListener("click", () => {
  const nextChapter = getNextChapter();
  if (!nextChapter) return;
  state.selectedChapterId = nextChapter.id;
  render();
  elements.chapterTitle.scrollIntoView({ block: "start", behavior: "smooth" });
});

setInterval(autosaveVisibleDrafts, autosaveIntervalMs);
window.addEventListener("beforeunload", autosaveVisibleDrafts);

const savedDifficulty = localStorage.getItem(difficultyStorageKey);
if (savedDifficulty && getCopy().difficultyDescriptions[savedDifficulty]) {
  elements.difficultySelect.value = savedDifficulty;
} else {
  elements.difficultySelect.value = "easy";
}

render();

if (state.currentUser?.id) {
  Promise.all([hydrateSolvedProgress(), loadSummary(), loadLeaderboard()]).finally(render);
}
