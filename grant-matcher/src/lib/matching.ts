import type { Certification, CompanyProfile, GrantItem, MatchCheck } from '../types';
import { yearsSince } from './format';
import { CERT_LABEL, INDUSTRY_LABEL } from './labels';

/**
 * 企業プロフィール × AI 抽出済み要件 → 適合率。
 * 本番では Edge Function で計算し grant_matches に保存する想定。
 */

/** 上位資格は下位資格の要件を満たす */
const CERT_IMPLIES: Partial<Record<Certification, Certification[]>> = {
  security_action_2star: ['security_action_1star'],
};

function hasCert(profile: CompanyProfile, cert: Certification) {
  return profile.certifications.some((c) => c === cert || CERT_IMPLIES[c]?.includes(cert));
}

export interface MatchResult {
  grant: GrantItem;
  score: number;
  checks: MatchCheck[];
}

export function evaluateMatch(profile: CompanyProfile, grant: GrantItem): MatchResult {
  const e = grant.eligibility;
  const checks: MatchCheck[] = [];

  const industryOk = e.industries === 'any' || e.industries.includes(profile.industry);
  checks.push({
    label: '業種',
    weight: 25,
    passed: industryOk,
    detail:
      e.industries === 'any'
        ? '全業種が対象'
        : `対象: ${e.industries.map((i) => INDUSTRY_LABEL[i]).join('・')}`,
    action: industryOk ? undefined : '対象業種外のため申請できません',
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
    action: sizeOk ? undefined : '規模要件を超えているため申請できません',
  });

  const regionOk = e.prefectures === 'any' || e.prefectures.includes(profile.prefecture);
  checks.push({
    label: '所在地',
    weight: 15,
    passed: regionOk,
    detail: e.prefectures === 'any' ? '全国対象' : `対象: ${e.prefectures.join('・')}`,
    action: regionOk ? undefined : '対象地域に事業所がありません',
  });

  const years = yearsSince(profile.founded_on);
  const yearsOk = e.min_years_in_business === null || years >= e.min_years_in_business;
  checks.push({
    label: '事業年数',
    weight: 10,
    passed: yearsOk,
    detail:
      e.min_years_in_business === null
        ? '要件なし'
        : `創業${years}年 / 必要${e.min_years_in_business}年以上`,
  });

  const purposeOk = e.purposes.some((p) => profile.purposes.includes(p));
  checks.push({
    label: '目的',
    weight: 20,
    passed: purposeOk,
    detail: purposeOk ? '登録済みの目的と一致' : '登録済みの目的と不一致',
    action: purposeOk ? undefined : '設備投資・新サービス開発の計画があれば、プロフィールに追加してください',
  });

  const missing = e.required_certifications.filter((c) => !hasCert(profile, c));
  checks.push({
    label: '必要資格',
    weight: 10,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? '要件を満たしています'
        : `未取得: ${missing.map((c) => CERT_LABEL[c]).join('、')}`,
    action: missing.length === 0 ? undefined : `${missing.map((c) => CERT_LABEL[c]).join('、')}の取得を検討してください`,
  });

  // 資格は部分点（取得済みの割合）で評価
  const certRatio =
    e.required_certifications.length === 0 ? 1 : 1 - missing.length / e.required_certifications.length;
  const score = checks.reduce(
    (sum, c) => sum + (c.label === '必要資格' ? c.weight * certRatio : c.passed ? c.weight : 0),
    0,
  );

  return { grant, score: Math.round(score), checks };
}
