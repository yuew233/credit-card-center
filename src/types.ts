// 类型定义
// 所有日期均为 YYYY-MM-DD 字符串；金额为美元，FN 类福利用 amount + unit '积分' 表示。

export type Cycle = 'annual' | 'monthly' | 'semiannual' | 'multi_year' | 'per_stay' | 'one_time';
export type CycleAnchor = 'calendar' | 'anniversary';

export interface BenefitTemplate {
  name: string;
  amount: number;
  unit: string; // '' 或 '积分'
  kind: 'cash' | 'perk';
  cycle: Cycle;
  cycleAnchor: CycleAnchor;
  cycleMonths?: number; // multi_year 用，如 48
  half?: 1 | 2; // semiannual 用
  expiresOn?: string; // one_time 用
  fnFromYear2?: boolean; // 免房晚：开卡第二年起才发放
  group?: string; // 如 'doordash'：同组福利合并显示为一张卡
  subLabel?: string; // 合并卡内的分项名，如 '餐饮' / '超市'
  note: string;
}

export type ChurnRuleType =
  | 'none' // 无间隔规则，只看 5/24
  | 'unknown' // 规则待确认
  | 'lifetime' // 一生一次（AmEx 各卡）
  | 'months_since_bonus' // 距上次拿奖励满 N 个月
  | 'ever_had' // 曾经持有过就可能拿不到新奖励
  | 'sapphire_family' // 蓝宝石家族：48 个月 + 家族内只能同时持有一张
  | 'ink_family' // Ink Cash / Unlimited 同一奖励家族
  | 'marriott_cross'; // Marriott 24 个月交叉限制

export interface ChurnRule {
  type: ChurnRuleType;
  months?: number;
  note: string;
}

export interface CardProduct {
  id: string; // slug，如 'chase-sapphire-reserve'
  bank: string;
  name: string;
  annualFee: number | null; // null = 未填
  kind: 'personal' | 'business';
  benefits: BenefitTemplate[];
  churn: ChurnRule;
}

export interface HeldCard {
  id: string;
  productId: string | null; // null = 自定义卡（不在目录里）
  bank: string;
  name: string;
  kind: 'personal' | 'business';
  annualFee: number | null;
  status: 'open' | 'closed';
  openedOn: string | null;
  closedOn: string | null;
  lastBonusOn: string | null; // 上次拿开卡奖励的日期（开卡间隔从这里算）
  bonusReceived: boolean | null; // 是否拿过该卡奖励；null = 待确认
  note: string;
}

export interface BenefitInstance extends BenefitTemplate {
  id: string;
  cardId: string;
  ignored: boolean;
}

export interface BenefitUse {
  id: string;
  benefitId: string;
  amount: number;
  usedOn: string; // YYYY-MM-DD
  note: string;
}

export interface AppState {
  cards: HeldCard[];
  benefits: BenefitInstance[];
  uses: BenefitUse[];
  earnRates: EarnRate[];
  transferBonuses: TransferBonus[];
  transferRates: TransferRate[];
  currencyValues: CurrencyValue[];
}

export interface EarnRate {
  bank: string;
  cardName: string;
  category: string;
  categoryLabel: string;
  rank: number; // 0 = 未持有、可考虑；1 = 首选；2+ = 次选
  rateText: string;
  reason: string;
  note: string;
  pending: boolean; // 待确认
  quarterly: boolean; // 季度轮换类别
  validUntil: string | null;
  verifiedOn: string;
}

export interface TransferBonus {
  currency: string;
  partner: string;
  bonusPct: number;
  endsOn: string;
  note: string;
  verifiedOn: string;
}

export interface TransferRate {
  currency: string;
  partner: string;
  kind: 'airline' | 'hotel';
  ratioFrom: number;
  ratioTo: number;
  star: boolean;
  starReason: string;
  valueCents: number | null;
  valueLow: number | null;
  valueHigh: number | null;
  arrival: string;
  minTransfer: number | null;
  note: string;
  verifiedOn: string;
}

export interface CurrencyValue {
  currency: string;
  valueCents: number;
  note: string;
  verifiedOn: string;
}
