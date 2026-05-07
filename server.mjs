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
  "/data/john-quiz-data.js",
  "/data/john-quiz-data-ko.js",
]);

const memoryAttempts = new Map();
const memoryUsers = new Map();
let nextMemoryUserId = 1;

let pool = null;
let dbConnected = false;

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
    update solved_words
    set
      language = split_part(difficulty, ':', 1),
      difficulty = split_part(difficulty, ':', 2)
    where difficulty like 'en:%' or difficulty like 'ko:%';
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
}

async function readJsonBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}

function rememberAttempt(attempt) {
  const key = getAttemptIdentity(attempt);
  const current = memoryAttempts.get(key) || [];
  current.push(attempt);
  memoryAttempts.set(key, current);
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

function normalizeLanguage(value) {
  return value === "ko" ? "ko" : "en";
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
  for (const [key, attempts] of memoryAttempts.entries()) {
    const remaining = attempts.filter((attempt) => !(
      attempt.userId === userId
      && attempt.difficulty === difficulty
      && (attempt.language || "en") === language
      && attempt.chapterId === chapterId
    ));

    if (remaining.length) {
      memoryAttempts.set(key, remaining);
    } else {
      memoryAttempts.delete(key);
    }
  }
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
    sendJson(response, 200, { user });
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
          set name = $1, preferred_language = $2
          where email = $3;
        `,
        [name, preferredLanguage, email]
      );
    }

    sendJson(response, 200, { user: {
      id: Number(existingUser.id),
      name,
      email: existingUser.email,
      preferredLanguage,
    } });
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

  sendJson(response, 200, { user: {
    id: Number(inserted.rows[0].id),
    name: inserted.rows[0].name,
    email: inserted.rows[0].email,
    preferredLanguage: inserted.rows[0].preferred_language,
  } });
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
    sendJson(response, 200, { user });
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

  sendJson(response, 200, { user: {
    id: Number(updated.rows[0].id),
    name: updated.rows[0].name,
    email: updated.rows[0].email,
    preferredLanguage: updated.rows[0].preferred_language,
  } });
}

async function handleUserProgress(request, response, url) {
  const userId = Number(url.searchParams.get("userId"));
  const difficulty = String(url.searchParams.get("difficulty") || "");
  const language = normalizeLanguage(url.searchParams.get("language"));

  if (!userId || !difficulty) {
    sendJson(response, 400, { error: "Missing userId or difficulty." });
    return;
  }

  const result = await pool.query(
    `
      select chapter_id, verse_id, token_index, expected_word
      from solved_words
      where user_id = $1 and language = $2 and difficulty = $3
      order by chapter_id, verse_id, token_index;
    `,
    [userId, language, difficulty]
  );

  sendJson(response, 200, {
    rows: result.rows.map((row) => ({
      chapterId: Number(row.chapter_id),
      verseId: Number(row.verse_id),
      tokenIndex: Number(row.token_index),
      expectedWord: row.expected_word,
    })),
  });
}

async function handleLeaderboard(response, url) {
  const difficulty = String(url.searchParams.get("difficulty") || "");
  const language = normalizeLanguage(url.searchParams.get("language"));
  if (!difficulty) {
    sendJson(response, 400, { error: "Missing difficulty." });
    return;
  }

  const result = await pool.query(
    `
      with ranked as (
        select
          users.id as user_id,
          users.name,
          count(solved_words.id)::int as solved_count,
          dense_rank() over (order by count(solved_words.id) desc, users.name asc) as rank
        from users
        left join solved_words
          on solved_words.user_id = users.id
         and solved_words.language = $1
         and solved_words.difficulty = $2
        group by users.id, users.name
      )
      select user_id, name, solved_count, rank
      from ranked
      where solved_count > 0
      order by rank asc, name asc
      limit 12;
    `,
    [language, difficulty]
  );

  sendJson(response, 200, {
    db: {
      configured: Boolean(process.env.DATABASE_URL),
      connected: dbConnected,
    },
    rows: result.rows.map((row) => ({
      userId: Number(row.user_id),
      name: row.name,
      solvedCount: Number(row.solved_count),
      rank: Number(row.rank),
    })),
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

    if (attempt.isCorrect) {
      await pool.query(
        `
          insert into solved_words (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word)
          values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word) do nothing;
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
    }

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

    sendJson(response, 200, {
      ...attempt,
      ...buildAttemptStats(
        Number(countResult.rows[0].correct_count),
        Number(countResult.rows[0].attempt_count)
      ),
      dbConnected: true,
    });
    return;
  }

  rememberAttempt(attempt);
  const key = getAttemptIdentity(attempt);
  const attempts = memoryAttempts.get(key) || [];
  const correctCount = attempts.filter((item) => item.isCorrect).length;

  sendJson(response, 200, {
    ...attempt,
    ...buildAttemptStats(correctCount, attempts.length),
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

    await pool.query(
      `
        delete from word_attempts
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

async function handleSummary(response, url) {
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
      await handleSummary(response, url);
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
    sendJson(response, 500, {
      error: "Server error",
      detail: error instanceof Error ? error.message : String(error),
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
