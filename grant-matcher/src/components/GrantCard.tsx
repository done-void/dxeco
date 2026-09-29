import { useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import type { MatchResult } from '../lib/matching';
import { daysUntil, formatDate, formatManYen } from '../lib/format';
import { KIND_META } from '../lib/labels';
import { Icon, icons } from './icons';
import { EASE_OUT, MatchRing } from './motion';

function SummaryRow({ label, children, delay }: { label: string; children: ReactNode; delay: number }) {
  return (
    <m.div
      className="grid grid-cols-[4.5rem_1fr] gap-3 py-1.5 text-[13px] leading-relaxed"
      initial={{ opacity: 0, x: -6 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay, ease: EASE_OUT }}
    >
      <dt className="text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-zinc-800">{children}</dd>
    </m.div>
  );
}

export interface PrepProgress {
  done: number;
  total: number;
}

export function GrantCard({
  match,
  index,
  isNew,
  progress,
  onPrepare,
}: {
  match: MatchResult;
  index: number;
  isNew: boolean;
  progress: PrepProgress | null;
  onPrepare: () => void;
}) {
  const { grant, score, checks } = match;
  const [open, setOpen] = useState(false);
  const kind = KIND_META[grant.kind];
  const days = daysUntil(grant.deadline);
  const urgent = days <= 14;
  const base = 0.15 + index * 0.08;

  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
      transition={{ duration: 0.55, delay: base, ease: EASE_OUT, layout: { duration: 0.4, ease: EASE_OUT } }}
      className="rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-[0_6px_20px_-6px_rgba(0,0,0,0.1)]"
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-6">
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

          <div className="relative mt-3 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50/70 px-3.5 py-2">
            {/* AI が要約を書き上げた瞬間を示すシマー */}
            <m.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-indigo-100/70 to-transparent"
              initial={{ left: '-35%' }}
              whileInView={{ left: '110%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: base + 0.1, ease: 'easeInOut' }}
            />
            <div className="relative flex items-center gap-1.5 pb-1 text-[11px] font-medium text-indigo-600">
              <Icon className="size-3.5">{icons.sparkles}</Icon>
              AIによる3行サマリー
              <span className="ml-auto font-normal text-zinc-400">
                信頼度 {Math.round(grant.ai_confidence * 100)}%
              </span>
            </div>
            <dl className="relative divide-y divide-zinc-100">
              <SummaryRow label="対象者" delay={base + 0.25}>{grant.ai_summary.target}</SummaryRow>
              <SummaryRow label="上限額" delay={base + 0.35}>{grant.ai_summary.amount}</SummaryRow>
              <SummaryRow label="必須要件" delay={base + 0.45}>{grant.ai_summary.requirement}</SummaryRow>
            </dl>
          </div>
        </div>

        <div className="flex shrink-0 flex-row items-center justify-between border-zinc-100 sm:w-40 sm:flex-col sm:items-end sm:border-l sm:pl-6">
          <MatchRing score={score} delay={base + 0.1} />
          <div className="text-right sm:mt-4">
            <div className="text-[11px] text-zinc-500">{grant.kind === 'tender' ? '予定価格' : '上限額'}</div>
            <div className="text-2xl font-semibold tracking-tight tabular-nums text-zinc-900">
              {formatManYen(grant.max_amount_jpy)}
            </div>
            {grant.subsidy_rate && <div className="text-[11px] text-zinc-500">補助率 {grant.subsidy_rate}</div>}
          </div>
        </div>
      </div>

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

        {progress ? (
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="font-medium">準備 {progress.done}/{progress.total}</span>
            <span className="h-1 w-16 overflow-hidden rounded-full bg-zinc-100">
              <m.span
                className="block h-full origin-left rounded-full bg-emerald-500"
                initial={false}
                animate={{ scaleX: progress.done / progress.total }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              />
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {grant.tags.map((t) => (
              <span key={t} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            適合の根拠
            <m.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="inline-flex">
              <Icon className="size-3.5">{icons.chevron}</Icon>
            </m.span>
          </button>
          <m.button
            type="button"
            onClick={onPrepare}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
          >
            {progress ? '準備を再開' : '申請準備を始める'}
            <Icon className="size-3.5">{icons.arrowRight}</Icon>
          </m.button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="checks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
              {checks.map((c, i) => (
                <m.div
                  key={c.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-2 text-xs"
                >
                  <span
                    className={`mt-px grid size-4 shrink-0 place-items-center rounded-full ${
                      c.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    <Icon className="size-2.5">{c.passed ? icons.check : icons.x}</Icon>
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-800">
                      {c.label}
                      <span className="ml-1 font-normal text-zinc-400">({c.weight}pt)</span>
                    </div>
                    <div className="text-zinc-500">{c.detail}</div>
                  </div>
                </m.div>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.article>
  );
}
