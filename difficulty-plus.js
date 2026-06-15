(() => {
  const plusDifficultyBaseById = {
    easy_plus: "easy",
    medium_plus: "medium",
  };

  const plusDifficultyLabels = {
    en: {
      easy_plus: "Easy+",
      medium_plus: "Medium+",
    },
    ko: {
      easy_plus: "쉬움+",
      medium_plus: "보통+",
    },
  };

  const plusDifficultyDescriptions = {
    en: {
      easy_plus: "Easy+ keeps one randomized keyword blank per sentence and never hides Jesus, answered, sir, or you.",
      medium_plus: "Medium+ hides one to two randomized keywords per sentence and never hides Jesus, answered, sir, or you.",
    },
    ko: {
      easy_plus: "쉬움+는 문장마다 무작위 핵심 단어 하나를 빈칸으로 남기며 Jesus, answered, sir, you는 숨기지 않습니다.",
      medium_plus: "보통+은 문장마다 무작위 핵심 단어 하나에서 두 개를 가리며 Jesus, answered, sir, you는 숨기지 않습니다.",
    },
  };

  const protectedWordsByLanguage = {
    en: new Set(["jesus", "answered", "sir", "you"]),
    ko: new Set(),
  };

  const plusHiddenTokenIndexCache = new WeakMap();
  const originalGetDifficultyLabel = getDifficultyLabel;
  const originalGetDifficultyDescription = getDifficultyDescription;
  const originalGetHiddenTokenIndexSet = getHiddenTokenIndexSet;
  const originalShouldHideToken = shouldHideToken;

  function getCurrentLanguage() {
    return document.documentElement.lang === "ko" ? "ko" : "en";
  }

  function isPlusDifficulty(difficulty) {
    return Boolean(plusDifficultyBaseById[difficulty]);
  }

  function getPlusSeed(tokens, difficulty, language) {
    return `${normalizeLanguage(language)}:${difficulty}:${tokens.map((token) => (
      token.type === "word" ? token.normalized : token.value
    )).join("|")}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function shouldProtectToken(token, language) {
    if (token.type !== "word") {
      return false;
    }
    const protectedWords = protectedWordsByLanguage[language] || new Set();
    return protectedWords.has(token.normalized);
  }

  function insertOptionAfter(select, afterValue, optionValue) {
    if (!(select instanceof HTMLSelectElement) || select.querySelector(`option[value="${optionValue}"]`)) {
      return;
    }

    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;

    const anchor = select.querySelector(`option[value="${afterValue}"]`);
    if (anchor?.nextSibling) {
      select.insertBefore(option, anchor.nextSibling);
      return;
    }

    select.append(option);
  }

  function ensurePlusDifficultyOptions() {
    const select = document.querySelector("#difficulty-select");
    insertOptionAfter(select, "easy", "easy_plus");
    insertOptionAfter(select, "medium", "medium_plus");
  }

  function pickPlusIndices(candidateIndices, tokens, difficulty, language) {
    const baseDifficulty = plusDifficultyBaseById[difficulty];
    const limit = getPerSentenceLimit(baseDifficulty, candidateIndices.length);
    if (candidateIndices.length <= limit) {
      return candidateIndices;
    }

    const baseHiddenIndices = originalGetHiddenTokenIndexSet(tokens, baseDifficulty, language);
    const seed = getPlusSeed(tokens, difficulty, language);
    const randomizedSort = (left, right) => (
      hashString(`${seed}:${left}`) - hashString(`${seed}:${right}`)
      || scoreTokenForDifficulty(tokens[right], language) - scoreTokenForDifficulty(tokens[left], language)
      || left - right
    );

    const selected = [...candidateIndices]
      .filter((index) => !baseHiddenIndices.has(index))
      .sort(randomizedSort)
      .slice(0, limit);

    if (selected.length < limit) {
      selected.push(
        ...[...candidateIndices]
          .filter((index) => !selected.includes(index))
          .sort(randomizedSort)
          .slice(0, limit - selected.length)
      );
    }

    return [...new Set(selected)].sort((left, right) => left - right);
  }

  function getPlusHiddenTokenIndexSet(tokens, difficulty, language = getCurrentLanguage()) {
    let tokenCache = plusHiddenTokenIndexCache.get(tokens);
    if (!tokenCache) {
      tokenCache = new Map();
      plusHiddenTokenIndexCache.set(tokens, tokenCache);
    }

    const cacheKey = `${normalizeLanguage(language)}:${difficulty}`;
    if (tokenCache.has(cacheKey)) {
      return tokenCache.get(cacheKey);
    }

    const hiddenIndices = new Set();
    getSentenceSegments(tokens).forEach((segment) => {
      const candidateIndices = segment.filter((index) => {
        const token = tokens[index];
        return isKeywordToken(token, language) && !shouldProtectToken(token, language);
      });

      pickPlusIndices(candidateIndices, tokens, difficulty, language)
        .forEach((index) => hiddenIndices.add(index));
    });

    tokenCache.set(cacheKey, hiddenIndices);
    return hiddenIndices;
  }

  window.getDifficultyLabel = getDifficultyLabel = function patchedGetDifficultyLabel(difficulty) {
    const language = getCurrentLanguage();
    return plusDifficultyLabels[language]?.[difficulty] || originalGetDifficultyLabel(difficulty);
  };

  window.getDifficultyDescription = getDifficultyDescription = function patchedGetDifficultyDescription(difficulty) {
    const language = getCurrentLanguage();
    return plusDifficultyDescriptions[language]?.[difficulty] || originalGetDifficultyDescription(difficulty);
  };

  window.getHiddenTokenIndexSet = getHiddenTokenIndexSet = function patchedGetHiddenTokenIndexSet(tokens, difficulty, language = getCurrentLanguage()) {
    if (!isPlusDifficulty(difficulty)) {
      return originalGetHiddenTokenIndexSet(tokens, difficulty, language);
    }
    return getPlusHiddenTokenIndexSet(tokens, difficulty, language);
  };

  window.shouldHideToken = shouldHideToken = function patchedShouldHideToken(tokens, tokenIndex, difficulty, language = getCurrentLanguage()) {
    if (!isPlusDifficulty(difficulty)) {
      return originalShouldHideToken(tokens, tokenIndex, difficulty, language);
    }
    return getPlusHiddenTokenIndexSet(tokens, difficulty, language).has(tokenIndex);
  };

  function applySavedPlusDifficulty() {
    const select = document.querySelector("#difficulty-select");
    if (!(select instanceof HTMLSelectElement)) {
      return false;
    }

    const savedDifficulty = localStorage.getItem("john-quiz-difficulty-v1");
    if (!isPlusDifficulty(savedDifficulty) || select.value === savedDifficulty) {
      return false;
    }

    select.value = savedDifficulty;
    if (typeof handleDifficultyChange === "function") {
      Promise.resolve(handleDifficultyChange()).catch(() => {
        if (typeof render === "function") {
          render();
        }
      });
      return true;
    }

    return false;
  }

  ensurePlusDifficultyOptions();

  if (typeof renderDifficultyOptions === "function") {
    renderDifficultyOptions();
  }

  if (!applySavedPlusDifficulty() && typeof render === "function") {
    render();
  }
})();
