const data = window.JOHN_QUIZ_DATA;
const progressStorageKey = "john-quiz-progress-v2";
const draftStorageKey = "john-quiz-drafts-v1";
const difficultyStorageKey = "john-quiz-difficulty-v1";
const sessionStorageKey = "john-quiz-session-v1";
const leaderboardRankStorageKey = "john-quiz-ranks-v1";
const autosaveIntervalMs = 2 * 60 * 1000;

const elements = {
  authOverlay: document.querySelector("#auth-overlay"),
  authForm: document.querySelector("#auth-form"),
  authName: document.querySelector("#auth-name"),
  authEmail: document.querySelector("#auth-email"),
  authError: document.querySelector("#auth-error"),
  userName: document.querySelector("#user-name"),
  signOut: document.querySelector("#sign-out"),
  chapterList: document.querySelector("#chapter-list"),
  dbStatus: document.querySelector("#db-status"),
  scopeTitle: document.querySelector("#scope-title"),
  overallProgressLabel: document.querySelector("#overall-progress-label"),
  overallProgressValue: document.querySelector("#overall-progress-value"),
  overallProgressFill: document.querySelector("#overall-progress-fill"),
  stats: document.querySelector("#stats"),
  leaderboardTitle: document.querySelector("#leaderboard-title"),
  leaderboard: document.querySelector("#leaderboard"),
  recommendations: document.querySelector("#recommendations"),
  difficultySelect: document.querySelector("#difficulty-select"),
  resetChapter: document.querySelector("#reset-chapter"),
  chapterTitle: document.querySelector("#chapter-title"),
  chapterSummary: document.querySelector("#chapter-summary"),
  chapterQuiz: document.querySelector("#chapter-quiz"),
};

const keywordStopwords = new Set([
  "about", "after", "again", "among", "around", "because", "before", "being",
  "came", "come", "does", "down", "each", "even", "every", "gave", "give",
  "going", "into", "just", "made", "many", "more", "most", "much", "only",
  "other", "over", "said", "same", "sent", "some", "such", "than", "that",
  "them", "then", "there", "these", "they", "this", "those", "through", "very",
  "were", "what", "when", "where", "which", "while", "with", "would"
]);

const priorityKeywords = new Set([
  "abraham", "advocate", "alive", "amen", "angel", "anointed", "authority",
  "believe", "bread", "christ", "cross", "darkness", "david", "disciple",
  "disciples", "eternal", "faith", "father", "glory", "god", "grace",
  "heaven", "holy", "hour", "israel", "jews", "jesus", "jerusalem", "john",
  "judgment", "king", "kingdom", "lamb", "law", "life", "light",
  "lord", "love", "messiah", "miracle", "miracles", "moses", "nazareth",
  "passover", "peace", "peter", "pharisees", "pilate", "pray", "prophet",
  "rabbi", "resurrection", "sabbath", "salvation", "scripture", "shepherd",
  "sign", "signs", "sin", "sins", "son", "spirit", "teacher", "temple",
  "testify", "testimony", "truth", "vine", "water", "witness", "word", "world"
]);

const deprioritizedWords = new Set([
  "answered", "asking", "asked", "asks", "brought", "called", "calling",
  "cried", "declared", "found", "gave", "heard", "knew", "know", "knowing",
  "looked", "looking", "passed", "passing", "replied", "replies", "saying",
  "says", "showed", "speaking", "spoke", "standing", "stood", "taken", "tell",
  "telling", "tells", "told", "went"
]);

const difficultyDescriptions = {
  easy: "Easy keeps one keyword blank per sentence.",
  medium: "Medium hides one to two keywords per sentence.",
  hard: "Hard hides up to three keywords per sentence.",
  difficult: "Difficult hides up to six testable words per sentence.",
  extreme: "Extreme hides every testable word.",
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
};

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

function getChapter() {
  return data.chapters.find((chapter) => chapter.id === state.selectedChapterId);
}

function getDifficulty() {
  return elements.difficultySelect.value;
}

function setDifficulty(value) {
  elements.difficultySelect.value = value;
  localStorage.setItem(difficultyStorageKey, value);
}

function normalizeAnswer(value) {
  return value.trim().toLowerCase();
}

function getTokenKey(chapterId, verseId, tokenIndex) {
  return `${state.currentUser?.id || "guest"}:${getDifficulty()}:${chapterId}:${verseId}:${tokenIndex}`;
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
  const prefix = `${state.currentUser?.id || "guest"}:${getDifficulty()}:${chapterId}:`;
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

function isKeywordToken(token) {
  return token.type === "word"
    && token.testable
    && token.normalized.length > 2
    && !keywordStopwords.has(token.normalized);
}

function scoreTokenForDifficulty(token) {
  let score = token.value.length;
  if (priorityKeywords.has(token.normalized)) {
    score += 100;
  }
  if (/^[A-Z]/.test(token.value)) {
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

function pickIndicesFromCandidates(candidateIndices, tokens, limit) {
  if (candidateIndices.length <= limit) {
    return candidateIndices;
  }
  return [...candidateIndices]
    .sort((left, right) => (
      scoreTokenForDifficulty(tokens[right]) - scoreTokenForDifficulty(tokens[left])
      || tokens[right].value.length - tokens[left].value.length
      || left - right
    ))
    .slice(0, limit)
    .sort((left, right) => left - right);
}

function shouldHideToken(tokens, tokenIndex, difficulty) {
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
    return isKeywordToken(currentToken);
  });
  return pickIndicesFromCandidates(candidateIndices, tokens, getPerSentenceLimit(difficulty, candidateIndices.length)).includes(tokenIndex);
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
    body: JSON.stringify({ name, email }),
  });
  state.currentUser = payload.user;
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
  elements.userName.textContent = "Not signed in";
  elements.authOverlay.classList.add("visible");
  render();
}

async function loadSummary() {
  if (!state.currentUser?.id) return;
  try {
    const payload = await api(`/api/progress/summary?userId=${state.currentUser.id}`);
    state.summary = payload;
    state.dbConnected = payload.db.connected;
  } catch {
    state.summary = null;
    elements.dbStatus.textContent = "Could not load analytics yet.";
  }
}

async function loadLeaderboard() {
  if (!state.currentUser?.id) return;
  const difficulty = getDifficulty();
  try {
    const payload = await api(`/api/leaderboard?difficulty=${difficulty}&userId=${state.currentUser.id}`);
    state.leaderboard = payload.rows;
    state.dbConnected = payload.db.connected;
  } catch {
    state.leaderboard = [];
  }
}

async function hydrateSolvedProgress() {
  if (!state.currentUser?.id) return;
  try {
    const payload = await api(`/api/user-progress?userId=${state.currentUser.id}&difficulty=${getDifficulty()}`);
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
        metaText: "Solved previously",
      };
    });
    saveProgress();
  } catch {
    // Keep local-only state if hydration fails.
  }
}

function renderAuth() {
  if (state.currentUser?.id) {
    elements.authOverlay.classList.remove("visible");
    elements.userName.textContent = state.currentUser.name;
    return;
  }
  elements.authOverlay.classList.add("visible");
  elements.userName.textContent = "Not signed in";
}

function renderChapterList() {
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
        <span>John ${chapter.id}</span>
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

function getChapterVisibleBlankCount(chapter) {
  return chapter.verses.reduce((count, verse) => (
    count + verse.tokens.filter((token, tokenIndex) => shouldHideToken(verse.tokens, tokenIndex, getDifficulty())).length
  ), 0);
}

function getOverallDifficultyProgress() {
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

function renderOverallProgress() {
  const difficulty = getDifficulty();
  const progress = getOverallDifficultyProgress();
  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  elements.overallProgressLabel.textContent = `${difficultyLabel} overall progress`;
  elements.overallProgressValue.textContent = `${progress.percent}%`;
  elements.overallProgressFill.style.width = `${progress.percent}%`;
}

function renderStats() {
  const chapter = getChapter();
  const chapterSummary = state.summary?.chapters?.find((item) => item.chapterId === chapter.id);
  const totalAttempts = chapterSummary?.attempts ?? 0;
  const accuracy = chapterSummary?.accuracy ?? 0;
  const incorrect = totalAttempts ? 100 - accuracy : 0;
  elements.scopeTitle.textContent = `John ${chapter.id}`;
  elements.stats.innerHTML = [
    ["Difficulty", getDifficulty()],
    ["Visible blanks", getChapterVisibleBlankCount(chapter)],
    ["Solved blanks", getChapterSolvedCount(chapter)],
    ["Attempts", totalAttempts],
    ["Correct / Incorrect", `${accuracy}% / ${incorrect}%`],
  ].map(([label, value]) => `
    <div class="stat">
      <span class="stat-label">${label}</span>
      <strong class="stat-value">${value}</strong>
    </div>
  `).join("");
}

function renderLeaderboard() {
  const difficulty = getDifficulty();
  const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  elements.leaderboardTitle.textContent = `${difficultyLabel} Leaderboard`;

  if (!state.leaderboard.length) {
    elements.leaderboard.innerHTML = "<p class='muted'>No scores yet for this difficulty.</p>";
    return;
  }

  const totalVisible = getOverallDifficultyProgress().visible || 1;
  const previousRank = state.previousRanks[difficulty];

  elements.leaderboard.innerHTML = state.leaderboard.map((row) => {
    let status = "";
    if (row.userId === state.currentUser?.id) {
      if (row.rank === 1) {
        status = "♛";
      } else if (previousRank && row.rank < previousRank) {
        status = "🔥";
      } else if (previousRank && row.rank > previousRank) {
        status = "⬇";
      }
      state.previousRanks[difficulty] = row.rank;
    }
    const percent = Math.round((row.solvedCount / totalVisible) * 100);
    return `
      <article class="leaderboard-row${row.userId === state.currentUser?.id ? " current-user" : ""}">
        <div>
          <div><strong>${row.name}</strong><span class="leaderboard-status">${status}</span></div>
          <div class="leaderboard-rank">Rank #${row.rank}</div>
        </div>
        <div class="chapter-button-meta">${percent}%</div>
      </article>
    `;
  }).join("");

  saveRanks();
}

function renderRecommendations() {
  elements.dbStatus.textContent = state.dbConnected
    ? "Postgres connected"
    : "Database not connected yet";

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
    elements.recommendations.innerHTML = `<p class='muted'>${difficultyDescriptions[difficulty]} Answer a few words and this panel will start recommending chapters and verses to review.</p>`;
    return;
  }

  elements.recommendations.innerHTML = tailoredChapters.map((chapter) => `
    <article class="recommendation-item">
      <strong>John ${chapter.chapterId}</strong>
      <div>${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} completion: ${chapter.completion}%</div>
      <div>Solved blanks: ${chapter.solvedBlanks} / ${chapter.visibleBlanks}</div>
      <div>Start again at verse: ${chapter.firstUnsolvedVerse ?? "Completed"}</div>
    </article>
  `).join("");
}

function buildMetaText(result) {
  return `Right ${result.correctCount} time${result.correctCount === 1 ? "" : "s"} • ${result.correctPercentage}% correct / ${result.incorrectPercentage}% incorrect`;
}

function createAnswerMeta() {
  const meta = document.createElement("span");
  meta.className = "answer-meta";
  meta.textContent = "";
  return meta;
}

function applyProgressToInput(input, meta, progress, displayValue) {
  input.classList.remove("correct", "incorrect");
  input.disabled = false;
  input.placeholder = "";
  if (!progress) {
    if (!input.value) input.value = input.dataset.savedDraft || "";
    meta.className = "answer-meta";
    meta.textContent = "";
    return;
  }
  if (progress.solved) {
    input.value = progress.value;
    input.classList.add("correct");
    input.disabled = true;
    meta.className = "answer-meta correct";
    meta.textContent = progress.metaText || "Correct";
    return;
  }
  input.value = "";
  input.classList.add("incorrect");
  meta.className = "answer-meta incorrect";
  if (progress.hintLevel === 1) {
    input.placeholder = displayValue.charAt(0);
    meta.textContent = `${progress.metaText} • Hint: starts with ${displayValue.charAt(0)}`;
    return;
  }
  if (progress.hintLevel >= 2) {
    input.placeholder = displayValue;
    meta.textContent = `${progress.metaText} • Correct word: ${displayValue}`;
  }
}

async function submitAnswer(input) {
  if (input.disabled || !state.currentUser?.id) return;
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
    meta.className = "answer-meta";
    meta.textContent = "";
    return;
  }

  try {
    const result = await api("/api/attempt", {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUser.id,
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
      applyProgressToInput(input, meta, progress, input.dataset.displayValue);
      input.value = "";
      input.focus();
    }

    await Promise.all([loadSummary(), loadLeaderboard()]);
    render();
  } catch (error) {
    meta.className = "answer-meta incorrect";
    meta.textContent = error.message || "Could not save that answer yet.";
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
  input.setAttribute("aria-label", `John ${chapterId}:${verseId} word`);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAnswer(input);
    }
  });
  input.addEventListener("input", () => setTokenDraft(chapterId, verseId, tokenIndex, input.value.trim()));
  input.addEventListener("blur", () => submitAnswer(input));
  const meta = createAnswerMeta();
  applyProgressToInput(input, meta, getTokenProgress(chapterId, verseId, tokenIndex), token.value);
  wrapper.append(input, meta);
  return wrapper;
}

function renderQuiz() {
  const chapter = getChapter();
  const difficulty = getDifficulty();
  elements.chapterTitle.textContent = `John ${chapter.id}`;
  elements.chapterSummary.textContent = `${difficultyDescriptions[difficulty]} ${chapter.verses.length} verses in this chapter.`;
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
}

function resetCurrentChapter() {
  clearChapterProgress(state.selectedChapterId);
  render();
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
  await Promise.all([hydrateSolvedProgress(), loadLeaderboard()]);
  render();
}

function render() {
  renderAuth();
  if (!state.currentUser?.id) return;
  renderChapterList();
  renderLeaderboard();
  renderRecommendations();
  renderOverallProgress();
  renderStats();
  renderQuiz();
}

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await login(elements.authName.value.trim(), elements.authEmail.value.trim());
  } catch (error) {
    elements.authError.textContent = error.message;
  }
});

elements.signOut.addEventListener("click", signOut);
elements.difficultySelect.addEventListener("change", handleDifficultyChange);
elements.resetChapter.addEventListener("click", resetCurrentChapter);

setInterval(autosaveVisibleDrafts, autosaveIntervalMs);
window.addEventListener("beforeunload", autosaveVisibleDrafts);

const savedDifficulty = localStorage.getItem(difficultyStorageKey);
if (savedDifficulty && difficultyDescriptions[savedDifficulty]) {
  elements.difficultySelect.value = savedDifficulty;
} else {
  elements.difficultySelect.value = "easy";
}

renderAuth();

if (state.currentUser?.id) {
  Promise.all([hydrateSolvedProgress(), loadSummary(), loadLeaderboard()]).finally(render);
}
