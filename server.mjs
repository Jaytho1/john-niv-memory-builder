import "dotenv/config";
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const maxJsonBodyBytes = 64 * 1024;

const staticTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

const publicFiles = new Set([
  "/",
  "/index.html",
  "/cross-favicon.png",
  "/styles.css",
  "/script.js",
  "/difficulty-plus.js",
  "/data/john-quiz-data.js",
  "/data/john-quiz-data-ko.js",
  "/data/john-quiz-data.json",
  "/data/john-quiz-data-ko.json",
]);

const memoryAttempts = new Map();
const memorySolvedWords = new Map();
const memoryRewards = new Map();
const memoryRewardAttemptCounts = new Map();
const memoryUsers = new Map();
let nextMemoryUserId = 1;

const rewardTypes = [
  { id: "fire", weight: 40 },
  { id: "target", weight: 30 },
  { id: "scythe", weight: 15 },
  { id: "heart", weight: 10 },
  { id: "golden_apple", weight: 4 },
  { id: "wooden_cross", weight: 1 },
];

const rewardTypeIds = new Set(rewardTypes.map((reward) => reward.id));
const emptyRewardCounts = Object.fromEntries(rewardTypes.map((reward) => [reward.id, 0]));

let pool = null;
let dbConnected = false;

class RequestError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  });
}

async function initDb() {
  if (!pool) {
    return;
  }

  await pool.query(`
    create table if not exists users (
      id bigserial primary key,
      name text not null,
      email text not null unique,
      preferred_language text not null default 'en',
      created_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    alter table users
      add column if not exists preferred_language text not null default 'en';
  `);

  await pool.query(`
    create table if not exists word_attempts (
      id bigserial primary key,
      user_id bigint references users(id),
      language text not null default 'en',
      difficulty text,
      chapter_id integer not null,
      verse_id integer not null,
      token_index integer not null,
      expected_word text not null,
      answer text not null,
      is_correct boolean not null,
      created_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    alter table word_attempts
      add column if not exists user_id bigint references users(id);
  `);
  await pool.query(`
    alter table word_attempts
      add column if not exists language text not null default 'en';
  `);
  await pool.query(`
    alter table word_attempts
      add column if not exists difficulty text;
  `);

  await pool.query(`
    update word_attempts
    set
      language = split_part(difficulty, ':', 1),
      difficulty = split_part(difficulty, ':', 2)
    where difficulty like 'en:%' or difficulty like 'ko:%';
  `);

  await pool.query(`
    create table if not exists solved_words (
      id bigserial primary key,
      user_id bigint not null references users(id),
      language text not null default 'en',
      difficulty text not null,
      chapter_id integer not null,
      verse_id integer not null,
      token_index integer not null,
      expected_word text not null,
      reward_type text,
      created_at timestamptz not null default now(),
      constraint solved_words_user_progress_unique
        unique (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word)
    );
  `);

  await pool.query(`
    alter table solved_words
      add column if not exists language text not null default 'en';
  `);
  await pool.query(`
    alter table solved_words
      add column if not exists reward_type text;
  `);

  await pool.query(`
    create table if not exists collected_rewards (
      id bigserial primary key,
      user_id bigint not null references users(id),
      language text not null default 'en',
      difficulty text not null,
      chapter_id integer not null,
      verse_id integer not null,
      token_index integer not null,
      expected_word text not null,
      reward_type text not null,
      created_at timestamptz not null default now(),
      constraint collected_rewards_user_word_unique
        unique (user_id, language, chapter_id, verse_id, token_index, expected_word)
    );
  `);
  await pool.query(`
    alter table collected_rewards
      add column if not exists language text not null default 'en';
  `);

  await pool.query(`
    update collected_rewards
    set
      language = split_part(difficulty, ':', 1),
      difficulty = split_part(difficulty, ':', 2)
    where difficulty like 'en:%' or difficulty like 'ko:%';
  `);

  await pool.query(`
    update solved_words
    set
      language = split_part(difficulty, ':', 1),
      difficulty = split_part(difficulty, ':', 2)
    where difficulty like 'en:%' or difficulty like 'ko:%';
  `);

  await pool.query(`
    insert into collected_rewards (
      user_id,
      language,
      difficulty,
      chapter_id,
      verse_id,
      token_index,
      expected_word,
      reward_type,
      created_at
    )
    select
      user_id,
      language,
      difficulty,
      chapter_id,
      verse_id,
      token_index,
      expected_word,
      reward_type,
      created_at
    from solved_words
    where reward_type is not null
    on conflict
    do nothing;
  `);

  await pool.query(`
    delete from collected_rewards duplicate_reward
    using collected_rewards kept_reward
    where duplicate_reward.id > kept_reward.id
      and duplicate_reward.user_id = kept_reward.user_id
      and duplicate_reward.language = kept_reward.language
      and duplicate_reward.chapter_id = kept_reward.chapter_id
      and duplicate_reward.verse_id = kept_reward.verse_id
      and duplicate_reward.token_index = kept_reward.token_index
      and duplicate_reward.expected_word = kept_reward.expected_word;
  `);

  await pool.query(`
    do $$
    declare
      old_constraint text;
      existing_constraint text;
    begin
      select tc.constraint_name
      into old_constraint
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public'
        and tc.table_name = 'collected_rewards'
        and tc.constraint_type = 'UNIQUE'
      group by tc.constraint_name
      having array_agg(kcu.column_name::text order by kcu.ordinal_position)
        = array['user_id', 'language', 'difficulty', 'chapter_id', 'verse_id', 'token_index', 'expected_word']
      limit 1;

      if old_constraint is not null then
        execute format('alter table collected_rewards drop constraint %I', old_constraint);
      end if;

      select tc.constraint_name
      into existing_constraint
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public'
        and tc.table_name = 'collected_rewards'
        and tc.constraint_type = 'UNIQUE'
      group by tc.constraint_name
      having array_agg(kcu.column_name::text order by kcu.ordinal_position)
        = array['user_id', 'language', 'chapter_id', 'verse_id', 'token_index', 'expected_word']
      limit 1;

      if existing_constraint is null then
        alter table collected_rewards
          add constraint collected_rewards_user_word_unique
          unique (user_id, language, chapter_id, verse_id, token_index, expected_word);
      end if;
    end $$;
  `);

  await pool.query(`
    do $$
    declare
      existing_constraint text;
    begin
      select tc.constraint_name
      into existing_constraint
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      where tc.table_schema = 'public'
        and tc.table_name = 'solved_words'
        and tc.constraint_type = 'UNIQUE'
      group by tc.constraint_name
      having array_agg(kcu.column_name::text order by kcu.ordinal_position)
        = array['user_id', 'difficulty', 'chapter_id', 'verse_id', 'token_index', 'expected_word']
      limit 1;

      if existing_constraint is not null then
        execute format('alter table solved_words drop constraint %I', existing_constraint);
      end if;

      if not exists (
        select 1
        from information_schema.table_constraints
        where table_schema = 'public'
          and table_name = 'solved_words'
          and constraint_name = 'solved_words_user_progress_unique'
      ) then
        alter table solved_words
          add constraint solved_words_user_progress_unique
          unique (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word);
      end if;
    end $$;
  `);

  await pool.query(`
    create index if not exists word_attempts_reward_lookup_idx
      on word_attempts (user_id, language, chapter_id, verse_id, token_index, expected_word);
  `);

  await pool.query(`
    create index if not exists solved_words_leaderboard_idx
      on solved_words (difficulty, language, user_id);
  `);

  await pool.query(`
    create index if not exists collected_rewards_leaderboard_idx
      on collected_rewards (language, user_id, created_at desc);
  `);

  dbConnected = true;
}

function sendJson(response, statusCode, payload) {
  applySecurityHeaders(response);
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function applySecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
  );
}

async function readJsonBody(request) {
  let raw = "";
  let byteLength = 0;
  for await (const chunk of request) {
    byteLength += chunk.length;
    if (byteLength > maxJsonBodyBytes) {
      throw new RequestError(413, "Request body is too large.");
    }
    raw += chunk;
  }
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestError(400, "Invalid JSON body.");
  }
}

function rememberAttempt(attempt) {
  const key = getAttemptIdentity(attempt);
  const current = memoryAttempts.get(key) || [];
  current.push(attempt);
  memoryAttempts.set(key, current);

  const rewardKey = getRewardIdentity(attempt);
  memoryRewardAttemptCounts.set(rewardKey, (memoryRewardAttemptCounts.get(rewardKey) || 0) + 1);
}

function rememberSolvedWord(attempt) {
  memorySolvedWords.set(getAttemptIdentity(attempt), {
    ...attempt,
    rewardType: normalizeRewardType(attempt.rewardType),
  });
}

function rememberReward(attempt) {
  const key = getRewardIdentity(attempt);
  const existingReward = memoryRewards.get(key);
  if (existingReward) {
    return existingReward;
  }

  if (!normalizeRewardType(attempt.rewardType)) {
    return null;
  }

  const reward = {
    ...attempt,
    rewardType: normalizeRewardType(attempt.rewardType),
    createdAt: attempt.createdAt,
  };
  memoryRewards.set(key, reward);
  return reward;
}

function getMemoryAttemptCountForReward(attempt) {
  return memoryRewardAttemptCounts.get(getRewardIdentity(attempt)) || 0;
}

function buildAttemptStats(correctCount, attemptCount) {
  const correctPercentage = attemptCount
    ? Math.round((correctCount / attemptCount) * 100)
    : 0;

  return {
    correctCount,
    attemptCount,
    correctPercentage,
    incorrectPercentage: attemptCount ? 100 - correctPercentage : 0,
  };
}

function normalizeRewardType(value) {
  const rewardType = String(value || "");
  return rewardTypeIds.has(rewardType) ? rewardType : null;
}

function createRewardCounts() {
  return { ...emptyRewardCounts };
}

function pickRewardType() {
  const totalWeight = rewardTypes.reduce((total, reward) => total + reward.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const reward of rewardTypes) {
    roll -= reward.weight;
    if (roll < 0) {
      return reward.id;
    }
  }

  return rewardTypes[0].id;
}

function shouldAwardReward(correctCount, attemptCount, isCorrect) {
  return Boolean(isCorrect && attemptCount === 1 && correctCount === 1);
}

function normalizeLanguage(value) {
  return value === "ko" ? "ko" : "en";
}

function toClientUser(user) {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    preferredLanguage: normalizeLanguage(user.preferredLanguage ?? user.preferred_language),
  };
}

function getAttemptIdentity(attempt) {
  return [
    attempt.userId ?? "guest",
    attempt.language ?? "en",
    attempt.difficulty ?? "",
    attempt.chapterId,
    attempt.verseId,
    attempt.tokenIndex,
    attempt.expectedWord,
  ].join(":");
}

function getRewardIdentity(attempt) {
  return [
    attempt.userId ?? "guest",
    attempt.language ?? "en",
    attempt.chapterId,
    attempt.verseId,
    attempt.tokenIndex,
    attempt.expectedWord,
  ].join(":");
}

function getOrCreateMemoryUser(name, email, preferredLanguage) {
  const existing = memoryUsers.get(email);
  if (existing) {
    existing.name = name;
    existing.preferredLanguage = preferredLanguage;
    return existing;
  }

  const user = {
    id: nextMemoryUserId,
    name,
    email,
    preferredLanguage,
  };
  nextMemoryUserId += 1;
  memoryUsers.set(email, user);
  return user;
}

function getMemorySummary(userId, difficulty = "", language = "en") {
  const chapterStats = new Map();

  for (const attempts of memoryAttempts.values()) {
    const matchingAttempts = attempts.filter((attempt) => {
      if (userId && attempt.userId !== userId) {
        return false;
      }
      if (difficulty && attempt.difficulty !== difficulty) {
        return false;
      }
      return (attempt.language || "en") === language;
    });

    if (!matchingAttempts.length) {
      continue;
    }

    const { chapterId, verseId } = matchingAttempts[0];
    const stats = chapterStats.get(chapterId) || {
      chapterId,
      attempts: 0,
      correct: 0,
      correctWords: new Set(),
      verseStats: new Map(),
    };

    matchingAttempts.forEach((attempt) => {
      const solvedKey = getAttemptIdentity(attempt);
      stats.attempts += 1;
      if (attempt.isCorrect) {
        stats.correct += 1;
        stats.correctWords.add(solvedKey);
      }

      const verse = stats.verseStats.get(verseId) || { verseId, attempts: 0, correct: 0 };
      verse.attempts += 1;
      if (attempt.isCorrect) {
        verse.correct += 1;
      }
      stats.verseStats.set(verseId, verse);
    });

    chapterStats.set(chapterId, stats);
  }

  return [...chapterStats.values()]
    .map((stats) => {
      const hardestVerseEntry = [...stats.verseStats.values()]
        .filter((verse) => verse.attempts > 0)
        .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts || b.attempts - a.attempts)[0];

      return {
        chapterId: stats.chapterId,
        attempts: stats.attempts,
        accuracy: stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0,
        correctUniqueWords: stats.correctWords.size,
        hardestVerse: hardestVerseEntry?.verseId ?? null,
      };
    })
    .sort((a, b) => a.chapterId - b.chapterId);
}

async function getDbSummary(userId, difficulty = "", language = "en") {
  const filters = ["user_id = $1"];
  const params = [userId];

  params.push(language);
  filters.push(`language = $${params.length}`);

  if (difficulty) {
    params.push(difficulty);
    filters.push(`difficulty = $${params.length}`);
  }

  const whereClause = filters.join(" and ");

  const chapterQuery = await pool.query(`
    select
      chapter_id,
      count(*)::int as attempts,
      count(*) filter (where is_correct)::int as correct,
      count(distinct concat(chapter_id, ':', verse_id, ':', token_index, ':', expected_word))
        filter (where is_correct)::int as correct_unique_words
    from word_attempts
    where ${whereClause}
    group by chapter_id
    order by chapter_id;
  `, params);

  const hardestVerseQuery = await pool.query(`
    with verse_stats as (
      select
        chapter_id,
        verse_id,
        count(*)::int as attempts,
        count(*) filter (where is_correct)::int as correct,
        row_number() over (
          partition by chapter_id
          order by
            (count(*) filter (where is_correct))::float / nullif(count(*), 0) asc,
            count(*) desc,
            verse_id asc
        ) as ranking
      from word_attempts
      where ${whereClause}
      group by chapter_id, verse_id
    )
    select chapter_id, verse_id
    from verse_stats
    where ranking = 1;
  `, params);

  const hardestVerseByChapter = new Map(
    hardestVerseQuery.rows.map((row) => [Number(row.chapter_id), Number(row.verse_id)])
  );

  return chapterQuery.rows.map((row) => ({
    chapterId: Number(row.chapter_id),
    attempts: Number(row.attempts),
    accuracy: row.attempts ? Math.round((Number(row.correct) / Number(row.attempts)) * 100) : 0,
    correctUniqueWords: Number(row.correct_unique_words),
    hardestVerse: hardestVerseByChapter.get(Number(row.chapter_id)) ?? null,
  }));
}

function removeMemoryChapterProgress(userId, difficulty, language, chapterId) {
  for (const [key, solvedWord] of memorySolvedWords.entries()) {
    if (
      solvedWord.userId === userId
      && solvedWord.difficulty === difficulty
      && (solvedWord.language || "en") === language
      && solvedWord.chapterId === chapterId
    ) {
      memorySolvedWords.delete(key);
    }
  }
}

function getMemorySolvedProgress(userId, difficulty, language) {
  const rows = [];

  for (const solvedWord of memorySolvedWords.values()) {
    if (
      solvedWord.userId !== userId
      || solvedWord.difficulty !== difficulty
      || (solvedWord.language || "en") !== language
    ) {
      continue;
    }

    const reward = memoryRewards.get(getRewardIdentity(solvedWord));
    rows.push({
      chapterId: solvedWord.chapterId,
      verseId: solvedWord.verseId,
      tokenIndex: solvedWord.tokenIndex,
      expectedWord: solvedWord.expectedWord,
      rewardType: normalizeRewardType(reward?.rewardType),
      collectedAt: reward?.createdAt || null,
    });
  }

  return rows.sort((left, right) => (
    left.chapterId - right.chapterId
    || left.verseId - right.verseId
    || left.tokenIndex - right.tokenIndex
  ));
}

function getMemoryLeaderboard(difficulty) {
  const userScores = new Map();

  const getUserScore = (userId) => {
    const user = [...memoryUsers.values()].find((item) => item.id === userId);
    if (!user) {
      return null;
    }

    const userScore = userScores.get(userId) || {
      userId,
      name: user.name,
      languages: new Map(),
    };
    userScores.set(userId, userScore);
    return userScore;
  };

  const getLanguageScore = (userScore, language) => {
    const normalizedLanguage = normalizeLanguage(language);
    const languageScore = userScore.languages.get(normalizedLanguage) || {
      solved: new Set(),
      rewardKeys: new Set(),
      rewardCounts: createRewardCounts(),
      latestRewardType: null,
      latestCollectedAt: null,
    };
    userScore.languages.set(normalizedLanguage, languageScore);
    return languageScore;
  };

  for (const solvedWord of memorySolvedWords.values()) {
    if (
      solvedWord.difficulty !== difficulty
      || !solvedWord.userId
    ) {
      continue;
    }

    const userScore = getUserScore(solvedWord.userId);
    if (!userScore) {
      continue;
    }

    const languageScore = getLanguageScore(userScore, solvedWord.language || "en");
    languageScore.solved.add(getAttemptIdentity(solvedWord));
  }

  for (const reward of memoryRewards.values()) {
    if (!reward.userId) {
      continue;
    }

    const userScore = getUserScore(reward.userId);
    if (!userScore) {
      continue;
    }

    const languageScore = getLanguageScore(userScore, reward.language || "en");
    const rewardKey = getRewardIdentity(reward);
    if (!languageScore.rewardKeys.has(rewardKey)) {
      languageScore.rewardKeys.add(rewardKey);
      const rewardType = normalizeRewardType(reward.rewardType);
      if (rewardType) {
        languageScore.rewardCounts[rewardType] += 1;
      }
    }
    const rewardTimestamp = Date.parse(reward.createdAt || "") || 0;
    const latestTimestamp = Date.parse(languageScore.latestCollectedAt || "") || 0;
    if (rewardTimestamp >= latestTimestamp) {
      languageScore.latestRewardType = normalizeRewardType(reward.rewardType);
      languageScore.latestCollectedAt = reward.createdAt || null;
    }
  }

  return [...userScores.values()].map((row) => ({
    userId: row.userId,
    name: row.name,
    scores: [...row.languages.entries()].map(([language, score]) => ({
      language,
      solvedCount: score.solved.size,
      rewardCounts: score.rewardCounts,
      latestRewardType: score.latestRewardType,
      latestCollectedAt: score.latestCollectedAt,
    })),
  }));
}

async function handleLogin(request, response) {
  const body = await readJsonBody(request);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const preferredLanguage = normalizeLanguage(body.preferredLanguage);

  if (!name || !email) {
    sendJson(response, 400, { error: "Name and email are required." });
    return;
  }

  if (!(pool && dbConnected)) {
    const user = getOrCreateMemoryUser(name, email, preferredLanguage);
    sendJson(response, 200, { user: toClientUser(user) });
    return;
  }

  const existing = await pool.query(
    `select id, name, email, preferred_language from users where email = $1 limit 1;`,
    [email]
  );

  if (existing.rows.length) {
    const existingUser = existing.rows[0];
    if (existingUser.name !== name || existingUser.preferred_language !== preferredLanguage) {
      await pool.query(
        `
          update users
          set
            name = $1,
            preferred_language = $2
          where email = $3;
        `,
        [name, preferredLanguage, email]
      );
    }

    sendJson(response, 200, {
      user: toClientUser({
        id: existingUser.id,
        name,
        email: existingUser.email,
        preferred_language: preferredLanguage,
      }),
    });
    return;
  }

  const inserted = await pool.query(
    `
      insert into users (name, email, preferred_language)
      values ($1, $2, $3)
      returning id, name, email, preferred_language;
    `,
    [name, email, preferredLanguage]
  );

  sendJson(response, 200, {
    user: toClientUser(inserted.rows[0]),
  });
}

async function handleUserPreferences(request, response) {
  const body = await readJsonBody(request);
  const userId = Number(body.userId);
  const preferredLanguage = normalizeLanguage(body.preferredLanguage);
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!userId) {
    sendJson(response, 400, { error: "Missing userId." });
    return;
  }

  if (!(pool && dbConnected)) {
    const user = [...memoryUsers.values()].find((item) => item.id === userId);
    if (!user) {
      sendJson(response, 404, { error: "User not found." });
      return;
    }
    if (name) {
      user.name = name;
    }
    user.preferredLanguage = preferredLanguage;
    sendJson(response, 200, { user: toClientUser(user) });
    return;
  }

  const updated = await pool.query(
    `
      update users
      set
        name = coalesce(nullif($2, ''), name),
        preferred_language = $3
      where id = $1
      returning id, name, email, preferred_language;
    `,
    [userId, name, preferredLanguage]
  );

  if (!updated.rows.length) {
    sendJson(response, 404, { error: "User not found." });
    return;
  }

  sendJson(response, 200, { user: toClientUser(updated.rows[0]) });
}

async function handleUserProgress(request, response, url) {
  const userId = Number(url.searchParams.get("userId"));
  const difficulty = String(url.searchParams.get("difficulty") || "");
  const language = normalizeLanguage(url.searchParams.get("language"));

  if (!userId || !difficulty) {
    sendJson(response, 400, { error: "Missing userId or difficulty." });
    return;
  }

  if (!(pool && dbConnected)) {
    sendJson(response, 200, {
      rows: getMemorySolvedProgress(userId, difficulty, language),
    });
    return;
  }

  const result = await pool.query(
    `
      select
        solved_words.chapter_id,
        solved_words.verse_id,
        solved_words.token_index,
        solved_words.expected_word,
        collected_rewards.reward_type,
        collected_rewards.created_at as collected_at
      from solved_words
      left join collected_rewards
        on collected_rewards.user_id = solved_words.user_id
       and collected_rewards.language = solved_words.language
       and collected_rewards.chapter_id = solved_words.chapter_id
       and collected_rewards.verse_id = solved_words.verse_id
       and collected_rewards.token_index = solved_words.token_index
       and collected_rewards.expected_word = solved_words.expected_word
      where solved_words.user_id = $1
        and solved_words.language = $2
        and solved_words.difficulty = $3
      order by solved_words.chapter_id, solved_words.verse_id, solved_words.token_index;
    `,
    [userId, language, difficulty]
  );

  sendJson(response, 200, {
    rows: result.rows.map((row) => ({
      chapterId: Number(row.chapter_id),
      verseId: Number(row.verse_id),
      tokenIndex: Number(row.token_index),
      expectedWord: row.expected_word,
      rewardType: normalizeRewardType(row.reward_type),
      collectedAt: row.collected_at?.toISOString?.() || row.collected_at,
    })),
  });
}

async function handleLeaderboard(response, url) {
  const difficulty = String(url.searchParams.get("difficulty") || "");
  const currentUserId = Number(url.searchParams.get("userId")) || 0;
  if (!difficulty) {
    sendJson(response, 400, { error: "Missing difficulty." });
    return;
  }

  if (!(pool && dbConnected)) {
    sendJson(response, 200, {
      db: {
        configured: Boolean(process.env.DATABASE_URL),
        connected: dbConnected,
      },
      rows: getMemoryLeaderboard(difficulty),
    });
    return;
  }

  const result = await pool.query(
    `
      with solved_stats as (
        select
          user_id,
          language,
          count(id)::int as solved_count
        from solved_words
        where difficulty = $1
          and language in ('en', 'ko')
        group by user_id, language
      ),
      reward_stats as (
        select
          user_id,
          language,
          count(id)::int as reward_total,
          count(id) filter (where reward_type = 'fire')::int as fire_count,
          count(id) filter (where reward_type = 'target')::int as target_count,
          count(id) filter (where reward_type = 'scythe')::int as scythe_count,
          count(id) filter (where reward_type = 'heart')::int as heart_count,
          count(id) filter (where reward_type = 'golden_apple')::int as golden_apple_count,
          count(id) filter (where reward_type = 'wooden_cross')::int as wooden_cross_count,
          (array_agg(reward_type order by created_at desc, id desc))[1] as latest_reward_type,
          max(created_at) as latest_collected_at
        from collected_rewards
        where language in ('en', 'ko')
        group by user_id, language
      ),
      combined_stats as (
        select
          coalesce(solved_stats.user_id, reward_stats.user_id) as user_id,
          coalesce(solved_stats.language, reward_stats.language) as language,
          coalesce(solved_stats.solved_count, 0)::int as solved_count,
          coalesce(reward_stats.reward_total, 0)::int as reward_total,
          coalesce(reward_stats.fire_count, 0)::int as fire_count,
          coalesce(reward_stats.target_count, 0)::int as target_count,
          coalesce(reward_stats.scythe_count, 0)::int as scythe_count,
          coalesce(reward_stats.heart_count, 0)::int as heart_count,
          coalesce(reward_stats.golden_apple_count, 0)::int as golden_apple_count,
          coalesce(reward_stats.wooden_cross_count, 0)::int as wooden_cross_count,
          reward_stats.latest_reward_type,
          reward_stats.latest_collected_at
        from solved_stats
        full join reward_stats
          on reward_stats.user_id = solved_stats.user_id
         and reward_stats.language = solved_stats.language
      )
      select
        users.id as user_id,
        users.name,
        combined_stats.language,
        combined_stats.solved_count,
        combined_stats.fire_count,
        combined_stats.target_count,
        combined_stats.scythe_count,
        combined_stats.heart_count,
        combined_stats.golden_apple_count,
        combined_stats.wooden_cross_count,
        combined_stats.latest_reward_type,
        combined_stats.latest_collected_at
      from users
      join combined_stats
        on combined_stats.user_id = users.id
      where combined_stats.solved_count > 0
         or combined_stats.reward_total > 0
         or users.id = $2
      order by users.name asc, combined_stats.language asc;
    `,
    [difficulty, currentUserId]
  );

  const rowsByUser = new Map();
  result.rows.forEach((row) => {
    const userId = Number(row.user_id);
    const userRow = rowsByUser.get(userId) || {
      userId,
      name: row.name,
      scores: [],
    };
    userRow.scores.push({
      language: normalizeLanguage(row.language),
      solvedCount: Number(row.solved_count),
      rewardCounts: {
        fire: Number(row.fire_count),
        target: Number(row.target_count),
        scythe: Number(row.scythe_count),
        heart: Number(row.heart_count),
        golden_apple: Number(row.golden_apple_count),
        wooden_cross: Number(row.wooden_cross_count),
      },
      latestRewardType: normalizeRewardType(row.latest_reward_type),
      latestCollectedAt: row.latest_collected_at?.toISOString?.() || row.latest_collected_at,
    });
    rowsByUser.set(userId, userRow);
  });

  sendJson(response, 200, {
    db: {
      configured: Boolean(process.env.DATABASE_URL),
      connected: dbConnected,
    },
    rows: [...rowsByUser.values()],
  });
}

async function handleAttempt(request, response) {
  const body = await readJsonBody(request);
  const userId = Number(body.userId);
  const language = normalizeLanguage(body.language);
  const difficulty = String(body.difficulty || "").trim().toLowerCase();
  const expectedWord = String(body.expectedWord || "").trim().toLowerCase();
  const answer = String(body.answer || "").trim().toLowerCase();

  if (!userId || !difficulty || !expectedWord) {
    sendJson(response, 400, { error: "Missing userId, difficulty, or expected word." });
    return;
  }

  const attempt = {
    userId,
    language,
    difficulty,
    chapterId: Number(body.chapterId),
    verseId: Number(body.verseId),
    tokenIndex: Number(body.tokenIndex),
    expectedWord,
    answer,
    isCorrect: answer === expectedWord,
    createdAt: new Date().toISOString(),
  };

  if (pool && dbConnected) {
    const userCheck = await pool.query(
      `select id from users where id = $1 limit 1;`,
      [attempt.userId]
    );

    if (!userCheck.rows.length) {
      sendJson(response, 400, {
        error: "Your saved session is out of date. Please sign out and sign in again.",
      });
      return;
    }

    const priorCountResult = await pool.query(
      `
        select count(*)::int as prior_attempt_count
        from word_attempts
        where user_id = $1
          and language = $2
          and chapter_id = $3
          and verse_id = $4
          and token_index = $5
          and expected_word = $6;
      `,
      [
        attempt.userId,
        attempt.language,
        attempt.chapterId,
        attempt.verseId,
        attempt.tokenIndex,
        attempt.expectedWord,
      ]
    );
    const priorAttemptCount = Number(priorCountResult.rows[0].prior_attempt_count);

    await pool.query(
      `
        insert into word_attempts (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word, answer, is_correct)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `,
      [
        attempt.userId,
        attempt.language,
        attempt.difficulty,
        attempt.chapterId,
        attempt.verseId,
        attempt.tokenIndex,
        attempt.expectedWord,
        attempt.answer,
        attempt.isCorrect,
      ]
    );

    const countResult = await pool.query(
      `
        select
          count(*)::int as attempt_count,
          count(*) filter (where is_correct)::int as correct_count
        from word_attempts
        where user_id = $1
          and language = $2
          and difficulty = $3
          and chapter_id = $4
          and verse_id = $5
          and token_index = $6
          and expected_word = $7
      ;
      `,
      [
        attempt.userId,
        attempt.language,
        attempt.difficulty,
        attempt.chapterId,
        attempt.verseId,
        attempt.tokenIndex,
        attempt.expectedWord,
      ]
    );

    const attemptCount = Number(countResult.rows[0].attempt_count);
    const correctCount = Number(countResult.rows[0].correct_count);
    let rewardType = null;
    let rewardAwarded = false;

    if (attempt.isCorrect) {
      const candidateRewardType = priorAttemptCount === 0
        ? pickRewardType()
        : null;
      if (candidateRewardType) {
        const insertRewardResult = await pool.query(
          `
            insert into collected_rewards (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word, reward_type)
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            on conflict (user_id, language, chapter_id, verse_id, token_index, expected_word)
            do nothing
            returning id;
          `,
          [
            attempt.userId,
            attempt.language,
            attempt.difficulty,
            attempt.chapterId,
            attempt.verseId,
            attempt.tokenIndex,
            attempt.expectedWord,
            candidateRewardType,
          ]
        );
        rewardAwarded = insertRewardResult.rows.length > 0;
      }

      const rewardResult = await pool.query(
        `
          select reward_type, created_at
          from collected_rewards
          where user_id = $1
            and language = $2
            and chapter_id = $3
            and verse_id = $4
            and token_index = $5
            and expected_word = $6
          limit 1;
        `,
        [
          attempt.userId,
          attempt.language,
          attempt.chapterId,
          attempt.verseId,
          attempt.tokenIndex,
          attempt.expectedWord,
        ]
      );
      rewardType = normalizeRewardType(rewardResult.rows[0]?.reward_type);
      attempt.createdAt = rewardResult.rows[0]?.created_at?.toISOString?.() || attempt.createdAt;

      await pool.query(
        `
          insert into solved_words (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word, reward_type)
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          on conflict (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word)
          do update set reward_type = coalesce(solved_words.reward_type, excluded.reward_type)
        `,
        [
          attempt.userId,
          attempt.language,
          attempt.difficulty,
          attempt.chapterId,
          attempt.verseId,
          attempt.tokenIndex,
          attempt.expectedWord,
          rewardType,
        ]
      );
    }

    sendJson(response, 200, {
      ...attempt,
      ...buildAttemptStats(correctCount, attemptCount),
      rewardType,
      rewardAwarded,
      collectedAt: attempt.isCorrect ? attempt.createdAt : null,
      dbConnected: true,
    });
    return;
  }

  const key = getAttemptIdentity(attempt);
  const attemptsBeforeCount = getMemoryAttemptCountForReward(attempt);
  const existingReward = memoryRewards.get(getRewardIdentity(attempt));
  let rewardAwarded = false;
  attempt.rewardType = existingReward?.rewardType || (shouldAwardReward(attempt.isCorrect ? 1 : 0, attemptsBeforeCount + 1, attempt.isCorrect)
    ? pickRewardType()
    : null);
  rememberAttempt(attempt);
  let reward = existingReward || null;
  if (attempt.isCorrect) {
    reward = rememberReward(attempt) || existingReward;
    rewardAwarded = Boolean(reward && !existingReward && attemptsBeforeCount === 0);
    attempt.rewardType = normalizeRewardType(reward?.rewardType);
    attempt.createdAt = reward?.createdAt || attempt.createdAt;
    rememberSolvedWord(attempt);
  }
  const attempts = memoryAttempts.get(key) || [];
  const correctCount = attempts.filter((item) => item.isCorrect).length;

  sendJson(response, 200, {
    ...attempt,
    ...buildAttemptStats(correctCount, attempts.length),
    rewardType: normalizeRewardType(attempt.rewardType),
    rewardAwarded,
    collectedAt: attempt.isCorrect ? reward?.createdAt || null : null,
    dbConnected: false,
  });
}

async function handleChapterReset(request, response) {
  const body = await readJsonBody(request);
  const userId = Number(body.userId);
  const chapterId = Number(body.chapterId);
  const difficulty = String(body.difficulty || "").trim().toLowerCase();
  const language = normalizeLanguage(body.language);

  if (!userId || !chapterId || !difficulty) {
    sendJson(response, 400, { error: "Missing userId, chapterId, or difficulty." });
    return;
  }

  if (pool && dbConnected) {
    await pool.query(
      `
        delete from solved_words
        where user_id = $1
          and language = $2
          and difficulty = $3
          and chapter_id = $4;
      `,
      [userId, language, difficulty, chapterId]
    );

    sendJson(response, 200, { ok: true, dbConnected: true });
    return;
  }

  removeMemoryChapterProgress(userId, difficulty, language, chapterId);
  sendJson(response, 200, { ok: true, dbConnected: false });
}

async function handleSummary(request, response, url) {
  const userId = Number(url.searchParams.get("userId"));
  const difficulty = String(url.searchParams.get("difficulty") || "");
  const language = normalizeLanguage(url.searchParams.get("language"));
  const chapters = pool && dbConnected && userId
    ? await getDbSummary(userId, difficulty, language)
    : getMemorySummary(userId, difficulty, language);

  const troubleChapters = [...chapters]
    .filter((chapter) => chapter.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5);

  sendJson(response, 200, {
    db: {
      configured: Boolean(process.env.DATABASE_URL),
      connected: dbConnected,
    },
    chapters,
    troubleChapters,
  });
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestPath = url.pathname === "/" ? "/" : url.pathname;

  if (!publicFiles.has(requestPath)) {
    applySecurityHeaders(response);
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const safePath = path.join(__dirname, relativePath);

  if (!existsSync(safePath)) {
    applySecurityHeaders(response);
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const contentType = staticTypes[path.extname(safePath)] || "text/plain; charset=utf-8";
  applySecurityHeaders(response);
  response.writeHead(200, { "Content-Type": contentType });
  createReadStream(safePath).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/api/login") {
      await handleLogin(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/user-preferences") {
      await handleUserPreferences(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/user-progress") {
      await handleUserProgress(request, response, url);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      await handleLeaderboard(response, url);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/progress/summary") {
      await handleSummary(request, response, url);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reset-chapter") {
      await handleChapterReset(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        ok: true,
        db: {
          configured: Boolean(process.env.DATABASE_URL),
          connected: dbConnected,
        },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/attempt") {
      await handleAttempt(request, response);
      return;
    }

    serveStatic(request, response);
  } catch (error) {
    const statusCode = error instanceof RequestError ? error.statusCode : 500;
    sendJson(response, statusCode, {
      error: error instanceof RequestError ? error.message : "Server error",
      detail: error instanceof RequestError ? undefined : error instanceof Error ? error.message : String(error),
    });
  }
});

initDb()
  .catch((error) => {
    dbConnected = false;
    console.error("Database init failed:", error.message);
    console.warn("Continuing in local-only mode. Progress and leaderboard data will not persist across restarts until PostgreSQL is available.");
  })
  .finally(() => {
    server.listen(PORT, HOST, () => {
      console.log(`John memory app running on http://${HOST}:${PORT}`);
    });
  });
