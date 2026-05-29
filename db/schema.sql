create table if not exists users (
  id bigserial primary key,
  name text not null,
  email text not null unique,
  preferred_language text not null default 'en',
  session_token_hash text,
  session_token_created_at timestamptz,
  created_at timestamptz not null default now()
);

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

create index if not exists word_attempts_lookup_idx
  on word_attempts (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word, is_correct);

create index if not exists word_attempts_reward_lookup_idx
  on word_attempts (user_id, language, chapter_id, verse_id, token_index, expected_word);

create index if not exists solved_words_leaderboard_idx
  on solved_words (difficulty, language, user_id);

create index if not exists collected_rewards_leaderboard_idx
  on collected_rewards (language, user_id, created_at desc);
