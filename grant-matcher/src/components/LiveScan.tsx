import { useEffect, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';

const FEED = [
  '北海道 省エネ設備導入支援事業 募集要項.pdf',
  '大阪市 観光DX推進補助金 公募要領.pdf',
  '国土交通省 電子入札 案件公告（システム保守）',
  '福岡県 中小企業人材確保支援事業 実施要領.pdf',
  '愛知県 次世代産業参入支援補助金 公募要領.pdf',
];

/** AI が公募要領を解析し続けていることを示すライブティッカー */
export function LiveScan() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % FEED.length), 2600);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-full border sm:w-auto border-zinc-200 bg-white py-1 pr-3 pl-2 text-xs text-zinc-500">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="shrink-0 font-medium text-zinc-700">AI解析中</span>
      <span className="relative h-4 min-w-0 flex-1 overflow-hidden sm:w-72 sm:flex-none">
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={i}
            className="absolute inset-0 truncate"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {FEED[i]}
          </m.span>
        </AnimatePresence>
      </span>
    </div>
  );
}
