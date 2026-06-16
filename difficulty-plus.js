(() => {
  const plusDifficultyBaseById = {
    easy_plus: "easy",
    medium_plus: "medium",
    hard_plus: "medium",
  };

  const plusDifficultyLabels = {
    en: {
      easy_plus: "Easy+",
      medium_plus: "Medium+",
      hard_plus: "Hard+",
    },
    ko: {
      easy_plus: "쉬움+",
      medium_plus: "보통+",
      hard_plus: "어려움+",
    },
  };

  const plusDifficultyDescriptions = {
    en: {
      easy_plus: "Easy+ keeps up to one randomized priority keyword blank per sentence and never hides Jesus, answered, sir, or you.",
      medium_plus: "Medium+ hides up to two non-adjacent randomized priority keywords per sentence and never hides Jesus, answered, sir, or you.",
      hard_plus: "Hard+ uses Medium+ rules with about 30% more non-adjacent priority blanks.",
    },
    ko: {
      easy_plus: "쉬움+는 문장마다 무작위 우선 핵심 단어를 최대 하나 빈칸으로 남기며 Jesus, answered, sir, you는 숨기지 않습니다.",
      medium_plus: "보통+은 문장마다 서로 붙지 않은 무작위 우선 핵심 단어를 최대 두 개 가리며 Jesus, answered, sir, you는 숨기지 않습니다.",
      hard_plus: "어려움+은 보통+ 규칙을 사용하되 서로 붙지 않은 우선 핵심 빈칸을 약 30% 더 가립니다.",
    },
  };

  const protectedWordsByLanguage = {
    en: new Set(["jesus", "answered", "sir", "you"]),
    ko: new Set(),
  };

  const plusBlockedWordsByLanguage = {
    en: new Set(["for", "had", "however", "see", "since", "therefore", "yet"]),
    ko: new Set(),
  };

  const plusPriorityAdditionsByLanguage = {
    en: new Set([
      "aloes", "answer", "baptize", "baptized", "baptizing", "blessing",
      "blind", "branches", "confess", "desert", "dwelling", "false", "flesh",
      "garden", "gate", "linen", "magdalene", "malchus", "myrrh", "nicodemus",
      "official", "one", "own", "receive", "received", "servant", "soldiers",
      "surpassed", "thongs", "tomb", "wedding", "wine",
    ]),
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

  function isPriorityKeywordToken(token, language) {
    if (!isKeywordToken(token, language)) {
      return false;
    }

    const blockedWords = plusBlockedWordsByLanguage[language] || new Set();
    if (blockedWords.has(token.normalized)) {
      return false;
    }

    const priorityKeywords = priorityKeywordsByLanguage[language] || new Set();
    const plusPriorityAdditions = plusPriorityAdditionsByLanguage[language] || new Set();
    return priorityKeywords.has(token.normalized) || plusPriorityAdditions.has(token.normalized);
  }

  function isFallbackPlusKeywordToken(token, language) {
    if (!isKeywordToken(token, language)) {
      return false;
    }

    const blockedWords = plusBlockedWordsByLanguage[language] || new Set();
    return !blockedWords.has(token.normalized);
  }

  function hasOnlySpaceBetweenTokens(tokens, leftIndex, rightIndex) {
    for (let index = leftIndex + 1; index < rightIndex; index += 1) {
      if (tokens[index]?.type !== "space") {
        return false;
      }
    }
    return true;
  }

  function wouldCreateAdjacentBlank(tokens, selectedIndices, candidateIndex) {
    return selectedIndices.some((selectedIndex) => {
      const leftIndex = Math.min(selectedIndex, candidateIndex);
      const rightIndex = Math.max(selectedIndex, candidateIndex);
      return hasOnlySpaceBetweenTokens(tokens, leftIndex, rightIndex);
    });
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
    insertOptionAfter(select, "medium_plus", "hard_plus");
  }

  function shouldAvoidAdjacentBlanks(difficulty) {
    return difficulty === "medium_plus" || difficulty === "hard_plus";
  }

  function pickPlusIndices(candidateIndices, tokens, difficulty, language) {
    const baseDifficulty = plusDifficultyBaseById[difficulty];
    const limit = getPerSentenceLimit(baseDifficulty, candidateIndices.length);

    const baseHiddenIndices = originalGetHiddenTokenIndexSet(tokens, baseDifficulty, language);
    const seed = getPlusSeed(tokens, difficulty, language);
    const randomizedSort = (left, right) => (
      hashString(`${seed}:${left}`) - hashString(`${seed}:${right}`)
      || scoreTokenForDifficulty(tokens[right], language) - scoreTokenForDifficulty(tokens[left], language)
      || left - right
    );

    const preferredCandidates = [...candidateIndices]
      .filter((index) => !baseHiddenIndices.has(index))
      .sort(randomizedSort);
    const fallbackCandidates = [...candidateIndices]
      .filter((index) => baseHiddenIndices.has(index))
      .sort(randomizedSort);
    const selected = [];

    for (const candidateIndex of [...preferredCandidates, ...fallbackCandidates]) {
      if (selected.length >= limit) {
        break;
      }

      if (shouldAvoidAdjacentBlanks(difficulty) && wouldCreateAdjacentBlank(tokens, selected, candidateIndex)) {
        continue;
      }

      selected.push(candidateIndex);
    }

    return [...new Set(selected)].sort((left, right) => left - right);
  }

  function pickAdditionalPlusIndices(candidateIndices, tokens, difficulty, language, selectedIndices, targetCount) {
    if (selectedIndices.length >= targetCount) {
      return selectedIndices;
    }

    const selected = [...selectedIndices];
    const seed = getPlusSeed(tokens, difficulty, language);
    const randomizedSort = (left, right) => (
      hashString(`${seed}:extra:${left}`) - hashString(`${seed}:extra:${right}`)
      || scoreTokenForDifficulty(tokens[right], language) - scoreTokenForDifficulty(tokens[left], language)
      || left - right
    );

    for (const candidateIndex of [...candidateIndices].sort(randomizedSort)) {
      if (selected.length >= targetCount) {
        break;
      }

      if (selected.includes(candidateIndex)) {
        continue;
      }

      if (shouldAvoidAdjacentBlanks(difficulty) && wouldCreateAdjacentBlank(tokens, selected, candidateIndex)) {
        continue;
      }

      selected.push(candidateIndex);
    }

    return selected.sort((left, right) => left - right);
  }

  function getHardPlusTargetCount(tokens, selectedCount, candidateCount, difficulty, language) {
    if (difficulty !== "hard_plus" || selectedCount <= 0) {
      return selectedCount;
    }

    const exactExtraCount = selectedCount * 0.3;
    const guaranteedExtraCount = Math.floor(exactExtraCount);
    const fractionalExtraCount = exactExtraCount - guaranteedExtraCount;
    const fractionalRoll = hashString(`${getPlusSeed(tokens, difficulty, language)}:thirty-percent`) / 0x100000000;
    const extraCount = guaranteedExtraCount + (fractionalRoll < fractionalExtraCount ? 1 : 0);
    return Math.min(candidateCount, selectedCount + extraCount);
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
    const allCandidateIndices = [];
    getSentenceSegments(tokens).forEach((segment) => {
      const candidateIndices = segment.filter((index) => {
        const token = tokens[index];
        return isPriorityKeywordToken(token, language) && !shouldProtectToken(token, language);
      });
      allCandidateIndices.push(...candidateIndices);

      pickPlusIndices(candidateIndices, tokens, difficulty, language)
        .forEach((index) => hiddenIndices.add(index));
    });

    const selectedIndices = [...hiddenIndices];
    const fallbackCandidateIndices = getSentenceSegments(tokens)
      .flatMap((segment) => segment.filter((index) => {
        const token = tokens[index];
        return isFallbackPlusKeywordToken(token, language) && !shouldProtectToken(token, language);
      }));
    const minimumCandidateIndices = allCandidateIndices.length ? allCandidateIndices : fallbackCandidateIndices;
    if (!selectedIndices.length && minimumCandidateIndices.length) {
      pickAdditionalPlusIndices(minimumCandidateIndices, tokens, difficulty, language, selectedIndices, 1)
        .forEach((index) => hiddenIndices.add(index));
    }

    if (difficulty === "hard_plus" && fallbackCandidateIndices.length) {
      const targetCount = getHardPlusTargetCount(
        tokens,
        hiddenIndices.size,
        fallbackCandidateIndices.length,
        difficulty,
        language
      );
      pickAdditionalPlusIndices(fallbackCandidateIndices, tokens, difficulty, language, [...hiddenIndices], targetCount)
        .forEach((index) => hiddenIndices.add(index));
    }

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
