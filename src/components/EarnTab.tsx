// 刷哪张 tab：
// - 按消费类别分组，类别顺序固定（水电在旅行之前）；每类分“我的卡”和“市面上的卡”两段
// - 我的卡只展开首选，其余收进「展开其他 N 张卡」；市面上的卡只展开市场最佳，其余收进「展开其他 N 张市场卡」
// - 市场最佳行标出与我的最佳的差距（百分点）；点市场卡展开年费/上限说明 + 来源 + 核实日期
// - 季度轮换行带 Q4 标记；季度轮换类别是种子数据（可编辑），过期后自动降级、不再当首选
// - 顶部轮换横幅由种子数据自动生成，不是写死的逻辑

import { useMemo, useState } from 'react';
import type { CurrencyValue, EarnRate } from '../types';
import type { Store } from '../lib/store';
import { todayStr } from '../lib/dates';
import { t } from '../lib/i18n';
import { BankBadge } from './shared';

const CATEGORY_ORDER = ['costco', 'grocery', 'amazon', 'dining', 'gas', 'utilities', 'travel', 'online', 'pharmacy', 'misc'];

const CURRENCY_BY_BANK: Record<string, string> = {
  Chase: 'Chase UR',
  'Capital One': 'Capital One',
  Amex: 'AmEx MR',
  Citi: 'Citi ThankYou',
};

/** 折算成有效返现 %：返现直接取 %；积分按转分典型价值折算（倍数 × 美分/点）；无可靠估值返回 null。 */
export function effectivePct(rate: EarnRate, values: CurrencyValue[]): number | null {
  const text = rate.rateText.trim();
  if (!text) return null;
  const pcts = [...text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1]));
  if (pcts.length > 0) return Math.max(...pcts);
  const mults = [...text.matchAll(/(\d+(?:\.\d+)?)\s*x/gi)].map((m) => Number(m[1]));
  if (mults.length === 0) return null;
  const currency = CURRENCY_BY_BANK[rate.bank];
  const v = currency ? values.find((x) => x.currency === currency) : undefined;
  if (!v) return null;
  return Math.max(...mults) * v.valueCents;
}

function rankLabel(rank: number): string {
  if (rank === 0) return t('earn.rankConsider');
  if (rank === 1) return t('earn.rankFirst');
  return t('earn.rankSecond');
}

function RateRow({
  rate,
  store,
  badge,
  rankBadge,
  gapText,
  marketDetail,
  highlight,
}: {
  rate: EarnRate;
  store: Store;
  badge?: React.ReactNode;
  rankBadge?: React.ReactNode;
  gapText?: string | null;
  marketDetail?: React.ReactNode;
  highlight?: 'mine' | 'market';
}) {
  const [editing, setEditing] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rateText, setRateText] = useState(rate.rateText);
  const [reason, setReason] = useState(rate.reason);
  const [note, setNote] = useState(rate.note);
  const [pending, setPending] = useState(rate.pending);
  const expired = rate.quarterly && rate.validUntil ? rate.validUntil < todayStr() : false;

  return (
    <div
      className={`earn-row ${expired ? 'expired' : ''} ${rate.rank === 0 && rate.source === 'mine' ? 'consider' : ''} ${rate.source === 'market' ? 'market-row' : ''} ${highlight === 'mine' ? 'best-row best-mine' : ''} ${highlight === 'market' ? 'best-row best-market' : ''}`}
    >      <div
        className="earn-row-top"
        onClick={marketDetail ? () => setDetailOpen(!detailOpen) : undefined}
        style={marketDetail ? { cursor: 'pointer' } : undefined}
      >
        {rankBadge ?? (
          <span className={`rank-badge rank-${rate.rank === 0 ? 'consider' : rate.rank === 1 ? 'first' : 'second'}`}>
            {rankLabel(rate.rank)}
          </span>
        )}
        <BankBadge bank={rate.bank} size="xs" />
        <span className="earn-card-name">{rate.cardName}</span>
        {rate.quarterly ? <span className="q4-tag">Q4</span> : null}
        {badge}
        <span className="earn-rate">{rate.rateText || t('earn.unverifiedRate')}</span>
        {rate.pending ? <span className="pending-badge">{t('earn.pendingBadge')}</span> : null}
        {expired ? <span className="pending-badge expired-badge">{t('earn.expired')}</span> : null}
        <button
          type="button"
          className="icon-btn"
          title={t('common.edit')}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(!editing);
          }}
        >
          ✎
        </button>
      </div>
      {gapText ? <div className="earn-gap">{gapText}</div> : null}
      {rate.reason ? <div className="earn-reason">{rate.reason}</div> : null}
      {rate.note ? <div className="benefit-note">{rate.note}</div> : null}
      {marketDetail && detailOpen ? <div className="market-detail">{marketDetail}</div> : null}
      {editing && (
        <div className="edit-form">
          <label className="field">
            <span className="field-label">{t('earn.editRate')}</span>
            <input value={rateText} onChange={(e) => setRateText(e.target.value)} placeholder={t('earn.ratePh')} />
          </label>
          <label className="field">
            <span className="field-label">{t('earn.editReason')}</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">{t('earn.editNote')}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">{t('earn.editPending')}</span>
            <input type="checkbox" checked={pending} onChange={(e) => setPending(e.target.checked)} />
          </label>
          <div className="edit-form-btns">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                store.setEarnRates(
                  store.state.earnRates.map((r) =>
                    r === rate ? { ...r, rateText, reason, note, pending } : r,
                  ),
                );
                setEditing(false);
              }}
            >
              {t('common.save')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm(t('earn.deleteConfirm', { name: rate.cardName }))) {
                  store.setEarnRates(store.state.earnRates.filter((r) => r !== rate));
                }
              }}
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isExpired(r: EarnRate, today: string): boolean {
  return r.quarterly && r.validUntil ? r.validUntil < today : false;
}

function CategorySection({
  label,
  mine,
  market,
  store,
  showMarket,
  currencyValues,
}: {
  label: string;
  mine: EarnRate[];
  market: EarnRate[];
  store: Store;
  showMarket: boolean;
  currencyValues: CurrencyValue[];
}) {
  const today = todayStr();
  const [showAdd, setShowAdd] = useState(false);
  const [mineOpen, setMineOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [newCard, setNewCard] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newReason, setNewReason] = useState('');

  const sortedMine = useMemo(() => {
    // 季度轮换且已过期的排到最后，不再当首选
    return [...mine].sort((a, b) => {
      const aExp = isExpired(a, today);
      const bExp = isExpired(b, today);
      if (aExp !== bExp) return aExp ? 1 : -1;
      return a.rank - b.rank;
    });
  }, [mine, today]);

  const primary = sortedMine.find((r) => r.rank >= 1 && !isExpired(r, today)) ?? sortedMine.find((r) => !isExpired(r, today)) ?? sortedMine[0];
  const restMine = sortedMine.filter((r) => r !== primary);
  const sortedMarket = useMemo(
    () => [...market].sort((a, b) => (a.marketRank ?? 99) - (b.marketRank ?? 99)),
    [market],
  );
  const marketBest = sortedMarket[0];
  const restMarket = sortedMarket.slice(1);

  const myPct = primary ? effectivePct(primary, currencyValues) : null;
  const marketPct = marketBest ? effectivePct(marketBest, currencyValues) : null;
  let gapText: string | null = null;
  if (myPct !== null && marketPct !== null) {
    const gap = marketPct - myPct;
    gapText =
      gap >= 0
        ? t('earn.gapHigher', { gap: gap.toFixed(1) })
        : t('earn.gapLower', { gap: (-gap).toFixed(1) });
  }

  return (
    <div className="earn-cat">
      <div className="earn-cat-head">
        <span className="earn-cat-name">{label}</span>
        <button type="button" className="btn" onClick={() => setShowAdd(!showAdd)}>
          {t('earn.addOne')}
        </button>
      </div>
      {showAdd && (
        <div className="edit-form">
          <input value={newCard} onChange={(e) => setNewCard(e.target.value)} placeholder={t('earn.addCardPh')} />
          <input value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder={t('earn.addRatePh')} />
          <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder={t('earn.addReasonPh')} />
          <div className="edit-form-btns">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!newCard.trim()}
              onClick={() => {
                const rank = mine.length ? Math.max(...mine.map((r) => r.rank)) + 1 : 1;
                store.setEarnRates([
                  ...store.state.earnRates,
                  {
                    bank: '',
                    cardName: newCard.trim(),
                    category: mine[0]?.category ?? market[0]?.category ?? '',
                    categoryLabel: label,
                    rank,
                    rateText: newRate.trim(),
                    reason: newReason.trim(),
                    note: '',
                    pending: false,
                    quarterly: false,
                    validUntil: null,
                    verifiedOn: today,
                    source: 'mine',
                    marketRank: null,
                    feeText: '',
                    sourceNote: '',
                  },
                ]);
                setNewCard('');
                setNewRate('');
                setNewReason('');
                setShowAdd(false);
              }}
            >
              {t('common.add')}
            </button>
          </div>
        </div>
      )}

      <div className="earn-rows">
        {primary ? (
          <RateRow rate={primary} store={store} badge={<span className="my-best-badge">{t('earn.myBest')}</span>} highlight="mine" />
        ) : null}
        {restMine.length > 0 && !mineOpen ? (
          <button type="button" className="expand-toggle" onClick={() => setMineOpen(true)}>
            {t('earn.expandMine', { n: restMine.length })} ▾
          </button>
        ) : null}
        {mineOpen &&
          restMine.map((r) => <RateRow key={`${r.category}-${r.cardName}-${r.rank}`} rate={r} store={store} />)}
        {mineOpen && restMine.length > 0 ? (
          <button type="button" className="expand-toggle" onClick={() => setMineOpen(false)}>
            {t('earn.collapseMine')} ▴
          </button>
        ) : null}
      </div>

      {showMarket && sortedMarket.length > 0 ? (
        <div className="earn-market">
          {marketBest ? (
            <RateRow
              rate={marketBest}
              store={store}
              rankBadge={<span className="market-best-badge">{t('earn.marketBest')}</span>}
              gapText={gapText}
              highlight="market"
              marketDetail={
                <>
                  {marketBest.feeText ? <div>{marketBest.feeText}</div> : null}
                  <div className="market-source">
                    {marketBest.sourceNote ? `${t('earn.marketSource', { source: marketBest.sourceNote })} · ` : ''}
                    {t('earn.marketVerified', { date: marketBest.verifiedOn })}
                  </div>
                </>
              }
            />
          ) : null}
          {restMarket.length > 0 && !marketOpen ? (
            <button type="button" className="expand-toggle" onClick={() => setMarketOpen(true)}>
              {t('earn.expandMarket', { n: restMarket.length })} ▾
            </button>
          ) : null}
          {marketOpen &&
            restMarket.map((r) => (
              <RateRow
                key={`m-${r.category}-${r.cardName}-${r.marketRank}`}
                rate={r}
                store={store}
                rankBadge={<span className="market-rank-badge">{t('earn.marketN', { n: r.marketRank ?? 0 })}</span>}
                marketDetail={
                  <>
                    {r.feeText ? <div>{r.feeText}</div> : null}
                    <div className="market-source">
                      {r.sourceNote ? `${t('earn.marketSource', { source: r.sourceNote })} · ` : ''}
                      {t('earn.marketVerified', { date: r.verifiedOn })}
                    </div>
                  </>
                }
              />
            ))}
          {marketOpen && restMarket.length > 0 ? (
            <button type="button" className="expand-toggle" onClick={() => setMarketOpen(false)}>
              {t('earn.collapseMarket')} ▴
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function EarnTab({ store }: { store: Store }) {
  const [showMarket, setShowMarket] = useState(true);
  const today = todayStr();

  const categories = useMemo(() => {
    const map = new Map<string, { label: string; mine: EarnRate[]; market: EarnRate[] }>();
    store.state.earnRates.forEach((r) => {
      const entry = map.get(r.category) ?? { label: r.categoryLabel, mine: [], market: [] };
      if (r.source === 'market') entry.market.push(r);
      else entry.mine.push(r);
      map.set(r.category, entry);
    });
    const list = [...map.entries()].map(([key, v]) => ({ key, ...v }));
    list.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.key);
      const bi = CATEGORY_ORDER.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return list;
  }, [store.state.earnRates]);

  // 轮换横幅：由未过期的季度轮换种子数据自动生成
  const banner = useMemo(() => {
    const active = store.state.earnRates.filter(
      (r) => r.quarterly && r.validUntil && r.validUntil >= today && r.rank === 1 && r.source === 'mine',
    );
    if (active.length === 0) return null;
    const latest = active.map((r) => r.validUntil as string).sort().at(-1) ?? '';
    const cats = [...new Set(active.map((r) => r.categoryLabel))];
    return { cats, until: latest };
  }, [store.state.earnRates, today]);

  return (
    <div>
      {banner ? (
        <div className="q-banner">{t('earn.banner', { cats: banner.cats.join('、'), until: banner.until })}</div>
      ) : (
        <div className="q-banner q-banner-off">{t('earn.noBanner')}</div>
      )}

      <div className="earn-view-toggle">
        <div className="chip-row">
          <button type="button" className={`chip ${showMarket ? 'active' : ''}`} onClick={() => setShowMarket(true)}>
            {t('earn.showAll')}
          </button>
          <button type="button" className={`chip ${!showMarket ? 'active' : ''}`} onClick={() => setShowMarket(false)}>
            {t('earn.showMine')}
          </button>
        </div>
        <div className="tab-sub">{t('earn.legend')}</div>
      </div>

      <div className="earn-cats">
        {categories.map(({ key, label, mine, market }) => (
          <CategorySection
            key={key}
            label={label}
            mine={mine}
            market={market}
            store={store}
            showMarket={showMarket}
            currencyValues={store.state.currencyValues}
          />
        ))}
      </div>
      <div className="tab-foot-note">{t('earn.footNote')}</div>
    </div>
  );
}
