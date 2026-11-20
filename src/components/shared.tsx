// 共享小组件：银行徽章（官方 logo，本地打包；没有 logo 的银行回退为纯色文字徽章）、筛选 chips、表单行。

import chaseLogo from '../assets/banks/chase.svg';
import capitalOneLogo from '../assets/banks/capital-one.svg';
import amexLogo from '../assets/banks/amex.svg';
import citiLogo from '../assets/banks/citi.svg';
import barclaysLogo from '../assets/banks/barclays.svg';
import discoverLogo from '../assets/banks/discover.svg';
import boaLogo from '../assets/banks/bank-of-america.svg';
import robinhoodLogo from '../assets/banks/robinhood.svg';

// 官方 logo（Wikimedia Commons 公开文件，本地打包，不走外链）。
const BANK_LOGOS: Record<string, string> = {
  Chase: chaseLogo,
  'Capital One': capitalOneLogo,
  Amex: amexLogo,
  Citi: citiLogo,
  Barclays: barclaysLogo,
  Discover: discoverLogo,
  'Bank of America': boaLogo,
  Robinhood: robinhoodLogo,
};

export const BANK_COLORS: Record<string, string> = {
  Chase: '#0a2540',
  'Capital One': '#004977',
  Amex: '#2e77bc',
  Citi: '#056dae',
  Barclays: '#00a0d6',
  Discover: '#e07b00',
  'Bank of America': '#c41230',
  Robinhood: '#00a862',
  'Wells Fargo': '#d71e2b',
  Synchrony: '#6b4fa1',
  PayPal: '#003087',
  'U.S. Bank': '#0a4a8a',
  Elan: '#5b6470',
  Fidelity: '#2e7d32',
};

export function bankColor(bank: string): string {
  return BANK_COLORS[bank] ?? '#5b6470';
}

/** 银行分组顺序：已知银行按此排，其余银行按名字排在后面。 */
export const BANK_ORDER = ['Chase', 'Capital One', 'Amex', 'Citi', 'Barclays', 'Discover', 'Bank of America', 'Robinhood'];

export function bankOrderIndex(bank: string): number {
  const i = BANK_ORDER.indexOf(bank);
  return i === -1 ? BANK_ORDER.length : i;
}

/** 按银行分组排序：先按 BANK_ORDER，再按银行名字母顺序。 */
export function sortBanks(banks: string[]): string[] {
  return [...banks].sort((a, b) => {
    const d = bankOrderIndex(a) - bankOrderIndex(b);
    return d !== 0 ? d : a.localeCompare(b);
  });
}

export function BankBadge({ bank, size = 'sm' }: { bank: string; size?: 'sm' | 'xs' }) {
  if (!bank) return null;
  const logo = BANK_LOGOS[bank];
  if (logo) {
    return <img className={`bank-logo ${size === 'xs' ? 'xs' : ''}`} src={logo} alt={bank} title={bank} />;
  }
  return (
    <span
      className={`bank-badge ${size === 'xs' ? 'xs' : ''}`}
      style={{ background: bankColor(bank) }}
      title={bank}
    >
      {bank}
    </span>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`chip ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

export function Light({ color }: { color: 'green' | 'red' | 'gray' }) {
  return <span className={`light light-${color}`} title={color === 'green' ? '可申请' : color === 'red' ? '尚未可申请' : '待确认'} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
