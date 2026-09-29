import { useCallback, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig, domMax, m } from 'motion/react';
import type { GrantItem, PrepStatus } from './types';
import { company, matches, partners, preps } from './lib/data';
import { NOW, daysUntil } from './lib/format';
import { INDUSTRY_LABEL } from './lib/labels';
import { GrantCard, type PrepProgress } from './components/GrantCard';
import { Header, Sidebar } from './components/Layout';
import { LiveScan } from './components/LiveScan';
import { CountUp, EASE_OUT } from './components/motion';
import { PrepDrawer } from './components/PrepDrawer';

type Filter = 'all' | 'funding' | 'tender';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'funding', label: '補助金・助成金' },
  { key: 'tender', label: '入札' },
];

// 静的な集計値はモジュールスコープで 1 回だけ計算する
const fundingTotalMan = matches
  .filter((x) => x.grant.kind !== 'tender')
  .reduce((sum, x) => sum + x.grant.max_amount_jpy, 0) / 10_000;
const closingSoon = matches.filter((x) => daysUntil(x.grant.deadline) <= 14).length;
const isNew = (g: GrantItem) => NOW.getTime() - new Date(g.created_at).getTime() < 48 * 3600 * 1000;
const newCount = matches.filter((x) => isNew(x.grant)).length;

type StatusMap = Record<string, Record<string, PrepStatus>>; // grant_id -> document_id -> 状態

function StatTile({ label, sub, index, children }: { label: string; sub: string; index: number; children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 * index, ease: EASE_OUT }}
      className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5"
    >
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">{children}</div>
      <div className="mt-0.5 text-[11px] text-zinc-400">{sub}</div>
    </m.div>
  );
}

export default function Dashboard() {
  const [filter, setFilter] = useState<Filter>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<StatusMap>(() =>
    Object.fromEntries(preps.map((p) => [p.grant_id, p.document_status])),
  );
  const [handoff, setHandoff] = useState<Record<string, string>>(() =>
    Object.fromEntries(preps.filter((p) => p.handoff_partner_id).map((p) => [p.grant_id, p.handoff_partner_id!])),
  );

  const visible = matches.filter((x) =>
    filter === 'all' ? true : filter === 'tender' ? x.grant.kind === 'tender' : x.grant.kind !== 'tender',
  );
  const active = matches.find((x) => x.grant.id === activeId) ?? null;

  const progressOf = (g: GrantItem): PrepProgress | null => {
    const s = statusMap[g.id];
    if (!s || Object.keys(s).length === 0) return null;
    const required = g.application.documents.filter((d) => !d.optional);
    return { done: required.filter((d) => s[d.id] === 'done').length, total: required.length };
  };
  const prepCount = matches.filter((x) => progressOf(x.grant) !== null).length;

  const closeDrawer = useCallback(() => setActiveId(null), []);

  const openPrep = (grantId: string) => {
    // 準備を開始した時点で進捗レコードを作る（本番では application_preps に upsert）
    setStatusMap((prev) => (prev[grantId] ? prev : { ...prev, [grantId]: {} }));
    setActiveId(grantId);
  };

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <div className="flex h-screen overflow-hidden">
          <Sidebar prepCount={prepCount} />

          <div className="flex min-w-0 flex-1 flex-col">
            <Header profile={company} />

            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <m.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    className="min-w-0"
                  >
                    <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                      あなたの企業に適合する新着案件
                    </h1>
                    <p className="mt-1 text-[13px] text-zinc-500">
                      {INDUSTRY_LABEL[company.industry]} · {company.prefecture} · 従業員{company.employee_count}名
                      の条件で、適合率 {company.notify_threshold}% 以上の案件を表示しています
                    </p>
                  </m.div>
                  <LiveScan />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatTile label="適合案件" sub={`うち新着 ${newCount}件`} index={0}>
                    <CountUp value={matches.length} />件
                  </StatTile>
                  <StatTile label="受給可能額（合計上限）" sub="補助金・助成金の合計" index={1}>
                    <CountUp value={fundingTotalMan} duration={1.6} />
                    万円
                  </StatTile>
                  <StatTile label="締切2週間以内" sub="早めの準備を推奨" index={2}>
                    <CountUp value={closingSoon} />件
                  </StatTile>
                  <StatTile label="申請準備中" sub="書類の進捗を管理中" index={3}>
                    <CountUp value={prepCount} duration={0.5} />件
                  </StatTile>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5" role="tablist">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.key}
                        onClick={() => setFilter(f.key)}
                        className={`relative rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          filter === f.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        {filter === f.key && (
                          <m.span
                            layoutId="filter-pill"
                            className="absolute inset-0 rounded-md bg-zinc-900"
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          />
                        )}
                        <span className="relative">{f.label}</span>
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-zinc-400">適合率の高い順</span>
                </div>

                <div className="mt-4 space-y-4">
                  <AnimatePresence mode="popLayout">
                    {visible.map((x, i) => (
                      <GrantCard
                        key={x.grant.id}
                        match={x}
                        index={i}
                        isNew={isNew(x.grant)}
                        progress={progressOf(x.grant)}
                        onPrepare={() => openPrep(x.grant.id)}
                      />
                    ))}
                  </AnimatePresence>
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

        <AnimatePresence>
          {active && (
            <PrepDrawer
              key={active.grant.id}
              match={active}
              status={statusMap[active.grant.id] ?? {}}
              partners={partners}
              handoffPartnerId={handoff[active.grant.id] ?? null}
              onStatusChange={(docId, next) =>
                setStatusMap((prev) => ({ ...prev, [active.grant.id]: { ...prev[active.grant.id], [docId]: next } }))
              }
              onHandoff={(partnerId) => setHandoff((prev) => ({ ...prev, [active.grant.id]: partnerId }))}
              onClose={closeDrawer}
            />
          )}
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
