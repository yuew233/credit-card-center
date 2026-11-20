// 共享小组件：银行徽章（纯色文字徽章，不用任何外部 logo）、筛选 chips、表单行。

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

export function BankBadge({ bank, size = 'sm' }: { bank: string; size?: 'sm' | 'xs' }) {
  if (!bank) return null;
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
