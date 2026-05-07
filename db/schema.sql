create table if not exists users (
  id bigserial primary key,
  name text not null,
  email text not null unique,
  preferred_language text not null default 'en',
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
  created_at timestamptz not null default now(),
  constraint solved_words_user_progress_unique
    unique (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word)
);

create index if not exists word_attempts_lookup_idx
  on word_attempts (user_id, language, difficulty, chapter_id, verse_id, token_index, expected_word, is_correct);
