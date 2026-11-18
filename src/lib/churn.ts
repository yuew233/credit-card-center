// 开卡资格规则引擎。
// 间隔一律从「上次拿奖励日期」(lastBonusOn) 起算；没有该日期时用开卡日 + 3 个月估算，并标注“估算”。
// 关卡不重置时钟。所有规则均为公开的银行条款口径，估算值永远标明是估算。

import type { HeldCard } from '../types';
import { INK_FAMILY, MARRIOTT_PAIR, PRODUCT_MAP, SAPPHIRE_FAMILY } from '../data/catalog';
import { addMonths, todayStr } from './dates';

export interface Eligibility {
  status: 'eligible' | 'not_yet' | 'unknown';
  light: 'green' | 'red' | 'gray';
  nextEligibleOn: string | null;
  estimated: boolean;
  note: string;
}

function monthsSince(dateStr: string, today: string): number {
  const [y1, m1, d1] = dateStr.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + (d2 - d1) / 30;
}

function latestBonus(cards: HeldCard[]): string | null {
  const ds = cards.map((c) => c.lastBonusOn).filter((d): d is string => !!d);
  if (ds.length === 0) return null;
  return ds.sort().at(-1) ?? null;
}

function estimateFromOpened(card: HeldCard, months: number, today: string): Eligibility {
  if (card.openedOn) {
    const next = addMonths(card.openedOn, months + 3);
    return {
      status: today >= next ? 'eligible' : 'not_yet',
      light: today >= next ? 'green' : 'red',
      nextEligibleOn: next,
      estimated: true,
      note: `未填上次拿奖励日期，按开卡日 + 3 个月估算。`,
    };
  }
  return {
    status: 'unknown',
    light: 'gray',
    nextEligibleOn: null,
    estimated: false,
    note: '缺少开卡日和上次拿奖励日期，无法判断。',
  };
}

export function evaluateCard(card: HeldCard, allCards: HeldCard[], today: Date): Eligibility {
  const t = todayStr(today);
  const product = card.productId ? PRODUCT_MAP.get(card.productId) : undefined;
  if (!product) {
    return {
      status: 'unknown',
      light: 'gray',
      nextEligibleOn: null,
      estimated: false,
      note: '自定义卡，没有对应产品的规则。',
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
        note: card.status === 'open' ? '已持有；无间隔规则，只看 5/24。' : '无间隔规则，只看 5/24。',
      };
    case 'unknown':
      return {
        status: 'unknown',
        light: 'gray',
        nextEligibleOn: null,
        estimated: false,
        note: rule.note,
      };
    case 'lifetime': {
      if (card.bonusReceived === true) {
        return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: false, note: '一生一次，已拿过奖励，不能再拿。' };
      }
      if (card.bonusReceived === false) {
        return { status: 'eligible', light: 'green', nextEligibleOn: null, estimated: false, note: '一生一次，尚未拿过奖励，可以申请。' };
      }
      return { status: 'unknown', light: 'gray', nextEligibleOn: null, estimated: false, note: '一生一次；是否拿过奖励待确认。' };
    }
    case 'ever_had': {
      const everHeld = allCards.some((c) => c.productId === product.id);
      if (everHeld) {
        return {
          status: 'not_yet',
          light: 'red',
          nextEligibleOn: null,
          estimated: false,
          note: '曾经持有过这张卡，新奖励可能被拒；Chase 会在申请前提示资格，硬查询前可先看提示。',
        };
      }
      return { status: 'eligible', light: 'green', nextEligibleOn: null, estimated: false, note: '未持有过，可以申请。' };
    }
    case 'months_since_bonus': {
      const months = rule.months ?? 24;
      const lb = card.lastBonusOn;
      if (lb) {
        const next = addMonths(lb, months);
        return {
          status: t >= next ? 'eligible' : 'not_yet',
          light: t >= next ? 'green' : 'red',
          nextEligibleOn: next,
          estimated: false,
          note: `距上次拿奖励 ${months} 个月。`,
        };
      }
      return estimateFromOpened(card, months, t);
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
            note: `家族内只能同时持有一张 Sapphire，另一张还在持有中；且距最近一次 Sapphire 奖励需满 ${months} 个月。`,
          };
        }
        return {
          status: t >= next ? 'eligible' : 'not_yet',
          light: t >= next ? 'green' : 'red',
          nextEligibleOn: next,
          estimated: false,
          note: `蓝宝石家族 ${months} 个月：距最近一次 Sapphire 奖励起算。`,
        };
      }
      if (otherOpen && card.status !== 'open') {
        return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: false, note: '家族内只能同时持有一张 Sapphire，另一张还在持有中。' };
      }
      return estimateFromOpened(card, months, t);
    }
    case 'ink_family': {
      const fam = familyCards(INK_FAMILY);
      const received = fam.some((c) => c.bonusReceived === true);
      if (received) {
        return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: false, note: 'Ink Cash / Unlimited 同一奖励家族，已拿过其中一张的奖励。' };
      }
      const lb = latestBonus(fam);
      if (lb) {
        return { status: 'unknown', light: 'gray', nextEligibleOn: null, estimated: false, note: '家族内有拿奖励记录，但间隔口径待确认。' };
      }
      return { status: 'eligible', light: 'green', nextEligibleOn: null, estimated: false, note: '家族内尚未拿过奖励，可以申请。' };
    }
    case 'marriott_cross': {
      const months = rule.months ?? 24;
      const counterpartId = MARRIOTT_PAIR[product.id];
      const counterpart = counterpartId ? allCards.filter((c) => c.productId === counterpartId) : [];
      const selfBonus = card.lastBonusOn;
      const otherBonus = latestBonus(counterpart);
      const latest = [selfBonus, otherBonus].filter((d): d is string => !!d).sort().at(-1) ?? null;
      // AmEx 本卡也是一生一次
      if (product.id === 'amex-marriott-brilliant' && card.bonusReceived === true) {
        return { status: 'not_yet', light: 'red', nextEligibleOn: null, estimated: false, note: 'AmEx 本卡一生一次，已拿过奖励。' };
      }
      if (latest) {
        const next = addMonths(latest, months);
        return {
          status: t >= next ? 'eligible' : 'not_yet',
          light: t >= next ? 'green' : 'red',
          nextEligibleOn: next,
          estimated: false,
          note: `与另一张 Marriott 卡交叉限制 ${months} 个月：距最近一次拿奖励起算。`,
        };
      }
      return estimateFromOpened(card, months, t);
    }
    default:
      return { status: 'unknown', light: 'gray', nextEligibleOn: null, estimated: false, note: rule.note };
  }
}

/** 5/24：过去 24 个月内开的个人卡数量（商业卡不计入）。 */
export function fiveTwentyFour(cards: HeldCard[], today: Date): number {
  const t = todayStr(today);
  return cards.filter(
    (c) => c.kind === 'personal' && c.openedOn && monthsSince(c.openedOn, t) <= 24 && monthsSince(c.openedOn, t) >= 0,
  ).length;
}
