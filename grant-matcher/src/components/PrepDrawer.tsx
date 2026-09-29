import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import type { PartnerOffice, PrepStatus, RequiredDocument } from '../types';
import type { MatchResult } from '../lib/matching';
import { NOW, addDays, daysUntil, formatDate } from '../lib/format';
import { CHANNEL_LABEL, KIND_META, SOURCE_LABEL } from '../lib/labels';
import { Icon, icons } from './icons';
import { EASE_OUT } from './motion';

/** 書類の入手・作成に必要な日数に足す余裕日数 */
const BUFFER_DAYS = 2;

const NEXT_STATUS: Record<PrepStatus, PrepStatus> = { todo: 'doing', doing: 'done', done: 'todo' };
const STATUS_LABEL: Record<PrepStatus, string> = { todo: '未着手', doing: '準備中', done: '完了' };

function startBy(deadline: string, doc: RequiredDocument) {
  return addDays(deadline, -(doc.lead_days + BUFFER_DAYS));
}

function StatusToggle({ status, onClick, label }: { status: PrepStatus; onClick: () => void; label: string }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      aria-label={`${label}: ${STATUS_LABEL[status]}（クリックで変更）`}
      className={`relative grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
        status === 'done'
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : status === 'doing'
            ? 'border-amber-400 bg-amber-50'
            : 'border-zinc-300 bg-white hover:border-zinc-400'
      }`}
    >
      <AnimatePresence initial={false} mode="wait">
        {status === 'done' && (
          <m.svg key="done" viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={3}>
            <m.path
              d="M20 6 9 17l-5-5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
            />
          </m.svg>
        )}
        {status === 'doing' && (
          <m.span
            key="doing"
            className="size-2 rounded-full bg-amber-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          />
        )}
      </AnimatePresence>
    </m.button>
  );
}

function Section({ step, title, children, delay }: { step: number; title: string; children: ReactNode; delay: number }) {
  return (
    <m.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE_OUT }}
      className="border-t border-zinc-100 px-6 py-5"
    >
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
        <span className="grid size-5 place-items-center rounded-full bg-zinc-900 text-[10px] text-white tabular-nums">
          {step}
        </span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </m.section>
  );
}

export function PrepDrawer({
  match,
  status,
  partners,
  handoffPartnerId,
  onStatusChange,
  onHandoff,
  onClose,
}: {
  match: MatchResult;
  status: Record<string, PrepStatus>;
  partners: PartnerOffice[];
  handoffPartnerId: string | null;
  onStatusChange: (docId: string, next: PrepStatus) => void;
  onHandoff: (partnerId: string) => void;
  onClose: () => void;
}) {
  const { grant, checks } = match;
  const docs = grant.application.documents;
  const required = docs.filter((d) => !d.optional);
  const doneRequired = required.filter((d) => status[d.id] === 'done').length;
  const ratio = required.length ? doneRequired / required.length : 0;
  const days = daysUntil(grant.deadline);
  const gaps = checks.filter((c) => !c.passed);

  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Esc で閉じる / 開いたらフォーカス移動 / 閉じたら元の要素へ戻す
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  const sortedDocs = [...docs].sort((a, b) => startBy(grant.deadline, a).getTime() - startBy(grant.deadline, b).getTime());
  const earliest = startBy(grant.deadline, sortedDocs.find((d) => !d.optional) ?? sortedDocs[0]);
  const milestones = [
    { label: '書類の取り寄せ開始', date: earliest },
    { label: '作成書類の下書き完了', date: addDays(grant.deadline, -7) },
    { label: '最終確認・提出', date: addDays(grant.deadline, -BUFFER_DAYS) },
    { label: grant.kind === 'tender' ? '提案書 提出締切' : '申請締切', date: new Date(grant.deadline) },
  ];

  return (
    <div className="fixed inset-0 z-40">
      <m.div
        className="absolute inset-0 bg-zinc-900/30 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      />
      <m.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="prep-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        {/* Header */}
        <div className="border-b border-zinc-200 px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${KIND_META[grant.kind].className}`}
                >
                  {KIND_META[grant.kind].label}
                </span>
                申請準備
              </div>
              <h2 id="prep-title" className="mt-1.5 text-base font-semibold tracking-tight text-zinc-900">
                {grant.title}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <Icon>{icons.x}</Icon>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs">
            <span className="font-medium text-zinc-700 tabular-nums">
              必須書類 {doneRequired}/{required.length}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <m.div
                className="h-full origin-left rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: ratio }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              />
            </div>
            <span className={`font-medium tabular-nums ${days <= 14 ? 'text-rose-600' : 'text-zinc-500'}`}>
              締切まで{days}日
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Section step={1} title="要件の最終確認" delay={0.1}>
            {gaps.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] text-emerald-700">
                <Icon className="size-4">{icons.check}</Icon>
                AIが確認したすべての要件を満たしています。
              </p>
            ) : (
              <ul className="space-y-2">
                {gaps.map((c) => (
                  <li key={c.label} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                    <Icon className="mt-0.5 size-4 shrink-0 text-amber-500">{icons.alert}</Icon>
                    <span>
                      <span className="font-medium">{c.detail}</span>
                      {c.action && <span className="block text-xs text-amber-800/80">{c.action}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section step={2} title="必要書類" delay={0.18}>
            <p className="mb-2 text-xs text-zinc-500">公募要領からAIが抽出しました。着手期限は締切から逆算しています。</p>
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {sortedDocs.map((d, i) => {
                const s = status[d.id] ?? 'todo';
                const start = startBy(grant.deadline, d);
                const late = s !== 'done' && start < NOW;
                return (
                  <m.li
                    key={d.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.05, ease: EASE_OUT }}
                    className="flex items-start gap-3 px-3.5 py-3"
                  >
                    <div className="pt-0.5">
                      <StatusToggle status={s} label={d.name} onClick={() => onStatusChange(d.id, NEXT_STATUS[s])} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[13px] font-medium transition-colors ${
                            s === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-900'
                          }`}
                        >
                          {d.name}
                        </span>
                        {d.optional && (
                          <span className="rounded bg-zinc-100 px-1 text-[10px] text-zinc-500">任意</span>
                        )}
                        {d.drafting && (
                          <span className="rounded bg-indigo-50 px-1 text-[10px] text-indigo-600">作成書類</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">{d.note}</div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] leading-tight">
                      <div className="text-zinc-400">{SOURCE_LABEL[d.source]}</div>
                      <div className={`mt-0.5 font-medium tabular-nums ${late ? 'text-rose-600' : 'text-zinc-600'}`}>
                        {s === 'done' ? '完了' : late ? '今すぐ着手' : `${formatDate(start)}まで`}
                      </div>
                    </div>
                  </m.li>
                );
              })}
            </ul>
          </Section>

          <Section step={3} title="スケジュール" delay={0.26}>
            <ol className="relative ml-2">
              <m.span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 left-[3px] w-px origin-top bg-zinc-200"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, delay: 0.35, ease: EASE_OUT }}
              />
              {milestones.map((ms, i) => {
                const past = ms.date < NOW;
                const last = i === milestones.length - 1;
                return (
                  <m.li
                    key={ms.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.12 }}
                    className="relative flex items-center gap-3 py-1.5 pl-5 text-[13px]"
                  >
                    <span
                      className={`absolute left-0 size-[7px] rounded-full ring-4 ring-white ${
                        past ? 'bg-rose-500' : last ? 'bg-zinc-900' : 'bg-indigo-500'
                      }`}
                    />
                    <span className={`w-20 font-medium tabular-nums ${past ? 'text-rose-600' : 'text-zinc-900'}`}>
                      {formatDate(ms.date)}
                    </span>
                    <span className="text-zinc-600">{ms.label}</span>
                    {past && <span className="text-[11px] text-rose-600">期限超過</span>}
                  </m.li>
                );
              })}
            </ol>
          </Section>

          <Section step={4} title="提出と専門家への引き継ぎ" delay={0.34}>
            <div className="flex items-center gap-2 text-[13px] text-zinc-700">
              <Icon className="size-4 text-zinc-400">{icons.send}</Icon>
              提出先: <span className="font-medium">{CHANNEL_LABEL[grant.application.channel]}</span>
            </div>

            {grant.application.handoff_available ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  作成書類は自社で作るか、提携の行政書士に依頼できます。依頼すると、この案件の要件と準備状況が共有されます。
                </p>
                {partners.map((p) => {
                  const requested = handoffPartnerId === p.id;
                  const disabled = handoffPartnerId !== null && !requested;
                  return (
                    <m.div
                      key={p.id}
                      layout
                      className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
                        requested ? 'border-emerald-300 bg-emerald-50/60' : 'border-zinc-200'
                      }`}
                    >
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500">
                        <Icon>{icons.users}</Icon>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-zinc-900">{p.name}</div>
                        <div className="text-[11px] text-zinc-500">
                          {p.specialties.join('・')} · 通常{p.typical_response_hours}時間以内に返信
                        </div>
                      </div>
                      <AnimatePresence mode="wait" initial={false}>
                        {requested ? (
                          <m.span
                            key="done"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"
                          >
                            <Icon className="size-3.5">{icons.check}</Icon>
                            依頼済み
                          </m.span>
                        ) : (
                          <m.button
                            key="btn"
                            type="button"
                            disabled={disabled}
                            onClick={() => onHandoff(p.id)}
                            whileTap={{ scale: 0.96 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            相談を依頼
                          </m.button>
                        )}
                      </AnimatePresence>
                    </m.div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                入札・提案書類は自社で作成して提出します。HojoRadarは仕様書の要点整理と期限管理を支援します。
              </p>
            )}

            <p className="mt-4 flex gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-500">
              <Icon className="mt-px size-3.5 shrink-0 text-zinc-400">{icons.shield}</Icon>
              HojoRadarは申請書類の作成・提出を代行しません。報酬を得て官公署に提出する書類を作成できるのは行政書士のみです（行政書士法）。
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-6 py-3.5">
          <span className="text-xs text-zinc-500">
            {ratio === 1 ? '必須書類がそろいました' : `必須書類 あと${required.length - doneRequired}件`}
          </span>
          <m.a
            href={grant.raw.source_url}
            onClick={(e) => e.preventDefault()}
            aria-disabled={ratio < 1}
            animate={ratio === 1 ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium ${
              ratio === 1 ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'cursor-not-allowed bg-zinc-100 text-zinc-400'
            }`}
          >
            提出先を開く
            <Icon className="size-3.5">{icons.arrowRight}</Icon>
          </m.a>
        </div>
      </m.aside>
    </div>
  );
}
