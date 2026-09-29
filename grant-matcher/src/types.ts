/**
 * HojoRadar — ドメイン型定義
 *
 * Supabase (PostgreSQL) の行型をそのまま表現する。
 * - 日時は ISO 8601 文字列 (timestamptz)
 * - 金額は円単位の整数 (bigint)
 * - ネストしたオブジェクトは jsonb カラム
 * 対応する DDL は supabase/schema.sql を参照。
 */

// ---------------------------------------------------------------------------
// 共通の列挙型
// ---------------------------------------------------------------------------

/** 業種（日本標準産業分類の大分類を SaaS 向けに簡略化） */
export type Industry =
  | 'it_software' // 情報通信業（ソフトウェア・Web制作）
  | 'manufacturing' // 製造業
  | 'retail' // 卸売・小売業
  | 'construction' // 建設業
  | 'food_service' // 宿泊・飲食サービス業
  | 'healthcare' // 医療・福祉
  | 'logistics' // 運輸・物流業
  | 'professional_services' // 専門・技術サービス業
  | 'other';

/** 資金調達・案件探しの目的 */
export type FundingPurpose =
  | 'dx' // DX・ITツール導入
  | 'equipment' // 設備投資
  | 'hiring' // 採用・人材育成
  | 'rnd' // 研究開発・新製品
  | 'sales_expansion' // 販路開拓
  | 'overseas' // 海外展開
  | 'energy_saving' // 省エネ・GX
  | 'public_contract'; // 官公庁案件の受注

/** 保有資格・認定（申請要件に頻出するもの） */
export type Certification =
  | 'gbiz_id_prime' // gBizIDプライム
  | 'security_action_1star' // SECURITY ACTION 一つ星
  | 'security_action_2star' // SECURITY ACTION 二つ星
  | 'unified_bid_qualification' // 全省庁統一資格
  | 'local_bid_qualification' // 自治体の入札参加資格
  | 'keiei_kakushin' // 経営革新計画の承認
  | 'kenko_keiei'; // 健康経営優良法人

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

// ---------------------------------------------------------------------------
// companies テーブル
// ---------------------------------------------------------------------------

export interface CompanyProfile {
  id: string; // uuid (PK)
  owner_user_id: string; // uuid (FK -> auth.users.id)
  company_name: string;
  corporate_number: string | null; // 法人番号（13桁）
  industry: Industry;
  industry_detail: string | null; // 例: "Web制作・UI/UXデザイン"
  prefecture: string; // 例: "東京都"
  city: string | null;
  capital_jpy: number; // 資本金
  employee_count: number; // 常時使用する従業員数
  founded_on: string; // 設立日 (date)
  annual_revenue_jpy: number | null;
  purposes: FundingPurpose[]; // 目的（複数可）
  keywords: string[]; // マッチング精度を上げる自由キーワード
  certifications: Certification[];
  plan: PlanTier;
  /** この適合率(%)以上の案件のみ通知する */
  notify_threshold: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// grants テーブル
// ---------------------------------------------------------------------------

export type GrantKind = 'subsidy' | 'grant' | 'tender'; // 補助金 / 助成金 / 入札
export type GrantStatus = 'upcoming' | 'open' | 'closed';

/** クローラーが取得した「生データ」 — AI 処理の入力、監査用に原文を保持 */
export interface GrantRawData {
  source_url: string; // 公募ページURL
  document_urls: string[]; // 公募要領 PDF 等
  raw_title: string; // 原文のタイトル（お役所言葉のまま）
  raw_text_excerpt: string; // PDF から抽出した本文（抜粋）
  content_hash: string; // 差分検知用 (sha256)
  fetched_at: string;
}

/** AI が公募要領から抽出した構造化済みの対象条件 — マッチング計算に使う */
export interface EligibilityCriteria {
  industries: Industry[] | 'any';
  prefectures: string[] | 'any';
  max_employees: number | null; // 中小企業要件など
  max_capital_jpy: number | null;
  min_years_in_business: number | null;
  purposes: FundingPurpose[]; // 該当する用途
  required_certifications: Certification[];
}

/** 経営者が 3 行で判断できる AI サマリー */
export interface AiSummary {
  target: string; // 対象者
  amount: string; // 上限額・補助率
  requirement: string; // 必須要件
}

export interface GrantItem {
  id: string; // uuid (PK)
  kind: GrantKind;
  title: string; // AI が平易に書き直したタイトル
  agency: string; // 実施機関
  status: GrantStatus;

  // --- 生データ -------------------------------------------------------------
  raw: GrantRawData; // jsonb

  // --- AI 抽出・要約データ --------------------------------------------------
  ai_summary: AiSummary; // jsonb
  eligibility: EligibilityCriteria; // jsonb
  max_amount_jpy: number; // 上限額（入札の場合は予定価格）
  subsidy_rate: string | null; // 例: "2/3"（入札は null）
  application_start: string | null;
  deadline: string; // 申請・入札締切
  tags: string[];
  ai_model: string;
  ai_confidence: number; // 0〜1、抽出結果の自己評価
  ai_extracted_at: string;

  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// grant_matches テーブル（企業 × 案件のマッチング結果）
// ---------------------------------------------------------------------------

export interface MatchCheck {
  label: string; // 例: "従業員数"
  passed: boolean;
  detail: string; // 例: "15名 ≤ 上限300名"
  weight: number;
}

export interface GrantMatch {
  company_id: string;
  grant_id: string;
  score: number; // 0〜100 の適合率
  checks: MatchCheck[]; // jsonb
  notified_at: string | null;
  created_at: string;
}
