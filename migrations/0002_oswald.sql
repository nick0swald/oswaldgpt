-- OswaldGPT classroom sessions + name roster (unowned rows; teacher PIN gates reads)
create table if not exists roster_names (
  id serial primary key,
  name text not null unique
);

create table if not exists sessions (
  id text primary key,
  student_name text not null,
  class_code text not null,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  submitted_question boolean not null default false,
  questions_count int not null default 0,
  steps_shown int not null default 0,
  extra_tips int not null default 0,
  extra_mask int not null default 0,
  answer_shown boolean not null default false,
  help_json text
);

create index if not exists sessions_class_name_idx
  on sessions (class_code, student_name);

create index if not exists sessions_last_active_idx
  on sessions (last_active_at desc);
