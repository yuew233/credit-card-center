// 转分 tab：
// - 默认按伙伴分组（每个伙伴一行，列出所有能转的银行和比例），可切换按银行分组
// - 每行只显示核心三样：比例、进行中奖励的绿色 +X% 徽章、网上常推荐路线的 ★
// - 美元价值、推荐理由、到账时间、最低转分量收在行内展开详情里
// - 「当前转分奖励」每条一行，过期自动进「最近结束」
// - 货币典型价值一行小字汇总；换算器默认收起
// - 转分不可逆，页面顶部有提示

import { useMemo, useState } from 'react';
import type { TransferRate } from '../types';
import type { Store } from '../lib/store';
import { todayStr } from '../lib/dates';
import { Chip } from './shared';

type GroupMode = 'partner' | 'bank';

function ratioText(r: TransferRate): string {
  return `${r.ratioFrom}:${r.ratioTo}`;
}

function usdText(r: TransferRate): string {
  if (r.valueCents !== null && r.valueCents !== undefined) return `约 $${((r.valueCents * r.ratioTo) / 100).toFixed(2)} / 1,000 分`;
  if (r.valueLow !== null && r.valueLow !== undefined && r.valueHigh !== null && r.valueHigh !== undefined)
    return `${r.valueLow}–${r.valueHigh} 美分/点`;
  return '—';
}

function RateRow({
  rate,
  bonusPct,
  store,
}: {
  rate: TransferRate;
  bonusPct: number | null;
  store: Store;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ratioFrom, setRatioFrom] = useState(String(rate.ratioFrom));
  const [ratioTo, setRatioTo] = useState(String(rate.ratioTo));
  const [star, setStar] = useState(rate.star);
  const [note, setNote] = useState(rate.note);
  const [starReason, setStarReason] = useState(rate.starReason);

  const effectiveTo = bonusPct !== null ? (rate.ratioTo * (100 + bonusPct)) / 100 : rate.ratioTo;

  return (
    <div className="rate-row">
      <button type="button" className="rate-summary" onClick={() => setOpen(!open)}>
        <span className="rate-currency">{rate.currency}</span>
        <span className="rate-ratio">
          {ratioText(rate)}
          {bonusPct !== null ? (
            <span className="bonus-badge" title={`当前奖励 +${bonusPct}%，加成后约 ${rate.ratioFrom}:${effectiveTo}`}>
              +{bonusPct}%
            </span>
          ) : null}
        </span>
        {rate.star ? <span className="rate-star" title="网上常推荐">★</span> : null}
        <span className="rate-usd">{usdText(rate)}</span>
        <span className="hold-chevron">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="rate-detail">
          {rate.star && rate.starReason ? <div className="rate-star-reason">★ {rate.starReason}</div> : null}
          <div className="rate-detail-grid">
            <span>比例：{ratioText(rate)}</span>
            {bonusPct !== null ? <span>加成后：{rate.ratioFrom}:{effectiveTo}</span> : null}
            <span>美元价值：{usdText(rate)}</span>
            {rate.minTransfer ? <span>最低转分：{rate.minTransfer.toLocaleString()}</span> : null}
            {rate.arrival ? <span>到账：{rate.arrival}</span> : null}
            <span>核实：{rate.verifiedOn}</span>
          </div>
          {rate.note ? <div className="benefit-note">{rate.note}</div> : null}
          <div className="hold-btns">
            <button type="button" className="btn" onClick={() => setEditing(!editing)}>
              {editing ? '取消编辑' : '编辑这条'}
            </button>
          </div>
          {editing && (
            <div className="edit-form">
              <label className="field">
                <span className="field-label">比例（转出 : 到账）</span>
                <span className="ratio-edit">
                  <input type="number" step="any" min="0" value={ratioFrom} onChange={(e) => setRatioFrom(e.target.value)} />
                  :
                  <input type="number" step="any" min="0" value={ratioTo} onChange={(e) => setRatioTo(e.target.value)} />
                </span>
              </label>
              <label className="field">
                <span className="field-label">网上常推荐（★）</span>
                <input type="checkbox" checked={star} onChange={(e) => setStar(e.target.checked)} />
              </label>
              <label className="field">
                <span className="field-label">推荐理由</span>
                <input value={starReason} onChange={(e) => setStarReason(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">备注</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className="edit-form-btns">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    store.setTransferRates(
                      store.state.transferRates.map((r) =>
                        r.currency === rate.currency && r.partner === rate.partner
                          ? { ...r, ratioFrom: Number(ratioFrom) || 1, ratioTo: Number(ratioTo) || 1, star, starReason, note }
                          : r,
                      ),
                    );
                    setEditing(false);
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TransfersTab({ store }: { store: Store }) {
  const [mode, setMode] = useState<GroupMode>('partner');
  const [showEnded, setShowEnded] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcCurrency, setCalcCurrency] = useState(store.state.transferRates[0]?.currency ?? 'Chase UR');
  const [calcPartner, setCalcPartner] = useState('');
  const [calcAmount, setCalcAmount] = useState('10000');
  const today = todayStr();

  const bonuses = store.state.transferBonuses;
  const activeBonuses = bonuses.filter((b) => b.endsOn >= today);
  const endedBonuses = bonuses.filter((b) => b.endsOn < today);

  const bonusFor = (currency: string, partner: string): number | null => {
    const b = activeBonuses.find((x) => x.currency === currency && x.partner === partner);
    return b ? b.bonusPct : null;
  };

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; kind: string; rates: TransferRate[] }>();
    store.state.transferRates.forEach((r) => {
      const key = mode === 'partner' ? r.partner : r.currency;
      const entry = map.get(key) ?? { label: key, kind: mode === 'partner' ? r.kind : '', rates: [] };
      entry.rates.push(r);
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [store.state.transferRates, mode]);

  const calcPartners = useMemo(
    () => store.state.transferRates.filter((r) => r.currency === calcCurrency),
    [store.state.transferRates, calcCurrency],
  );
  const calcRate = calcPartners.find((r) => r.partner === calcPartner) ?? calcPartners[0];
  const calcBonus = calcRate ? bonusFor(calcRate.currency, calcRate.partner) : null;
  const calcPoints = Number(calcAmount) || 0;
  const calcOut = calcRate ? Math.floor((calcPoints * calcRate.ratioTo) / calcRate.ratioFrom) : 0;
  const calcOutBonus = calcBonus !== null ? Math.floor((calcOut * (100 + calcBonus)) / 100) : calcOut;
  const calcUsd =
    calcRate && calcRate.valueCents !== null
      ? ((calcOutBonus * calcRate.valueCents) / 100).toFixed(2)
      : calcRate && calcRate.valueLow !== null
        ? `${((calcOutBonus * calcRate.valueLow) / 100).toFixed(0)}–${((calcOutBonus * (calcRate.valueHigh ?? calcRate.valueLow)) / 100).toFixed(0)}`
        : '—';

  const currencies = useMemo(
    () => [...new Set(store.state.transferRates.map((r) => r.currency))],
    [store.state.transferRates],
  );

  return (
    <div>
      <div className="transfer-warn">⚠️ 转分不可逆，转出前请确认目标账户与姓名一致。</div>

      <div className="value-line">
        积分典型价值（TPG 2026 年 11 月估值，非保证价）：{' '}
        {store.state.currencyValues.map((v) => `${v.currency} ${v.valueCents}¢`).join(' · ')}
        <span className="tab-sub"> · 核实于 2026-11-18</span>
      </div>

      <div className="tab-head">
        <div className="chip-row">
          <Chip active={mode === 'partner'} onClick={() => setMode('partner')}>
            按伙伴分组
          </Chip>
          <Chip active={mode === 'bank'} onClick={() => setMode('bank')}>
            按银行分组
          </Chip>
        </div>
        <div className="tab-sub">{store.state.transferRates.length} 条比例 · ★ 为网上常推荐路线</div>
      </div>

      <div className="bonus-list">
        <div className="bonus-list-title">当前转分奖励</div>
        {activeBonuses.length === 0 ? (
          <div className="tab-sub">暂无进行中的奖励。</div>
        ) : (
          activeBonuses
            .slice()
            .sort((a, b) => a.endsOn.localeCompare(b.endsOn))
            .map((b) => (
              <div key={`${b.currency}-${b.partner}`} className="bonus-line">
                <span>
                  {b.currency} → {b.partner}
                </span>
                <span className="bonus-badge">+{b.bonusPct}%</span>
                <span className="tab-sub">截至 {b.endsOn}</span>
                {b.note ? <span className="tab-sub">{b.note}</span> : null}
              </div>
            ))
        )}
        {endedBonuses.length > 0 && (
          <div>
            <button type="button" className="ignored-toggle" onClick={() => setShowEnded(!showEnded)}>
              最近结束（{endedBonuses.length}） {showEnded ? '▴' : '▾'}
            </button>
            {showEnded &&
              endedBonuses.map((b) => (
                <div key={`${b.currency}-${b.partner}`} className="bonus-line ended">
                  <span>
                    {b.currency} → {b.partner}
                  </span>
                  <span className="bonus-badge ended-badge">+{b.bonusPct}%</span>
                  <span className="tab-sub">已于 {b.endsOn} 结束</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="partner-groups">
        {grouped.map((g) => (
          <div key={g.label} className="partner-group">
            <div className="partner-group-head">
              <span className="partner-group-name">{g.label}</span>
              {g.kind ? <span className="period-badge">{g.kind === 'airline' ? '航司' : '酒店'}</span> : null}
              <span className="tab-sub">{g.rates.length} 个来源</span>
            </div>
            <div className="rate-list">
              {g.rates.map((r) => (
                <RateRow key={`${r.currency}-${r.partner}`} rate={r} bonusPct={bonusFor(r.currency, r.partner)} store={store} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="calc-section">
        <button type="button" className="ignored-toggle" onClick={() => setShowCalc(!showCalc)}>
          换算器 {showCalc ? '▴' : '▾'}
        </button>
        {showCalc && (
          <div className="calc-body">
            <label className="field">
              <span className="field-label">积分</span>
              <select value={calcCurrency} onChange={(e) => { setCalcCurrency(e.target.value); setCalcPartner(''); }}>
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">转到</span>
              <select value={calcRate?.partner ?? ''} onChange={(e) => setCalcPartner(e.target.value)}>
                {calcPartners.map((r) => (
                  <option key={r.partner} value={r.partner}>
                    {r.partner}（{ratioText(r)}）
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">转出点数</span>
              <input type="number" min="0" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} />
            </label>
            {calcRate && (
              <div className="calc-result">
                到账约 <b>{calcOutBonus.toLocaleString()}</b> {calcRate.partner.includes('Bonvoy') || calcRate.partner.includes('Rewards') || calcRate.partner.includes('Privileges') ? '积分' : '里程'}
                {calcBonus !== null ? <span className="bonus-badge">+{calcBonus}% 已计入</span> : null}
                {calcUsd !== '—' ? <span> · 约 ${calcUsd}</span> : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
