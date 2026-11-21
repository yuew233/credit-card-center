// 转分 tab：
// - 默认按伙伴分组（每个伙伴一行，列出所有能转的银行和比例），可切换按银行分组
// - 每行只显示核心三样：比例、进行中奖励的绿色 +X% 徽章、网上常推荐路线的 ★
// - 美元价值、推荐理由、到账时间、最低转分量收在行内展开详情里
// - 「当前转分奖励」按银行排序（Chase → Capital One → AmEx → Citi → Marriott），同银行按截止日期；过期自动进「最近结束」
// - 每组只展开 ★ 路线和有奖励的前 3 条，其余收进「展开其余 N 条」（两组视图都一样）
// - 货币典型价值一行小字汇总；换算器默认收起
// - 转分不可逆，页面顶部有提示

import { useMemo, useState } from 'react';
import type { TransferBonus, TransferRate } from '../types';
import type { Store } from '../lib/store';
import { daysBetween, todayStr } from '../lib/dates';
import { t } from '../lib/i18n';
import { Chip } from './shared';

type GroupMode = 'partner' | 'bank';

const BANK_ORDER = ['Chase UR', 'Capital One', 'AmEx MR', 'Citi ThankYou', 'Marriott Bonvoy'];

function ratioText(r: TransferRate): string {
  return `${r.ratioFrom}:${r.ratioTo}`;
}

function usdText(r: TransferRate): string {
  if (r.valueCents !== null && r.valueCents !== undefined) return `≈ $${((r.valueCents * r.ratioTo) / 100).toFixed(2)} / 1,000 ${t('transfers.points')}`;
  if (r.valueLow !== null && r.valueLow !== undefined && r.valueHigh !== null && r.valueHigh !== undefined)
    return `${r.valueLow}–${r.valueHigh} ${t('transfers.centsPerPt')}`;
  return '—';
}

function RateRow({
  rate,
  bonusPct,
  store,
  mode,
}: {
  rate: TransferRate;
  bonusPct: number | null;
  store: Store;
  mode: GroupMode;
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
        {/* 银行分组下行首显示目标伙伴（银行已在组头），伙伴分组下显示来源银行 */}
        <span className="rate-currency">{mode === 'bank' ? rate.partner : rate.currency}</span>
        <span className="rate-ratio">
          {ratioText(rate)}
          {bonusPct !== null ? (
            <span className="bonus-badge" title={t('transfers.bonusTitle', { pct: bonusPct, to: effectiveTo })}>
              +{bonusPct}%
            </span>
          ) : null}
        </span>
        {rate.star ? <span className="rate-star" title={t('transfers.starTitle')}>★</span> : null}
        <span className="rate-usd">{usdText(rate)}</span>
        <span className="hold-chevron">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="rate-detail">
          {rate.star && rate.starReason ? <div className="rate-star-reason">★ {rate.starReason}</div> : null}
          <div className="rate-detail-grid">
            <span>{t('transfers.ratio', { ratio: ratioText(rate) })}</span>
            {bonusPct !== null ? <span>{t('transfers.ratioAfter', { ratio: `${rate.ratioFrom}:${effectiveTo}` })}</span> : null}
            <span>{t('transfers.usdValue', { value: usdText(rate) })}</span>
            {rate.minTransfer ? <span>{t('transfers.minTransfer', { n: rate.minTransfer.toLocaleString() })}</span> : null}
            {rate.arrival ? <span>{t('transfers.arrival', { text: rate.arrival })}</span> : null}
            <span>{t('transfers.verified', { date: rate.verifiedOn })}</span>
          </div>
          {rate.note ? <div className="benefit-note">{rate.note}</div> : null}
          <div className="hold-btns">
            <button type="button" className="btn" onClick={() => setEditing(!editing)}>
              {editing ? t('transfers.cancelEdit') : t('transfers.edit')}
            </button>
          </div>
          {editing && (
            <div className="edit-form">
              <label className="field">
                <span className="field-label">{t('transfers.editRatio')}</span>
                <span className="ratio-edit">
                  <input type="number" step="any" min="0" value={ratioFrom} onChange={(e) => setRatioFrom(e.target.value)} />
                  :
                  <input type="number" step="any" min="0" value={ratioTo} onChange={(e) => setRatioTo(e.target.value)} />
                </span>
              </label>
              <label className="field">
                <span className="field-label">{t('transfers.editStar')}</span>
                <input type="checkbox" checked={star} onChange={(e) => setStar(e.target.checked)} />
              </label>
              <label className="field">
                <span className="field-label">{t('transfers.editStarReason')}</span>
                <input value={starReason} onChange={(e) => setStarReason(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">{t('common.note')}</span>
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
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RateGroup({
  label,
  kind,
  rates,
  bonusFor,
  store,
  mode,
}: {
  label: string;
  kind: string;
  rates: TransferRate[];
  bonusFor: (currency: string, partner: string) => TransferBonus | null;
  store: Store;
  mode: GroupMode;
}) {
  const [expanded, setExpanded] = useState(false);

  // 只展开 ★ 路线 + 有奖励的前 3 条（按奖励 % 降序、截止日期升序），其余收起
  const bonusRows = rates
    .map((r) => ({ rate: r, bonus: bonusFor(r.currency, r.partner) }))
    .filter((x): x is { rate: TransferRate; bonus: TransferBonus } => x.bonus !== null)
    .sort((a, b) => b.bonus.bonusPct - a.bonus.bonusPct || a.bonus.endsOn.localeCompare(b.bonus.endsOn))
    .slice(0, 3);
  const shownSet = new Set<TransferRate>([...rates.filter((r) => r.star), ...bonusRows.map((x) => x.rate)]);
  const shown = rates.filter((r) => shownSet.has(r));
  const hidden = rates.filter((r) => !shownSet.has(r));
  const visible = expanded ? rates : shown;

  return (
    <div className="partner-group">
      <div className="partner-group-head">
        <span className="partner-group-name">{label}</span>
        {kind ? <span className="period-badge">{kind === 'airline' ? t('transfers.airline') : t('transfers.hotel')}</span> : null}
        <span className="tab-sub">{t('transfers.sources', { n: rates.length })}</span>
      </div>
      <div className="rate-list">
        {visible.map((r) => (
          <RateRow
            key={`${r.currency}-${r.partner}`}
            rate={r}
            bonusPct={bonusFor(r.currency, r.partner)?.bonusPct ?? null}
            store={store}
            mode={mode}
          />
        ))}
      </div>
      {hidden.length > 0 ? (
        <button type="button" className="expand-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? t('transfers.hideRest') : t('transfers.showRest', { n: hidden.length })} {expanded ? '▴' : '▾'}
        </button>
      ) : null}
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
  const sortedActiveBonuses = useMemo(
    () =>
      [...activeBonuses].sort((a, b) => {
        const ai = BANK_ORDER.indexOf(a.currency);
        const bi = BANK_ORDER.indexOf(b.currency);
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.endsOn.localeCompare(b.endsOn);
      }),
    [activeBonuses],
  );

  const bonusFor = (currency: string, partner: string): TransferBonus | null => {
    const b = activeBonuses.find((x) => x.currency === currency && x.partner === partner);
    return b ?? null;
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
  const calcBonus = calcRate ? bonusFor(calcRate.currency, calcRate.partner)?.bonusPct ?? null : null;
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

  const valuesVerified = useMemo(
    () => store.state.currencyValues.map((v) => v.verifiedOn).sort().at(-1) ?? '',
    [store.state.currencyValues],
  );

  return (
    <div>
      <div className="transfer-warn">{t('transfers.warn')}</div>

      <div className="value-line">
        {t('transfers.valueLine')} {store.state.currencyValues.map((v) => `${v.currency} ${v.valueCents}¢`).join(' · ')}
        {valuesVerified ? <span className="tab-sub"> · {t('transfers.verifiedOn', { date: valuesVerified })}</span> : null}
      </div>

      <div className="bonus-list">
        <div className="bonus-list-title">{t('transfers.bonuses')}</div>
        {sortedActiveBonuses.length === 0 ? (
          <div className="tab-sub">{t('transfers.noBonuses')}</div>
        ) : (
          sortedActiveBonuses.map((b) => {
            // 14 天内截止的 offer 高亮提醒
            const endingSoon = daysBetween(today, b.endsOn) >= 0 && daysBetween(today, b.endsOn) <= 14;
            return (
              <div key={`${b.currency}-${b.partner}`} className={`bonus-line${endingSoon ? ' expiring-soon' : ''}`}>
                <span>
                  {b.currency} → {b.partner}
                </span>
                <span className="bonus-badge">+{b.bonusPct}%</span>
                {endingSoon ? <span className="expiring-tag">{t('transfers.expiringSoon')}</span> : null}
                <span className="tab-sub">{t('transfers.until', { date: b.endsOn })}</span>
                {b.note ? <span className="tab-sub">{b.note}</span> : null}
              </div>
            );
          })
        )}
        {endedBonuses.length > 0 && (
          <div>
            <button type="button" className="ignored-toggle" onClick={() => setShowEnded(!showEnded)}>
              {t('transfers.ended', { n: endedBonuses.length })} {showEnded ? '▴' : '▾'}
            </button>
            {showEnded &&
              endedBonuses.map((b) => (
                <div key={`${b.currency}-${b.partner}`} className="bonus-line ended">
                  <span>
                    {b.currency} → {b.partner}
                  </span>
                  <span className="bonus-badge ended-badge">+{b.bonusPct}%</span>
                  <span className="tab-sub">{t('transfers.endedOn', { date: b.endsOn })}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="tab-head">
        <div className="chip-row">
          <Chip active={mode === 'partner'} onClick={() => setMode('partner')}>
            {t('transfers.byPartner')}
          </Chip>
          <Chip active={mode === 'bank'} onClick={() => setMode('bank')}>
            {t('transfers.byBank')}
          </Chip>
        </div>
        <div className="tab-sub">
          {t('transfers.count', { n: store.state.transferRates.length })}
        </div>
      </div>

      <div className="partner-groups">
        {grouped.map((g) => (
          <RateGroup key={g.label} label={g.label} kind={g.kind} rates={g.rates} bonusFor={bonusFor} store={store} mode={mode} />
        ))}
      </div>

      <div className="calc-section">
        <button type="button" className="ignored-toggle" onClick={() => setShowCalc(!showCalc)}>
          {t('transfers.calc')} {showCalc ? '▴' : '▾'}
        </button>
        {showCalc && (
          <div className="calc-body">
            <label className="field">
              <span className="field-label">{t('transfers.calcCurrency')}</span>
              <select value={calcCurrency} onChange={(e) => { setCalcCurrency(e.target.value); setCalcPartner(''); }}>
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t('transfers.calcPartner')}</span>
              <select value={calcRate?.partner ?? ''} onChange={(e) => setCalcPartner(e.target.value)}>
                {calcPartners.map((r) => (
                  <option key={r.partner} value={r.partner}>
                    {r.partner}（{ratioText(r)}）
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t('transfers.calcAmount')}</span>
              <input type="number" min="0" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} />
            </label>
            {calcRate && (
              <div className="calc-result">
                {t('transfers.calcOut')} <b>{calcOutBonus.toLocaleString()}</b>{' '}
                {calcRate.partner.includes('Bonvoy') || calcRate.partner.includes('Rewards') || calcRate.partner.includes('Privileges')
                  ? t('transfers.points')
                  : t('transfers.miles')}
                {calcBonus !== null ? <span className="bonus-badge">{t('transfers.calcBonusIn', { pct: calcBonus })}</span> : null}
                {calcUsd !== '—' ? <span> · ≈ ${calcUsd}</span> : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
