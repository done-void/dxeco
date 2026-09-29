-- HojoRadar — Supabase スキーマ（src/types.ts と対応）

create table public.companies (
  id                 uuid primary key default gen_random_uuid(),
  owner_user_id      uuid not null references auth.users (id) on delete cascade,
  company_name       text not null,
  corporate_number   char(13),
  industry           text not null,
  industry_detail    text,
  prefecture         text not null,
  city               text,
  capital_jpy        bigint not null,
  employee_count     integer not null,
  founded_on         date not null,
  annual_revenue_jpy bigint,
  purposes           text[] not null default '{}',
  keywords           text[] not null default '{}',
  certifications     text[] not null default '{}',
  plan               text not null default 'free' check (plan in ('free','starter','pro','enterprise')),
  notify_threshold   smallint not null default 70 check (notify_threshold between 0 and 100),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.grants (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('subsidy','grant','tender')),
  title             text not null,
  agency            text not null,
  status            text not null check (status in ('upcoming','open','closed')),
  raw               jsonb not null,            -- GrantRawData（原文・PDF URL）
  ai_summary        jsonb not null,            -- AiSummary（3行サマリー）
  eligibility       jsonb not null,            -- EligibilityCriteria（マッチング用）
  max_amount_jpy    bigint not null,
  subsidy_rate      text,
  application_start date,
  deadline          timestamptz not null,
  tags              text[] not null default '{}',
  ai_model          text not null,
  ai_confidence     real not null check (ai_confidence between 0 and 1),
  ai_extracted_at   timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique ((raw ->> 'source_url'))
);

create index grants_open_deadline_idx on public.grants (deadline) where status = 'open';

create table public.grant_matches (
  company_id  uuid not null references public.companies (id) on delete cascade,
  grant_id    uuid not null references public.grants (id) on delete cascade,
  score       smallint not null check (score between 0 and 100),
  checks      jsonb not null,                  -- MatchCheck[]
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (company_id, grant_id)
);

create index grant_matches_company_score_idx on public.grant_matches (company_id, score desc);

-- RLS: 自社データのみ参照可能。grants は全ログインユーザーに公開。
alter table public.companies     enable row level security;
alter table public.grants        enable row level security;
alter table public.grant_matches enable row level security;

create policy "own company" on public.companies
  for all using (owner_user_id = auth.uid());

create policy "grants readable" on public.grants
  for select to authenticated using (true);

create policy "own matches" on public.grant_matches
  for select using (
    company_id in (select id from public.companies where owner_user_id = auth.uid())
  );
