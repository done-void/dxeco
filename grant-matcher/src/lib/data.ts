import mockData from '../data/mockData.json';
import type { ApplicationPrep, CompanyProfile, GrantItem, PartnerOffice } from '../types';
import { evaluateMatch } from './matching';

export const { company, grants, partners, preps } = mockData as unknown as {
  company: CompanyProfile;
  grants: GrantItem[];
  partners: PartnerOffice[];
  preps: ApplicationPrep[];
};

/** データは静的なので、適合判定はモジュール読み込み時に 1 回だけ行う */
export const matches = grants
  .filter((g) => g.status === 'open')
  .map((g) => evaluateMatch(company, g))
  .filter((m) => m.score >= company.notify_threshold)
  .sort((a, b) => b.score - a.score);
