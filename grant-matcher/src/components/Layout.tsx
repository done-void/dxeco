import { AnimatePresence, m } from 'motion/react';
import type { CompanyProfile } from '../types';
import { PLAN_LABEL } from '../lib/labels';
import { Icon, icons } from './icons';
import { EASE_OUT, RadarLogo } from './motion';

export function Sidebar({ prepCount }: { prepCount: number }) {
  const nav = [
    { key: 'dashboard', label: 'ダッシュボード', icon: icons.dashboard, active: true },
    { key: 'prep', label: '申請準備', icon: icons.clipboard, badge: prepCount },
    { key: 'notifications', label: '通知', icon: icons.bell, badge: 3 },
    { key: 'settings', label: '設定', icon: icons.settings },
  ];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-5">
        <RadarLogo />
        <span className="text-sm font-semibold tracking-tight">HojoRadar</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="メイン">
        {nav.map((item) => (
          <a
            key={item.key}
            href="#"
            onClick={(e) => e.preventDefault()}
            aria-current={item.active ? 'page' : undefined}
            className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              item.active ? 'text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            {item.active && (
              <m.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-zinc-100" />
            )}
            <span className="relative flex flex-1 items-center gap-2.5">
              <Icon>{item.icon}</Icon>
              <span className="flex-1">{item.label}</span>
              <AnimatePresence>
                {!!item.badge && (
                  <m.span
                    key={item.badge}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="rounded-full bg-indigo-600 px-1.5 py-px text-[10px] font-semibold text-white tabular-nums"
                  >
                    {item.badge}
                  </m.span>
                )}
              </AnimatePresence>
            </span>
          </a>
        ))}
      </nav>

      <div className="m-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-700">プロフィール充実度</span>
          <span className="font-semibold tabular-nums text-zinc-900">82%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-200">
          <m.div
            className="h-full origin-left rounded-full bg-indigo-500"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 0.82 }}
            transition={{ duration: 1.2, delay: 0.3, ease: EASE_OUT }}
          />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-zinc-500">
          保有資格を追加すると、マッチング精度が向上します。
        </p>
      </div>
    </aside>
  );
}

export function Header({ profile }: { profile: CompanyProfile }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden text-zinc-400 sm:inline">ワークスペース</span>
        <span className="hidden text-zinc-300 sm:inline">/</span>
        <span className="font-medium text-zinc-900">ダッシュボード</span>
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
    </header>
  );
}
