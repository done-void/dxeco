import { useMemo, useState, type ReactNode } from 'react';
import mockData from './data/mockData.json';
import type {
  Certification,
  CompanyProfile,
  GrantItem,
  GrantKind,
  Industry,
  MatchCheck,
  PlanTier,
} from './types';

// ---------------------------------------------------------------------------
// Mock data & clock
// ---------------------------------------------------------------------------

const { company, grants } = mockData as unknown as {
  company: CompanyProfile;
  grants: GrantItem[];
};

/** モック表示を安定させるための固定「現在時刻」 */
const NOW = new Date('2026-09-29T09:00:00+09:00');

// ---------------------------------------------------------------------------
// Matching — 本番では Edge Function で計算し grant_matches に保存する想定
// ---------------------------------------------------------------------------

const INDUSTRY_LABEL: Record<Industry, string> = {
  it_software: 'IT・ソフトウェア',
  manufacturing: '製造業',
  retail: '卸売・小売',
  construction: '建設業',
  food_service: '飲食・宿泊',
  healthcare: '医療・福祉',
  logistics: '運輸・物流',
  professional_services: '専門サービス',
  other: 'その他',
};

const CERT_LABEL: Record<Certification, string> = {
  gbiz_id_prime: 'gBizIDプライム',
  security_action_1star: 'SECURITY ACTION ★',
  security_action_2star: 'SECURITY ACTION ★★',
  unified_bid_qualification: '全省庁統一資格',
  local_bid_qualification: '自治体入札参加資格',
  keiei_kakushin: '経営革新計画',
  kenko_keiei: '健康経営優良法人',
};

/** 上位資格は下位資格の要件を満たす */
const CERT_IMPLIES: Partial<Record<Certification, Certification[]>> = {
  security_action_2star: ['security_action_1star'],
};

function hasCert(profile: CompanyProfile, cert: Certification) {
  return profile.certifications.some((c) => c === cert || CERT_IMPLIES[c]?.includes(cert));
}

function yearsSince(date: string) {
  return Math.floor((NOW.getTime() - new Date(date).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function evaluateMatch(profile: CompanyProfile, grant: GrantItem) {
  const e = grant.eligibility;
  const checks: MatchCheck[] = [];

  checks.push({
    label: '業種',
    weight: 25,
    passed: e.industries === 'any' || e.industries.includes(profile.industry),
    detail:
      e.industries === 'any'
        ? '全業種が対象'
        : `対象: ${e.industries.map((i) => INDUSTRY_LABEL[i]).join('・')}`,
  });

  const sizeOk =
    (e.max_employees === null || profile.employee_count <= e.max_employees) &&
    (e.max_capital_jpy === null || profile.capital_jpy <= e.max_capital_jpy);
  checks.push({
    label: '企業規模',
    weight: 20,
    passed: sizeOk,
    detail:
      e.max_employees === null && e.max_capital_jpy === null
        ? '規模要件なし'
        : `従業員${profile.employee_count}名 / 上限${e.max_employees ?? '—'}名`,
  });

  checks.push({
    label: '所在地',
    weight: 15,
    passed: e.prefectures === 'any' || e.prefectures.includes(profile.prefecture),
    detail: e.prefectures === 'any' ? '全国対象' : `対象: ${e.prefectures.join('・')}`,
  });

  const years = yearsSince(profile.founded_on);
  checks.push({
    label: '事業年数',
    weight: 10,
    passed: e.min_years_in_business === null || years >= e.min_years_in_business,
    detail:
      e.min_years_in_business === null
        ? '要件なし'
        : `創業${years}年 / 必要${e.min_years_in_business}年以上`,
  });

  checks.push({
    label: '目的',
    weight: 20,
    passed: e.purposes.some((p) => profile.purposes.includes(p)),
    detail: e.purposes.some((p) => profile.purposes.includes(p))
      ? '登録済みの目的と一致'
      : '登録済みの目的と不一致',
  });

  const missing = e.required_certifications.filter((c) => !hasCert(profile, c));
  checks.push({
    label: '必要資格',
    weight: 10,
    passed: missing.length === 0,
    detail:
      missing.length === 0 ? '要件を満たしています' : `未取得: ${missing.map((c) => CERT_LABEL[c]).join('、')}`,
  });

  // 資格は部分点（取得済みの割合）で評価
  const certRatio =
    e.required_certifications.length === 0
      ? 1
      : 1 - missing.length / e.required_certifications.length;
  const score = checks.reduce(
    (sum, c) => sum + (c.label === '必要資格' ? c.weight * certRatio : c.passed ? c.weight : 0),
    0,
  );

  return { score: Math.round(score), checks };
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const PLAN_LABEL: Record<PlanTier, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const KIND_META: Record<GrantKind, { label: string; className: string }> = {
  subsidy: { label: '補助金', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15' },
  grant: { label: '助成金', className: 'bg-sky-50 text-sky-700 ring-sky-600/15' },
  tender: { label: '入札', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
};

function formatManYen(jpy: number) {
  return `${(jpy / 10_000).toLocaleString('ja-JP')}万円`;
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - NOW.getTime()) / (24 * 3600 * 1000));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const w = '日月火水木金土'[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（${w}）`;
}

function scoreTone(score: number) {
  if (score >= 90) return { stroke: 'stroke-emerald-500', text: 'text-emerald-600', label: '非常に高い' };
  if (score >= 75) return { stroke: 'stroke-indigo-500', text: 'text-indigo-600', label: '高い' };
  return { stroke: 'stroke-zinc-400', text: 'text-zinc-500', label: '要確認' };
}

// ---------------------------------------------------------------------------
// Icons (inline SVG, 16px, stroke-based)
// ---------------------------------------------------------------------------

function Icon({ children, className = 'size-4' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const icons = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
      <path d="M19 3v4M21 5h-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function Sidebar() {
  const nav = [
    { key: 'dashboard', label: 'ダッシュボード', icon: icons.dashboard, active: true },
    { key: 'notifications', label: '通知', icon: icons.bell, badge: 3 },
    { key: 'settings', label: '設定', icon: icons.settings },
  ];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-200 px-5">
        <div className="grid size-6 place-items-center rounded-md bg-zinc-900 text-white">
          <Icon className="size-3.5">{icons.sparkles}</Icon>
        </div>
        <span className="text-sm font-semibold tracking-tight">HojoRadar</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {nav.map((item) => (
          <a
            key={item.key}
            href="#"
            onClick={(e) => e.preventDefault()}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              item.active
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <Icon>{item.icon}</Icon>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-px text-[10px] font-semibold text-white tabular-nums">
                {item.badge}
              </span>
            )}
          </a>
        ))}
      </nav>

      <div className="m-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-700">プロフィール充実度</span>
          <span className="font-semibold tabular-nums text-zinc-900">82%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full w-[82%] rounded-full bg-indigo-500" />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-zinc-500">
          保有資格を追加すると、マッチング精度が向上します。
        </p>
      </div>
    </aside>
  );
}

function Header({ profile }: { profile: CompanyProfile }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden text-zinc-400 sm:inline">ワークスペース</span>
        <span className="hidden text-zinc-300 sm:inline">/</span>
        <span className="font-medium text-zinc-900">ダッシュボード</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-400 lg:flex">
          <Icon className="size-3.5">{icons.search}</Icon>
          <span>検索は不要です — AIが自動で探します</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-[13px] font-medium text-zinc-900">{profile.company_name}</div>
            <div className="text-[11px] text-zinc-500">
              {profile.industry_detail} · {profile.employee_count}名
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white">
            {PLAN_LABEL[profile.plan]}
            <span className="font-normal text-zinc-400">プラン</span>
          </span>
          <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-xs font-semibold text-white">
            BL
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Dashboard parts
// ---------------------------------------------------------------------------

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-zinc-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-zinc-400">{sub}</div>
    </div>
  );
}

function MatchRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="flex flex-col items-center">
      <div className="relative size-16">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-zinc-100" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - score / 100)}
            className={tone.stroke}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className={`text-base font-semibold tabular-nums ${tone.text}`}>
            {score}
            <span className="text-[10px]">%</span>
          </span>
        </div>
      </div>
      <span className="mt-1 text-[10px] font-medium text-zinc-500">適合率 · {tone.label}</span>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 py-1.5 text-[13px] leading-relaxed">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-zinc-800">{children}</dd>
    </div>
  );
}

function GrantCard({
  grant,
  score,
  checks,
  isNew,
}: {
  grant: GrantItem;
  score: number;
  checks: MatchCheck[];
  isNew: boolean;
}) {
  const [open, setOpen] = useState(false);
  const kind = KIND_META[grant.kind];
  const days = daysUntil(grant.deadline);
  const urgent = days <= 14;

  return (
    <article className="group rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-zinc-300 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-6">
        {/* Left: title + AI summary */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${kind.className}`}>
              {kind.label}
            </span>
            <span className="text-xs text-zinc-500">{grant.agency}</span>
            {isNew && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600">
                <span className="size-1.5 rounded-full bg-indigo-500" />
                新着
              </span>
            )}
          </div>

          <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-zinc-900">{grant.title}</h3>
          <p className="mt-0.5 truncate text-[11px] text-zinc-400" title={grant.raw.raw_title}>
            原文: {grant.raw.raw_title}
          </p>

          <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50/70 px-3.5 py-2">
            <div className="flex items-center gap-1.5 pb-1 text-[11px] font-medium text-indigo-600">
              <Icon className="size-3.5">{icons.sparkles}</Icon>
              AIによる3行サマリー
              <span className="ml-auto font-normal text-zinc-400">
                信頼度 {Math.round(grant.ai_confidence * 100)}%
              </span>
            </div>
            <dl className="divide-y divide-zinc-100">
              <SummaryRow label="対象者">{grant.ai_summary.target}</SummaryRow>
              <SummaryRow label="上限額">{grant.ai_summary.amount}</SummaryRow>
              <SummaryRow label="必須要件">{grant.ai_summary.requirement}</SummaryRow>
            </dl>
          </div>
        </div>

        {/* Right: match + amount */}
        <div className="flex shrink-0 flex-row items-center justify-between border-zinc-100 sm:w-40 sm:flex-col sm:items-end sm:border-l sm:pl-6">
          <MatchRing score={score} />
          <div className="text-right sm:mt-4">
            <div className="text-[11px] text-zinc-500">
              {grant.kind === 'tender' ? '予定価格' : '上限額'}
            </div>
            <div className="text-2xl font-semibold tracking-tight tabular-nums text-zinc-900">
              {formatManYen(grant.max_amount_jpy)}
            </div>
            {grant.subsidy_rate && (
              <div className="text-[11px] text-zinc-500">補助率 {grant.subsidy_rate}</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-100 px-5 py-3">
        <div className={`flex items-center gap-1.5 text-xs ${urgent ? 'text-rose-600' : 'text-zinc-600'}`}>
          <Icon className="size-3.5">{icons.clock}</Icon>
          <span className="font-medium">締切 {formatDate(grant.deadline)}</span>
          <span
            className={`rounded px-1 py-px text-[10px] font-semibold tabular-nums ${
              urgent ? 'bg-rose-50 text-rose-600' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            あと{days}日
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {grant.tags.map((t) => (
            <span key={t} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
              {t}
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            適合の根拠
            <Icon className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}>{icons.chevron}</Icon>
          </button>
          <a
            href={grant.raw.document_urls[0]}
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Icon className="size-3.5">{icons.file}</Icon>
            公募要領
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
          >
            申請準備を始める
            <Icon className="size-3.5">{icons.arrowRight}</Icon>
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-2 text-xs">
              <span
                className={`mt-px grid size-4 shrink-0 place-items-center rounded-full ${
                  c.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}
              >
                <Icon className="size-2.5">{c.passed ? icons.check : icons.x}</Icon>
              </span>
              <div>
                <div className="font-medium text-zinc-800">
                  {c.label}
                  <span className="ml-1 font-normal text-zinc-400">({c.weight}pt)</span>
                </div>
                <div className="text-zinc-500">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Filter = 'all' | 'funding' | 'tender';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'funding', label: '補助金・助成金' },
  { key: 'tender', label: '入札' },
];

export default function Dashboard() {
  const [filter, setFilter] = useState<Filter>('all');

  const matches = useMemo(
    () =>
      grants
        .filter((g) => g.status === 'open')
        .map((g) => ({ grant: g, ...evaluateMatch(company, g) }))
        .filter((m) => m.score >= company.notify_threshold)
        .sort((a, b) => b.score - a.score),
    [],
  );

  const visible = matches.filter((m) =>
    filter === 'all' ? true : filter === 'tender' ? m.grant.kind === 'tender' : m.grant.kind !== 'tender',
  );

  const fundingTotal = matches
    .filter((m) => m.grant.kind !== 'tender')
    .reduce((sum, m) => sum + m.grant.max_amount_jpy, 0);
  const closingSoon = matches.filter((m) => daysUntil(m.grant.deadline) <= 14).length;
  const isNew = (g: GrantItem) => NOW.getTime() - new Date(g.created_at).getTime() < 48 * 3600 * 1000;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header profile={company} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                  あなたの企業に適合する新着案件
                </h1>
                <p className="mt-1 text-[13px] text-zinc-500">
                  {INDUSTRY_LABEL[company.industry]} · {company.prefecture} · 従業員
                  {company.employee_count}名 の条件で、適合率 {company.notify_threshold}% 以上の案件を表示しています
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                最終スキャン 今日 06:00 · 次回 明日 06:00
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="適合案件" value={`${matches.length}件`} sub={`うち新着 ${matches.filter((m) => isNew(m.grant)).length}件`} />
              <StatTile label="受給可能額（合計上限）" value={formatManYen(fundingTotal)} sub="補助金・助成金の合計" />
              <StatTile label="締切2週間以内" value={`${closingSoon}件`} sub="早めの準備を推奨" />
              <StatTile label="今週AIが解析した公募要領" value="1,284件" sub="国・47都道府県・主要市区町村" />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      filter === f.key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-zinc-400">適合率の高い順</span>
            </div>

            <div className="mt-4 space-y-4">
              {visible.map((m) => (
                <GrantCard
                  key={m.grant.id}
                  grant={m.grant}
                  score={m.score}
                  checks={m.checks}
                  isNew={isNew(m.grant)}
                />
              ))}
              {visible.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-500">
                  条件に合う案件はまだありません。新しい公募が見つかり次第お知らせします。
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
