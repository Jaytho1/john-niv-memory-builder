create table if not exists word_attempts (
  id bigserial primary key,
  chapter_id integer not null,
  verse_id integer not null,
  token_index integer not null,
  expected_word text not null,
  answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists word_attempts_lookup_idx
  on word_attempts (chapter_id, verse_id, token_index, expected_word, is_correct);
