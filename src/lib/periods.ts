// 福利周期计算：
// - 自然月 / 自然半年 / 自然年：按日历
// - 持卡周年 / 每 4 年：按开卡日周年；开卡日未知时退回自然年（估算）
// - 一次性：看 expiresOn
// - 每次入住：没有固定周期，按当月判断是否已用
// - 免房晚（fnFromYear2）：开卡满 12 个月才开始，未开始前不计入总额

import type { BenefitInstance, BenefitUse } from '../types';
import { addMonths, fmtDate, parseDate, todayStr } from './dates';

export interface Period {
  start: string;
  end: string;
}

export type BenefitStatus = 'available' | 'used' | 'not_started' | 'expired';

export interface BenefitView {
  benefit: BenefitInstance;
  period: Period | null;
  periodLabel: string;
  periodEnd: string | null;
  remaining: number;
  used: number;
  status: BenefitStatus;
  startsOn: string | null; // FN 未开始时的开始日
}

export function cycleLabel(b: BenefitInstance): string {
  switch (b.cycle) {
    case 'annual':
      return b.cycleAnchor === 'anniversary' ? '持卡周年' : '自然年';
    case 'monthly':
      return '自然月';
    case 'semiannual':
      return b.half === 1 ? '自然半年·上半年' : '自然半年·下半年';
    case 'multi_year':
      return `每 ${b.cycleMonths ?? 4 * 12} 个月·持卡周年`;
    case 'per_stay':
      return '自然年·每次入住';
    case 'one_time':
      return '一次性';
    default:
      return '';
  }
}

/** 当前周期（包含今天）。返回 null 表示没有固定周期。 */
export function currentPeriod(b: BenefitInstance, openedOn: string | null, today: Date): Period | null {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-based
  const t = todayStr(today);
  switch (b.cycle) {
    case 'monthly':
      return { start: `${y}-${String(m + 1).padStart(2, '0')}-01`, end: fmtDate(new Date(y, m + 1, 0)) };
    case 'semiannual': {
      if (b.half === 1) return { start: `${y}-01-01`, end: `${y}-06-30` };
      return { start: `${y}-07-01`, end: `${y}-12-31` };
    }
    case 'annual':
      if (b.cycleAnchor === 'calendar') return { start: `${y}-01-01`, end: `${y}-12-31` };
      if (openedOn) {
        const [, om, od] = openedOn.split('-').map(Number);
        const start = new Date(y, om - 1, od);
        if (start > today) start.setFullYear(y - 1);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        return { start: fmtDate(start), end: fmtDate(end) };
      }
      return { start: `${y}-01-01`, end: `${y}-12-31` };
    case 'multi_year': {
      if (!openedOn) return null;
      const months = b.cycleMonths ?? 48;
      let start = openedOn;
      while (addMonths(start, months) <= t) start = addMonths(start, months);
      return { start, end: addMonths(start, months) };
    }
    case 'per_stay':
    case 'one_time':
      return null;
    default:
      return null;
  }
}

/** 周期结束日（用于“截至”显示）；没有固定周期时返回 null。 */
export function periodEndLabel(b: BenefitInstance, openedOn: string | null, today: Date): string | null {
  if (b.cycle === 'one_time') return b.expiresOn ?? null;
  const p = currentPeriod(b, openedOn, today);
  return p ? p.end : null;
}

export function evaluateBenefit(
  b: BenefitInstance,
  openedOn: string | null,
  uses: BenefitUse[],
  today: Date,
): BenefitView {
  const t = todayStr(today);

  // 免房晚第二年才开始
  let startsOn: string | null = null;
  if (b.fnFromYear2) {
    if (openedOn) {
      startsOn = addMonths(openedOn, 12);
      if (t < startsOn) {
        return {
          benefit: b,
          period: null,
          periodLabel: cycleLabel(b),
          periodEnd: null,
          remaining: 0,
          used: 0,
          status: 'not_started',
          startsOn,
        };
      }
    } else {
      // 开卡日未知：无法确认是否已开始，不计入总额
      return {
        benefit: b,
        period: null,
        periodLabel: cycleLabel(b),
        periodEnd: null,
        remaining: 0,
        used: 0,
        status: 'not_started',
        startsOn: null,
      };
    }
  }

  // 一次性：过期即隐藏
  if (b.cycle === 'one_time' && b.expiresOn && t > b.expiresOn) {
    return {
      benefit: b,
      period: null,
      periodLabel: cycleLabel(b),
      periodEnd: b.expiresOn,
      remaining: 0,
      used: 0,
      status: 'expired',
      startsOn: null,
    };
  }

  const period = currentPeriod(b, openedOn, today);
  const myUses = uses.filter((u) => u.benefitId === b.id);
  let used = 0;
  if (b.cycle === 'one_time') {
    used = myUses.reduce((s, u) => s + u.amount, 0);
  } else if (b.cycle === 'per_stay') {
    // 每次入住：看当月是否已记过
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    used = myUses.filter((u) => u.usedOn >= monthStart).reduce((s, u) => s + u.amount, 0);
  } else if (period) {
    used = myUses
      .filter((u) => u.usedOn >= period.start && u.usedOn <= period.end)
      .reduce((s, u) => s + u.amount, 0);
  } else {
    // multi_year 且开卡日未知：看最近一个周期长度内的使用
    const months = b.cycleMonths ?? 48;
    const since = addMonths(t, -months);
    used = myUses.filter((u) => u.usedOn >= since).reduce((s, u) => s + u.amount, 0);
  }
  const remaining = Math.max(0, b.amount - used);
  return {
    benefit: b,
    period,
    periodLabel: cycleLabel(b),
    periodEnd: periodEndLabel(b, openedOn, today),
    remaining,
    used,
    status: remaining <= 0 ? 'used' : 'available',
    startsOn,
  };
}

/** 是否在某个月的第一天（用于判断 FN 周期）——保留给将来扩展 */
export function isAnniversaryMonth(openedOn: string, today: Date): boolean {
  const [, om] = openedOn.split('-').map(Number);
  return today.getMonth() + 1 === om;
}

export function parseDateSafe(s: string): Date {
  return parseDate(s);
}
