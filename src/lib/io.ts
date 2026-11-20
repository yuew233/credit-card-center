// 导入 / 导出：纯函数，可在 node 里单测。
// 导出格式：{"app":"credit-card-center","version":1,"exportedAt":"<ISO>",
//   "cards":[...],"benefits":[...],"uses":[...],
//   "earnRates":[...],"transferRates":[...],"transferBonuses":[...],"currencyValues":[...]}
// 导入接受：完整备份、或只有 cards 的最小文件；字段名接受驼峰或下划线两种写法。
// 导入是“合并”：卡按（银行 + 卡名）匹配，福利按（卡 + 福利名）匹配，
// 转分按（货币 + 伙伴）匹配，奖励按（货币 + 伙伴）匹配，估值按货币匹配，使用记录按 id 匹配。
// 卡只需要银行 + 卡名就能导入；开卡日期等字段未知时存为 null，界面显示“待确认”，绝不编造日期。
// 校验失败时整个导入不执行（不做部分导入）。

import type {
  AppState,
  BenefitInstance,
  BenefitTemplate,
  BenefitUse,
  CurrencyValue,
  Cycle,
  CycleAnchor,
  EarnRate,
  HeldCard,
  TransferBonus,
  TransferRate,
} from '../types';
import { PRODUCT_MAP } from '../data/catalog';
import { uid } from './dates';

export interface ExportFile {
  app: 'credit-card-center';
  version: 1;
  exportedAt: string;
  cards: HeldCard[];
  benefits: BenefitInstance[];
  uses: BenefitUse[];
  earnRates: EarnRate[];
  transferRates: TransferRate[];
  transferBonuses: TransferBonus[];
  currencyValues: CurrencyValue[];
}

export function buildExportFile(state: AppState): ExportFile {
  return {
    app: 'credit-card-center',
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: state.cards,
    benefits: state.benefits,
    uses: state.uses,
    earnRates: state.earnRates,
    transferRates: state.transferRates,
    transferBonuses: state.transferBonuses,
    currencyValues: state.currencyValues,
  };
}

// ---------- 校验与归一化 ----------

type Obj = Record<string, unknown>;

function isObj(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function pick<T>(o: Obj, camel: string, snake: string): T | undefined {
  if (camel in o) return o[camel] as T;
  if (snake in o) return o[snake] as T;
  return undefined;
}

function has(o: Obj, camel: string, snake: string): boolean {
  return camel in o || snake in o;
}

function reqStr(o: Obj, camel: string, snake: string, label: string): string {
  const v = pick<unknown>(o, camel, snake);
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${label}缺少必填项 ${camel}`);
  return v.trim();
}

function optStr(o: Obj, camel: string, snake: string, fallback = ''): string {
  const v = pick<unknown>(o, camel, snake);
  return typeof v === 'string' ? v : fallback;
}

function optNum(o: Obj, camel: string, snake: string, fallback: number | null = null): number | null {
  const v = pick<unknown>(o, camel, snake);
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`字段 ${camel} 应为数字`);
  return v;
}

function optBool(o: Obj, camel: string, snake: string, fallback = false): boolean {
  const v = pick<unknown>(o, camel, snake);
  if (v === undefined || v === null) return fallback;
  if (typeof v !== 'boolean') throw new Error(`字段 ${camel} 应为 true/false`);
  return v;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function optDate(o: Obj, camel: string, snake: string): string | null {
  const v = pick<unknown>(o, camel, snake);
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !isValidDateStr(v)) throw new Error(`日期格式不对：${String(v)}（应为 YYYY-MM-DD）`);
  return v;
}

function strId(v: unknown): string | undefined {
  if (typeof v === 'string' && v) return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

const CYCLES: Cycle[] = ['annual', 'monthly', 'semiannual', 'multi_year', 'per_stay', 'one_time'];

export interface NormalizedCard {
  id?: string;
  bank: string;
  name: string;
  productId?: string | null;
  kind: 'personal' | 'business';
  annualFee: number | null;
  status: 'open' | 'closed';
  openedOn: string | null;
  closedOn: string | null;
  lastBonusOn: string | null;
  bonusReceived: boolean | null;
  note: string;
  present: Set<string>;
}

export interface NormalizedBenefit {
  id?: string;
  cardId?: string;
  cardBank?: string;
  cardName?: string;
  name: string;
  amount: number;
  unit: string;
  kind: 'cash' | 'perk';
  cycle: Cycle;
  cycleAnchor: CycleAnchor;
  cycleMonths?: number;
  half?: 1 | 2;
  expiresOn?: string | null;
  ignored: boolean;
  note: string;
  group?: string;
  subLabel?: string;
  fnFromYear2?: boolean;
}

export interface NormalizedUse {
  id?: string;
  benefitId?: string;
  amount: number;
  usedOn: string;
  note: string;
}

export interface ParsedImport {
  hasBenefits: boolean;
  cards: NormalizedCard[];
  benefits: NormalizedBenefit[];
  uses: NormalizedUse[];
  earnRates: EarnRate[];
  transferRates: TransferRate[];
  transferBonuses: TransferBonus[];
  currencyValues: CurrencyValue[];
}

function normalizeCard(raw: unknown, i: number): NormalizedCard {
  if (!isObj(raw)) throw new Error(`cards[${i}] 不是一个对象`);
  const name = reqStr(raw, 'name', 'name', `cards[${i}]`);
  const bank = optStr(raw, 'bank', 'bank');
  const present = new Set<string>();
  for (const [c, s] of [
    ['kind', 'kind'],
    ['status', 'status'],
    ['annualFee', 'annual_fee'],
    ['bonusReceived', 'bonus_received'],
    ['note', 'note'],
    ['productId', 'product_id'],
  ] as const) {
    if (has(raw, c, s)) present.add(c);
  }
  const kindRaw = pick<unknown>(raw, 'kind', 'kind');
  const kind: 'personal' | 'business' = kindRaw === 'business' ? 'business' : 'personal';
  const statusRaw = pick<unknown>(raw, 'status', 'status');
  const status: 'open' | 'closed' = statusRaw === 'closed' ? 'closed' : 'open';
  const annualFee = optNum(raw, 'annualFee', 'annual_fee');
  const bonusRaw = pick<unknown>(raw, 'bonusReceived', 'bonus_received');
  const bonusReceived = typeof bonusRaw === 'boolean' ? bonusRaw : null;
  return {
    id: strId(pick(raw, 'id', 'id')),
    bank,
    name,
    productId: typeof pick(raw, 'productId', 'product_id') === 'string' ? (pick(raw, 'productId', 'product_id') as string) : null,
    kind,
    annualFee,
    status,
    openedOn: optDate(raw, 'openedOn', 'opened_on'),
    closedOn: optDate(raw, 'closedOn', 'closed_on'),
    lastBonusOn: optDate(raw, 'lastBonusOn', 'last_bonus_on'),
    bonusReceived,
    note: optStr(raw, 'note', 'note'),
    present,
  };
}

function normalizeBenefit(raw: unknown, i: number): NormalizedBenefit {
  if (!isObj(raw)) throw new Error(`benefits[${i}] 不是一个对象`);
  const name = reqStr(raw, 'name', 'name', `benefits[${i}]`);
  const cycleRaw = pick<unknown>(raw, 'cycle', 'cycle');
  const cycle: Cycle = typeof cycleRaw === 'string' && (CYCLES as string[]).includes(cycleRaw) ? (cycleRaw as Cycle) : 'annual';
  const anchorRaw = pick<unknown>(raw, 'cycleAnchor', 'cycle_anchor');
  const cycleAnchor: CycleAnchor = anchorRaw === 'anniversary' ? 'anniversary' : 'calendar';
  const amount = optNum(raw, 'amount', 'amount', 0) ?? 0;
  const kindRaw = pick<unknown>(raw, 'kind', 'kind');
  const halfRaw = pick<unknown>(raw, 'half', 'half');
  const group = pick<unknown>(raw, 'group', 'group');
  const subLabel = pick<unknown>(raw, 'subLabel', 'sub_label');
  const fnRaw = pick<unknown>(raw, 'fnFromYear2', 'fn_from_year_2');
  return {
    id: strId(pick(raw, 'id', 'id')),
    cardId: strId(pick(raw, 'cardId', 'card_id')),
    cardBank: typeof pick(raw, 'cardBank', 'card_bank') === 'string' ? (pick(raw, 'cardBank', 'card_bank') as string) : undefined,
    cardName: typeof pick(raw, 'cardName', 'card_name') === 'string' ? (pick(raw, 'cardName', 'card_name') as string) : undefined,
    name,
    amount,
    unit: optStr(raw, 'unit', 'unit'),
    kind: kindRaw === 'perk' ? 'perk' : 'cash',
    cycle,
    cycleAnchor,
    cycleMonths: optNum(raw, 'cycleMonths', 'cycle_months') ?? undefined,
    half: halfRaw === 1 || halfRaw === 2 ? halfRaw : undefined,
    expiresOn: optDate(raw, 'expiresOn', 'expires_on'),
    ignored: optBool(raw, 'ignored', 'ignored'),
    note: optStr(raw, 'note', 'note'),
    group: typeof group === 'string' ? group : undefined,
    subLabel: typeof subLabel === 'string' ? subLabel : undefined,
    fnFromYear2: typeof fnRaw === 'boolean' ? fnRaw : undefined,
  };
}

function normalizeUse(raw: unknown, i: number): NormalizedUse {
  if (!isObj(raw)) throw new Error(`uses[${i}] 不是一个对象`);
  const amount = optNum(raw, 'amount', 'amount', 0) ?? 0;
  const usedOn = optDate(raw, 'usedOn', 'used_on');
  if (!usedOn) throw new Error(`uses[${i}] 缺少有效的 usedOn 日期`);
  return {
    id: strId(pick(raw, 'id', 'id')),
    benefitId: strId(pick(raw, 'benefitId', 'benefit_id')),
    amount,
    usedOn,
    note: optStr(raw, 'note', 'note'),
  };
}

function normalizeEarnRate(raw: unknown, i: number): EarnRate {
  if (!isObj(raw)) throw new Error(`earnRates[${i}] 不是一个对象`);
  const category = reqStr(raw, 'category', 'category', `earnRates[${i}]`);
  const cardName = reqStr(raw, 'cardName', 'card_name', `earnRates[${i}]`);
  const sourceRaw = pick<unknown>(raw, 'source', 'source');
  const marketRank = optNum(raw, 'marketRank', 'market_rank');
  return {
    bank: optStr(raw, 'bank', 'bank'),
    cardName,
    category,
    categoryLabel: optStr(raw, 'categoryLabel', 'category_label') || category,
    rank: optNum(raw, 'rank', 'rank', 99) ?? 99,
    rateText: optStr(raw, 'rateText', 'rate_text'),
    reason: optStr(raw, 'reason', 'reason'),
    note: optStr(raw, 'note', 'note'),
    pending: optBool(raw, 'pending', 'pending'),
    quarterly: optBool(raw, 'quarterly', 'quarterly'),
    validUntil: optDate(raw, 'validUntil', 'valid_until'),
    verifiedOn: optStr(raw, 'verifiedOn', 'verified_on'),
    source: sourceRaw === 'market' ? 'market' : 'mine',
    marketRank,
    feeText: optStr(raw, 'feeText', 'fee_text'),
    sourceNote: optStr(raw, 'sourceNote', 'source_note'),
  };
}

function normalizeTransferRate(raw: unknown, i: number): TransferRate {
  if (!isObj(raw)) throw new Error(`transferRates[${i}] 不是一个对象`);
  const currency = reqStr(raw, 'currency', 'currency', `transferRates[${i}]`);
  const partner = reqStr(raw, 'partner', 'partner', `transferRates[${i}]`);
  const kindRaw = pick<unknown>(raw, 'kind', 'kind');
  return {
    currency,
    partner,
    kind: kindRaw === 'hotel' ? 'hotel' : 'airline',
    ratioFrom: optNum(raw, 'ratioFrom', 'ratio_from', 1) ?? 1,
    ratioTo: optNum(raw, 'ratioTo', 'ratio_to', 1) ?? 1,
    star: optBool(raw, 'star', 'star'),
    starReason: optStr(raw, 'starReason', 'star_reason'),
    valueCents: optNum(raw, 'valueCents', 'value_cents'),
    valueLow: optNum(raw, 'valueLow', 'value_low'),
    valueHigh: optNum(raw, 'valueHigh', 'value_high'),
    arrival: optStr(raw, 'arrival', 'arrival'),
    minTransfer: optNum(raw, 'minTransfer', 'min_transfer'),
    note: optStr(raw, 'note', 'note'),
    verifiedOn: optStr(raw, 'verifiedOn', 'verified_on'),
  };
}

function normalizeTransferBonus(raw: unknown, i: number): TransferBonus {
  if (!isObj(raw)) throw new Error(`transferBonuses[${i}] 不是一个对象`);
  return {
    currency: reqStr(raw, 'currency', 'currency', `transferBonuses[${i}]`),
    partner: reqStr(raw, 'partner', 'partner', `transferBonuses[${i}]`),
    bonusPct: optNum(raw, 'bonusPct', 'bonus_pct', 0) ?? 0,
    endsOn: optDate(raw, 'endsOn', 'ends_on') ?? '',
    note: optStr(raw, 'note', 'note'),
    verifiedOn: optStr(raw, 'verifiedOn', 'verified_on'),
  };
}

function normalizeCurrencyValue(raw: unknown, i: number): CurrencyValue {
  if (!isObj(raw)) throw new Error(`currencyValues[${i}] 不是一个对象`);
  return {
    currency: reqStr(raw, 'currency', 'currency', `currencyValues[${i}]`),
    valueCents: optNum(raw, 'valueCents', 'value_cents', 0) ?? 0,
    note: optStr(raw, 'note', 'note'),
    verifiedOn: optStr(raw, 'verifiedOn', 'verified_on'),
  };
}

function asArray(v: unknown, label: string): unknown[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new Error(`${label} 应为数组`);
  return v;
}

/** 解析并完整校验一个导入文件；任何问题都抛错，调用方不做部分导入。 */
export function parseImportFile(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('不是有效的 JSON 文件');
  }
  if (!isObj(data)) throw new Error('文件顶层应为一个对象');
  const app = pick<unknown>(data, 'app', 'app');
  if (app !== undefined && app !== 'credit-card-center') throw new Error('不是信用卡中心的备份文件');
  const version = pick<unknown>(data, 'version', 'version');
  if (version !== undefined && version !== 1) throw new Error(`不支持的备份版本：${String(version)}`);
  const hasCards = 'cards' in data;
  const hasBenefits = 'benefits' in data;
  const hasUses = 'uses' in data;
  const hasEarn = 'earnRates' in data || 'earn_rates' in data;
  const hasTransfer = 'transferRates' in data || 'transfer_rates' in data;
  const hasBonus = 'transferBonuses' in data || 'transfer_bonuses' in data;
  const hasCurrency = 'currencyValues' in data || 'currency_values' in data;
  if (!hasCards && !hasBenefits && !hasUses && !hasEarn && !hasTransfer && !hasBonus && !hasCurrency) {
    throw new Error('文件里没有找到任何数据（需要 cards / benefits / earnRates / transferRates / transferBonuses / currencyValues 其中至少一个）');
  }
  return {
    hasBenefits,
    cards: asArray(pick(data, 'cards', 'cards'), 'cards').map((x, i) => normalizeCard(x, i)),
    benefits: asArray(pick(data, 'benefits', 'benefits'), 'benefits').map((x, i) => normalizeBenefit(x, i)),
    uses: asArray(pick(data, 'uses', 'uses'), 'uses').map((x, i) => normalizeUse(x, i)),
    earnRates: asArray(pick(data, 'earnRates', 'earn_rates'), 'earnRates').map((x, i) => normalizeEarnRate(x, i)),
    transferRates: asArray(pick(data, 'transferRates', 'transfer_rates'), 'transferRates').map((x, i) => normalizeTransferRate(x, i)),
    transferBonuses: asArray(pick(data, 'transferBonuses', 'transfer_bonuses'), 'transferBonuses').map((x, i) => normalizeTransferBonus(x, i)),
    currencyValues: asArray(pick(data, 'currencyValues', 'currency_values'), 'currencyValues').map((x, i) => normalizeCurrencyValue(x, i)),
  };
}

// ---------- 合并 ----------

export interface ImportSummary {
  cardsAdded: number;
  cardsUpdated: number;
  benefitsAdded: number;
  benefitsUpdated: number;
  usesAdded: number;
  earnAdded: number;
  earnUpdated: number;
  transferRatesAdded: number;
  transferRatesUpdated: number;
  bonusesAdded: number;
  bonusesUpdated: number;
  currencyUpdated: number;
}

// 卡名规范化：去尾部括号备注（半角和全角都去，如 "Sapphire Reserve (CSR)"、"Ink Business Unlimited（第二张）"），忽略大小写。
// 用户手写导入文件时常写简称（"Sapphire Reserve"），规范化后仍能匹配到目录产品并自动生成福利。
function normalizeCardName(name: string): string {
  return name.replace(/\s*[（(][^)）]*[)）]\s*$/, '').trim().toLowerCase();
}

export function resolveProductId(c: NormalizedCard): string | null {
  if (c.productId && PRODUCT_MAP.has(c.productId)) return c.productId;
  const byName = [...PRODUCT_MAP.values()].find((p) => p.name === c.name && (!c.bank || p.bank === c.bank));
  if (byName) return byName.id;
  const norm = normalizeCardName(c.name);
  const byNorm = [...PRODUCT_MAP.values()].filter(
    (p) => normalizeCardName(p.name) === norm && (!c.bank || p.bank === c.bank),
  );
  if (byNorm.length === 1) return byNorm[0].id;
  // “Premier”→“Premier / Strata Premier”：取目录名中 " / " 前的部分匹配。
  const byFirstPart = [...PRODUCT_MAP.values()].filter(
    (p) => normalizeCardName(p.name).split(' / ')[0] === norm && (!c.bank || p.bank === c.bank),
  );
  if (byFirstPart.length === 1) return byFirstPart[0].id;
  // 兜底：去括号后的名字是目录产品名的前缀时取目录顺序第一位（如老名字 “Ink Business”→ Ink Business Preferred）。
  // 只是尽力而为的匹配，名字本身不改；匹配不到时返回 null，分类显示待确认。
  const byPrefix = [...PRODUCT_MAP.values()].filter(
    (p) => norm.length > 0 && normalizeCardName(p.name).startsWith(norm) && (!c.bank || p.bank === c.bank),
  );
  if (byPrefix.length >= 1) return byPrefix[0].id;
  return null;
}

function templateFor(productId: string | null, name: string): BenefitTemplate | undefined {
  if (!productId) return undefined;
  const product = PRODUCT_MAP.get(productId);
  return product?.benefits.find((t) => t.name === name);
}

/** 把解析好的导入合并进当前状态（纯函数，不改原状态）。 */
export function mergeImport(prev: AppState, parsed: ParsedImport): { state: AppState; summary: ImportSummary } {
  const state: AppState = structuredClone(prev);
  const summary: ImportSummary = {
    cardsAdded: 0,
    cardsUpdated: 0,
    benefitsAdded: 0,
    benefitsUpdated: 0,
    usesAdded: 0,
    earnAdded: 0,
    earnUpdated: 0,
    transferRatesAdded: 0,
    transferRatesUpdated: 0,
    bonusesAdded: 0,
    bonusesUpdated: 0,
    currencyUpdated: 0,
  };

  // ---- 卡：按 id 匹配，其次按（银行 + 卡名）匹配 ----
  const cardIdMap = new Map<string, string>(); // 文件里的卡 id -> 合并后状态里的卡 id
  const cardKey = (bank: string, name: string) => `${bank}\x00${name}`;
  const cardByKey = new Map(state.cards.map((c) => [cardKey(c.bank, c.name), c]));
  const cardById = new Map(state.cards.map((c) => [c.id, c]));

  for (const c of parsed.cards) {
    let existing: HeldCard | undefined;
    if (c.id && cardById.has(c.id)) existing = cardById.get(c.id);
    else existing = cardByKey.get(cardKey(c.bank, c.name));
    if (existing) {
      if (c.id) cardIdMap.set(c.id, existing.id);
      // 文件里有的字段覆盖；日期字段只有给了真实日期才覆盖（文件里缺失/未知不抹掉已有日期）
      if (c.present.has('kind')) existing.kind = c.kind;
      if (c.present.has('status')) existing.status = c.status;
      if (c.present.has('annualFee')) existing.annualFee = c.annualFee;
      if (c.present.has('bonusReceived')) existing.bonusReceived = c.bonusReceived;
      if (c.present.has('note')) existing.note = c.note;
      if (c.present.has('productId')) existing.productId = resolveProductId(c);
      if (c.openedOn) existing.openedOn = c.openedOn;
      if (c.closedOn) existing.closedOn = c.closedOn;
      if (c.lastBonusOn) existing.lastBonusOn = c.lastBonusOn;
      summary.cardsUpdated += 1;
    } else {
      const productId = resolveProductId(c);
      const card: HeldCard = {
        id: c.id ?? uid(),
        productId,
        bank: c.bank,
        name: c.name,
        kind: c.kind,
        annualFee: c.annualFee,
        status: c.status,
        openedOn: c.openedOn,
        closedOn: c.closedOn,
        lastBonusOn: c.lastBonusOn,
        bonusReceived: c.bonusReceived,
        note: c.note,
      };
      state.cards.push(card);
      cardByKey.set(cardKey(card.bank, card.name), card);
      cardById.set(card.id, card);
      if (c.id) cardIdMap.set(c.id, card.id);
      summary.cardsAdded += 1;
      // 只有纯卡片文件（文件里完全没有 benefits）才按产品模板自动生成福利；
      // 有 benefits 数组的文件以文件为准，不自动生成。
      if (!parsed.hasBenefits) {
        const product = productId ? PRODUCT_MAP.get(productId) : undefined;
        const templates = product ? product.benefits : [];
        templates.forEach((t) => {
          state.benefits.push({ ...t, id: uid(), cardId: card.id, ignored: false });
        });
      }
    }
  }

  // ---- 福利：按 id 匹配，其次按（卡 + 福利名）匹配 ----
  const benefitIdMap = new Map<string, string>();
  const benefitById = new Map(state.benefits.map((b) => [b.id, b]));
  const benefitByKey = new Map(state.benefits.map((b) => [`${b.cardId}\x00${b.name}`, b]));

  for (const b of parsed.benefits) {
    let cardId: string | undefined;
    if (b.cardId && cardIdMap.has(b.cardId)) cardId = cardIdMap.get(b.cardId);
    else if (b.cardId && cardById.has(b.cardId)) cardId = b.cardId;
    else if (b.cardBank !== undefined && b.cardName) {
      cardId = cardByKey.get(cardKey(b.cardBank, b.cardName))?.id;
    }
    if (!cardId) throw new Error(`福利「${b.name}」找不到对应的卡，无法导入`);
    let existing: BenefitInstance | undefined;
    if (b.id && benefitById.has(b.id)) existing = benefitById.get(b.id);
    else existing = benefitByKey.get(`${cardId}\x00${b.name}`);
    // 缺少的模板字段（group / subLabel / fnFromYear2 等）从卡产品模板补齐
    const card = cardById.get(cardId);
    const tpl = templateFor(card?.productId ?? null, b.name);
    const full: BenefitInstance = {
      id: b.id ?? uid(),
      cardId,
      name: b.name,
      amount: b.amount,
      unit: b.unit,
      kind: b.kind,
      cycle: b.cycle,
      cycleAnchor: b.cycleAnchor,
      cycleMonths: b.cycleMonths ?? tpl?.cycleMonths,
      half: b.half ?? tpl?.half,
      expiresOn: b.expiresOn ?? tpl?.expiresOn,
      ignored: b.ignored,
      note: b.note,
      group: b.group ?? tpl?.group,
      subLabel: b.subLabel ?? tpl?.subLabel,
      fnFromYear2: b.fnFromYear2 ?? tpl?.fnFromYear2,
    };
    if (existing) {
      if (b.id) benefitIdMap.set(b.id, existing.id);
      Object.assign(existing, full, { id: existing.id, cardId: existing.cardId });
      summary.benefitsUpdated += 1;
    } else {
      state.benefits.push(full);
      benefitById.set(full.id, full);
      benefitByKey.set(`${full.cardId}\x00${full.name}`, full);
      if (b.id) benefitIdMap.set(b.id, full.id);
      summary.benefitsAdded += 1;
    }
  }

  // ---- 使用记录：按 id 匹配，已有的跳过 ----
  const useIds = new Set(state.uses.map((u) => u.id));
  for (const u of parsed.uses) {
    if (u.id && useIds.has(u.id)) continue;
    let benefitId: string | undefined;
    if (u.benefitId && benefitIdMap.has(u.benefitId)) benefitId = benefitIdMap.get(u.benefitId);
    else if (u.benefitId && benefitById.has(u.benefitId)) benefitId = u.benefitId;
    if (!benefitId) throw new Error(`使用记录（${u.usedOn} $${u.amount}）找不到对应的福利，无法导入`);
    const use: BenefitUse = { id: u.id ?? uid(), benefitId, amount: u.amount, usedOn: u.usedOn, note: u.note };
    state.uses.push(use);
    useIds.add(use.id);
    summary.usesAdded += 1;
  }

  // ---- 刷卡返现：按（类别 + 卡名 + 来源）匹配 ----
  const earnByKey = new Map(state.earnRates.map((r) => [`${r.category}\x00${r.cardName}\x00${r.source}`, r]));
  for (const r of parsed.earnRates) {
    const key = `${r.category}\x00${r.cardName}\x00${r.source}`;
    const existing = earnByKey.get(key);
    if (existing) {
      Object.assign(existing, r);
      summary.earnUpdated += 1;
    } else {
      state.earnRates.push({ ...r });
      earnByKey.set(key, state.earnRates[state.earnRates.length - 1]);
      summary.earnAdded += 1;
    }
  }

  // ---- 转分比例：按（货币 + 伙伴）匹配 ----
  const rateByKey = new Map(state.transferRates.map((r) => [`${r.currency}\x00${r.partner}`, r]));
  for (const r of parsed.transferRates) {
    const key = `${r.currency}\x00${r.partner}`;
    const existing = rateByKey.get(key);
    if (existing) {
      Object.assign(existing, r);
      summary.transferRatesUpdated += 1;
    } else {
      state.transferRates.push({ ...r });
      rateByKey.set(key, state.transferRates[state.transferRates.length - 1]);
      summary.transferRatesAdded += 1;
    }
  }

  // ---- 转分奖励：按（货币 + 伙伴）匹配 ----
  const bonusByKey = new Map(state.transferBonuses.map((b) => [`${b.currency}\x00${b.partner}`, b]));
  for (const b of parsed.transferBonuses) {
    const key = `${b.currency}\x00${b.partner}`;
    const existing = bonusByKey.get(key);
    if (existing) {
      Object.assign(existing, b);
      summary.bonusesUpdated += 1;
    } else {
      state.transferBonuses.push({ ...b });
      bonusByKey.set(key, state.transferBonuses[state.transferBonuses.length - 1]);
      summary.bonusesAdded += 1;
    }
  }

  // ---- 积分估值：按货币匹配 ----
  const valueByKey = new Map(state.currencyValues.map((v) => [v.currency, v]));
  for (const v of parsed.currencyValues) {
    const existing = valueByKey.get(v.currency);
    if (existing) {
      Object.assign(existing, v);
      summary.currencyUpdated += 1;
    } else {
      state.currencyValues.push({ ...v });
      valueByKey.set(v.currency, state.currencyValues[state.currencyValues.length - 1]);
      summary.currencyUpdated += 1;
    }
  }

  return { state, summary };
}
