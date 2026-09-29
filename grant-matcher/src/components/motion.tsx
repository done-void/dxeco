import { useEffect, useRef } from 'react';
import { m, useInView, useReducedMotion } from 'motion/react';

/** 画面設計全体で共有するイージング（Linear 風の減速カーブ） */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** easeOutExpo 相当。motion の animate() を読み込まずに済むよう数値補間は自前で行う */
const easeOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** 数値のカウントアップ。再レンダーせず DOM テキストだけを書き換える */
export function CountUp({
  value,
  format = (v) => Math.round(v).toLocaleString('ja-JP'),
  duration = 1.2,
  delay = 0,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const from = current.current;
    const render = (v: number) => {
      current.current = v;
      el.textContent = format(v);
    };
    if (reduce || from === value) return render(value);

    let raf = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / (duration * 1000)));
      render(from + (value - from) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // format は呼び出し側で毎回生成されうるため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce, duration, delay]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(0)}
    </span>
  );
}

function scoreTone(score: number) {
  if (score >= 90) return { stroke: 'stroke-emerald-500', text: 'text-emerald-600', label: '非常に高い' };
  if (score >= 75) return { stroke: 'stroke-indigo-500', text: 'text-indigo-600', label: '高い' };
  return { stroke: 'stroke-zinc-400', text: 'text-zinc-500', label: '要確認' };
}

/** 適合率リング。表示領域に入ったら弧を描き、数値をカウントアップする */
export function MatchRing({ score, delay = 0 }: { score: number; delay?: number }) {
  const tone = scoreTone(score);
  return (
    <div className="flex flex-col items-center" aria-label={`適合率 ${score}%`}>
      <div className="relative size-16">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
          <circle cx="32" cy="32" r="26" fill="none" strokeWidth="5" className="stroke-zinc-100" />
          <m.circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className={tone.stroke}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: score / 100 }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay, ease: EASE_OUT }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <span className={`text-base font-semibold ${tone.text}`}>
            <CountUp value={score} duration={1.1} delay={delay} />
            <span className="text-[10px]">%</span>
          </span>
        </div>
      </div>
      <span className="mt-1 text-[10px] font-medium text-zinc-500">適合率 · {tone.label}</span>
    </div>
  );
}

/** ロゴ: 回転するレーダースイープ */
export function RadarLogo() {
  return (
    <div className="relative grid size-7 place-items-center overflow-hidden rounded-lg bg-zinc-900">
      <m.div
        className="absolute inset-0"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(129,140,248,0.85) 60deg, transparent 61deg)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-[5px] rounded-full border border-white/25" />
      <div className="absolute inset-[9px] rounded-full border border-white/25" />
      <m.span
        className="relative size-1.5 rounded-full bg-emerald-400"
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    </div>
  );
}
