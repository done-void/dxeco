/** モック表示を安定させるための固定「現在時刻」 */
export const NOW = new Date('2026-09-29T09:00:00+09:00');

const DAY_MS = 24 * 3600 * 1000;

export function formatManYen(jpy: number) {
  return `${Math.round(jpy / 10_000).toLocaleString('ja-JP')}万円`;
}

export function daysUntil(iso: string | Date) {
  return Math.ceil((new Date(iso).getTime() - NOW.getTime()) / DAY_MS);
}

export function addDays(iso: string | Date, days: number) {
  return new Date(new Date(iso).getTime() + days * DAY_MS);
}

export function yearsSince(iso: string) {
  return Math.floor((NOW.getTime() - new Date(iso).getTime()) / (365.25 * DAY_MS));
}

export function formatDate(iso: string | Date) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`;
}
