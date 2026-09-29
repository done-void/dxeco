import type {
  Certification,
  DocumentSource,
  GrantKind,
  Industry,
  PlanTier,
  SubmissionChannel,
} from '../types';

export const INDUSTRY_LABEL: Record<Industry, string> = {
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

export const CERT_LABEL: Record<Certification, string> = {
  gbiz_id_prime: 'GビズIDプライム',
  security_action_1star: 'SECURITY ACTION ★',
  security_action_2star: 'SECURITY ACTION ★★',
  unified_bid_qualification: '全省庁統一資格',
  local_bid_qualification: '自治体入札参加資格',
  keiei_kakushin: '経営革新計画',
  kenko_keiei: '健康経営優良法人',
};

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export const KIND_META: Record<GrantKind, { label: string; className: string }> = {
  subsidy: { label: '補助金', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15' },
  grant: { label: '助成金', className: 'bg-sky-50 text-sky-700 ring-sky-600/15' },
  tender: { label: '入札', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
};

export const CHANNEL_LABEL: Record<SubmissionChannel, string> = {
  jgrants: 'jGrants（電子申請）',
  prefecture_portal: '都道府県の電子申請窓口',
  e_bidding: '自治体の電子入札システム',
  paper: '郵送・窓口提出',
};

export const SOURCE_LABEL: Record<DocumentSource, string> = {
  applicant: '自社で作成',
  legal_affairs_bureau: '法務局',
  tax_office: '税務署・税事務所',
  vendor: '取引先',
  municipality: '自治体窓口',
  gbiz: 'オンライン手続き',
};
