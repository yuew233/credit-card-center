// 日期工具：全部按本地日期处理，日期字符串为 YYYY-MM-DD。

export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(d: Date): string {
  return todayStr(d);
}

export function fmtShort(s: string | null): string {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${y}/${m}/${d}`;
}

export function addMonths(s: string, months: number): string {
  const d = parseDate(s);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 处理月末溢出（如 1/31 + 1 月 → 3/3），回退到当月最后一天
  if (d.getDate() !== day) d.setDate(0);
  return fmtDate(d);
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + days);
  return fmtDate(d);
}

/** 月份差：a 到 b 之间完整的月数（b - a），不足一月按天折算为小数 */
export function monthsBetween(a: string, b: string): number {
  const da = parseDate(a);
  const db = parseDate(b);
  return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()) + (db.getDate() - da.getDate()) / 30;
}

/** 持有时长中文，如 "1年3个月" / "8个月" / "12天"；lang=en 时返回英文 */
export function heldDuration(openedOn: string | null, closedOn: string | null, today: Date = new Date(), lang: 'zh' | 'en' = 'zh'): string {
  const unknown = lang === 'en' ? 'Unknown' : '未知';
  if (!openedOn) return unknown;
  const end = closedOn ? parseDate(closedOn) : today;
  const start = parseDate(openedOn);
  if (end < start) return unknown;
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  if (lang === 'en') {
    if (months >= 12) {
      const y = Math.floor(months / 12);
      const m = months % 12;
      return m === 0 ? `${y} yr` : `${y} yr ${m} mo`;
    }
    if (months >= 1) return `${months} mo`;
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    return `${days} d`;
  }
  if (months >= 12) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    return m === 0 ? `${y}年` : `${y}年${m}个月`;
  }
  if (months >= 1) return `${months}个月`;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  return `${days}天`;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
