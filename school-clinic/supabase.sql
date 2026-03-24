-- 1. Students Table
create table students (
  id uuid primary key default uuid_generate_v4(),
  student_id text unique not null,
  name text not null,
  grade_level text,
  section text
);

-- 2. Visits Table (The core of your recording)
create table visits (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  visit_time timestamptz default now(),
  subject_at_time text, -- The subject the student was attending
  reason text,
  treatment text,
  duration_minutes int
);