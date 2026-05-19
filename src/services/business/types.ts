export type ProspectStage =
  | 'found'
  | 'qualified'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'sold'
  | 'delivered'
  | 'churned';

export type DealStage = 'awaiting_payment' | 'paid' | 'delivered' | 'refunded';

export type DeliverableType = 'email_sequence' | 'prospect_list' | 'canva_design';

export type DeliverableStatus = 'pending' | 'generating' | 'complete' | 'failed';

export interface BusinessStrategy {
  id: number;
  niche: string;
  target_title: string;
  target_company_size_min: number;
  target_company_size_max: number;
  offer_description: string;
  price_usd: number;
  stripe_payment_link: string;
  rationale: string | null;
  active: number;
  created_at_epoch: number;
}

export interface Prospect {
  id: number;
  apollo_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string;
  company: string;
  company_domain: string | null;
  employee_count: number | null;
  industry: string | null;
  linkedin_url: string | null;
  stage: ProspectStage;
  found_at_epoch: number;
  last_contacted_epoch: number | null;
  follow_up_count: number;
  notes: string | null;
  created_at_epoch: number;
  updated_at_epoch: number;
}

export interface Deal {
  id: number;
  prospect_id: number;
  stage: DealStage;
  amount_usd: number;
  stripe_payment_link: string | null;
  payment_reference: string | null;
  gmail_thread_id: string | null;
  paid_at_epoch: number | null;
  created_at_epoch: number;
  updated_at_epoch: number;
}

export interface Deliverable {
  id: number;
  deal_id: number;
  prospect_id: number;
  type: DeliverableType;
  status: DeliverableStatus;
  content: string | null;
  canva_design_id: string | null;
  gmail_draft_id: string | null;
  created_at_epoch: number;
  completed_at_epoch: number | null;
}

export interface BusinessLoopRun {
  id: number;
  run_at_epoch: number;
  prospects_found: number;
  emails_drafted: number;
  deliverables_generated: number;
  errors: string | null;
  duration_ms: number | null;
}

export interface PipelineSummary {
  stages: Record<ProspectStage, number>;
  total_deals: number;
  deals_awaiting_payment: number;
  deals_paid: number;
  deals_delivered: number;
  total_revenue_usd: number;
  last_run_at: number | null;
}

export interface StrategyJson {
  niche: string;
  targetTitle: string;
  companySizeMin: number;
  companySizeMax: number;
  offer: string;
  priceUsd: number;
  rationale: string;
  stripePaymentLink?: string;
}
