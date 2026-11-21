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

// ---- 内联 SVG 线条图标（feather 风格，stroke 用 currentColor） ----
function Svg({ size = 18, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconEyeOff({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
  );
}

export function IconPencil({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </Svg>
  );
}

export function IconReceipt({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </Svg>
  );
}

export function IconCard({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </Svg>
  );
}

export function IconSwap({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Svg>
  );
}

export function IconZap({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  );
}

export function IconGear({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}
