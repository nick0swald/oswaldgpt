-- Time from question submit to answer reveal (teacher daily stats)
alter table sessions add column if not exists question_submitted_at timestamptz;
alter table sessions add column if not exists answer_shown_at timestamptz;
