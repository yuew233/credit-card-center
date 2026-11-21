// 开卡资格规则引擎。
// 间隔一律从「上次拿奖励日期」(lastBonusOn) 起算；没有该日期时用开卡日 + 3 个月估算，并标注“估算”。
// 关卡不重置时钟。所有规则均为公开的银行条款口径，估算值永远标明是估算。

import type { HeldCard } from '../types';
import { MARRIOTT_PAIR, PRODUCT_MAP, SAPPHIRE_FAMILY } from '../data/catalog';
import { addMonths, fmtShort, todayStr } from './dates';
import { ruleNoteEn, t } from './i18n';

export interface Eligibility {
  status: 'eligible' | 'not_yet' | 'unknown';
  light: 'green' | 'red' | 'gray';
  nextEligibleOn: string | null;
  estimated: boolean;
  note: string;
  /** 与另一张卡的冲突提示（如 Marriott 交叉限制），无则为 null。 */
  conflict?: string | null;
}

function latestBonus(cards: HeldCard[]): string | null {
  const ds = cards.map((c) => c.lastBonusOn).filter((d): d is string => !!d);
  if (ds.length === 0) return null;
  return ds.sort().at(-1) ?? null;
}

/** 上次拿奖励日：有实录用实录；没有时按开卡日 + 3 个月估算（奖励一般开卡后约 3 个月到账）。 */
function effectiveBonusOn(card: HeldCard): { date: string | null; estimated: boolean } {
  if (card.lastBonusOn) return { date: card.lastBonusOn, estimated: false };
  if (card.openedOn) return { date: addMonths(card.openedOn, 3), estimated: true };
  return { date: null, estimated: false };
}

function estimateFromOpened(card: HeldCard, months: number, today: string): Eligibility {
  if (card.openedOn) {
    const next = addMonths(card.openedOn, months + 3);
    return {
      status: today >= next ? 'eligible' : 'not_yet',
      light: today >= next ? 'green' : 'red',
      nextEligibleOn: next,
      estimated: true,
      note: t('churn.estimateFromOpened'),
    };
  }
  return {
    status: 'unknown',
    light: 'gray',
    nextEligibleOn: null,
    estimated: false,
    note: t('churn.noDates'),
  };
}

export function evaluateCard(card: HeldCard, allCards: HeldCard[], today: Date): Eligibility {
  const todayS = todayStr(today);
  const product = card.productId ? PRODUCT_MAP.get(card.productId) : undefined;
  if (!product) {
    return {
      status: 'unknown',
      light: 'gray',
      nextEligibleOn: null,
      estimated: false,
      note: t('churn.custom'),
    };
  }
  const rule = product.churn;
  const familyCards = (ids: string[]) => allCards.filter((c) => c.productId && ids.includes(c.productId));

  switch (rule.type) {
    case 'none':
      return {
        status: 'eligible',
        light: 'green',
        nextEligibleOn: null,
        estimated: false,
        note: card.status === 'open' ? t('churn.noRuleOpen') : t('churn.noRule'),
      };
    case 'unknown':
      return {
        status: 'unknown',
        light: 'gray',
        nextEligibleOn: null,
        estimated: false,
        note: ruleNoteEn(rule.note),
      };
    case 'lifetime': {
      if (card.bonusReceived === true) {
        return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: false, note: t('churn.lifetimeTaken') };
      }
      if (card.bonusReceived === false) {
        return { status: 'eligible', light: 'green', nextEligibleOn: null, estimated: false, note: t('churn.lifetimeNotTaken') };
      }
      // 未填是否拿过：按开卡日 + 3 个月估算奖励到账日；已过该日视为已拿过（Space 站同口径）
      const eff = effectiveBonusOn(card);
      if (eff.date && todayS >= eff.date) {
        return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: true, note: t('churn.lifetimeTaken') };
      }
      return { status: 'unknown', light: 'gray', nextEligibleOn: null, estimated: false, note: t('churn.lifetimeUnknown') };
    }
    case 'ever_had': {
      const everHeld = allCards.some((c) => c.productId === product.id);
      if (everHeld) {
        return {
          status: 'not_yet',
          light: 'red',
          nextEligibleOn: null,
          estimated: false,
          note: t('churn.everHad'),
        };
      }
      return { status: 'eligible', light: 'green', nextEligibleOn: null, estimated: false, note: t('churn.everHadNo') };
    }
    case 'months_since_bonus': {
      const months = rule.months ?? 24;
      const lb = card.lastBonusOn;
      if (lb) {
        const next = addMonths(lb, months);
        return {
          status: todayS >= next ? 'eligible' : 'not_yet',
          light: todayS >= next ? 'green' : 'red',
          nextEligibleOn: next,
          estimated: false,
          note: t('churn.monthsSinceBonus', { months }),
        };
      }
      return estimateFromOpened(card, months, todayS);
    }
    case 'sapphire_family': {
      const months = rule.months ?? 48;
      const fam = familyCards(SAPPHIRE_FAMILY);
      const otherOpen = fam.some((c) => c.id !== card.id && c.status === 'open');
      const lb = latestBonus(fam);
      if (lb) {
        const next = addMonths(lb, months);
        if (otherOpen && card.status !== 'open') {
          return {
            status: 'not_yet',
            light: 'red',
            nextEligibleOn: next,
            estimated: false,
            note: t('churn.sapphireBoth', { months }),
          };
        }
        return {
          status: todayS >= next ? 'eligible' : 'not_yet',
          light: todayS >= next ? 'green' : 'red',
          nextEligibleOn: next,
          estimated: false,
          note: t('churn.sapphireMonths', { months }),
        };
      }
      if (otherOpen && card.status !== 'open') {
        return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: false, note: t('churn.sapphireOneOpen') };
      }
      return estimateFromOpened(card, months, todayS);
    }
    case 'ink_family': {
      // Space 站同口径：Ink Cash / Unlimited 同一奖励家族，固定不可（奖励已用）
      return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: false, note: t('churn.inkTaken') };
    }
    case 'marriott_cross': {
      const months = rule.months ?? 24;
      const counterpartId = MARRIOTT_PAIR[product.id];
      const counterpart = counterpartId ? allCards.filter((c) => c.productId === counterpartId) : [];
      const selfEff = effectiveBonusOn(card);
      const otherEffs = counterpart
        .map((c) => effectiveBonusOn(c))
        .filter((e): e is { date: string; estimated: boolean } => e.date !== null);
      const otherLatest = otherEffs.sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1) ?? null;
      const candidates = [selfEff, otherLatest].filter(
        (e): e is { date: string; estimated: boolean } => !!e && e.date !== null,
      );
      const latest = candidates.sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1) ?? null;
      // AmEx 本卡也是一生一次：已拿过（或按开卡日估算奖励已到账）即不可
      if (product.id === 'amex-marriott-brilliant') {
        if (card.bonusReceived === true) {
          return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: false, note: t('churn.marriottLifetime'), conflict: t('churn.marriottConflictBrilliant') };
        }
        if (card.bonusReceived !== false && selfEff.date && todayS >= selfEff.date) {
          return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: true, note: t('churn.marriottLifetime'), conflict: t('churn.marriottConflictBrilliant') };
        }
      }
      if (latest) {
        const next = addMonths(latest.date, months);
        let conflict: string | null = null;
        if (product.id === 'chase-marriott-boundless' && otherLatest) {
          const bonus = otherLatest.estimated
            ? `${fmtShort(otherLatest.date)}，${t('churn.estShort')}`
            : fmtShort(otherLatest.date);
          conflict = t('churn.marriottConflictBoundless', { bonus });
        } else if (product.id === 'amex-marriott-brilliant') {
          conflict = t('churn.marriottConflictBrilliant');
        }
        return {
          status: todayS >= next ? 'eligible' : 'not_yet',
          light: todayS >= next ? 'green' : 'red',
          nextEligibleOn: next,
          estimated: latest.estimated,
          note: t('churn.marriottCross', { months }),
          conflict,
        };
      }
      return estimateFromOpened(card, months, todayS);
    }
    default:
      return { status: 'unknown', light: 'gray', nextEligibleOn: null, estimated: false, note: ruleNoteEn(rule.note) };
  }
}

/** 5/24：过去 24 个月内开的个人卡数量（商业卡不计入）。以开卡日 + 24 个月为截止口径。 */
export function fiveTwentyFour(cards: HeldCard[], today: Date): number {
  const t = todayStr(today);
  return cards.filter(
    (c) => c.kind === 'personal' && c.openedOn && c.openedOn <= t && addMonths(c.openedOn, 24) > t,
  ).length;
}

export interface FiveTwentyFourEntry {
  card: HeldCard;
  /** 掉出 5/24 窗口的日期（开卡日 + 24 个月）。 */
  dropOutOn: string;
}

/** 5/24 明细：过去 24 个月内开的个人卡（已关卡也计入），按开卡日期升序。 */
export function fiveTwentyFourDetail(cards: HeldCard[], today: Date): FiveTwentyFourEntry[] {
  const t = todayStr(today);
  const cutoff = addMonths(t, -24);
  return cards
    .filter((c) => c.kind === 'personal' && c.openedOn && c.openedOn > cutoff && c.openedOn <= t)
    .sort((a, b) => (a.openedOn! < b.openedOn! ? -1 : 1))
    .map((card) => ({ card, dropOutOn: addMonths(card.openedOn!, 24) }));
}
