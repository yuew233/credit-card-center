// 刷哪张 tab：
// - 按消费类别分组，每类显示首选 / 次选 + 一句话理由
// - 季度轮换类别是种子数据（可编辑），过期后自动降级、不再当首选
// - 顶部轮换横幅由种子数据自动生成，不是写死的逻辑

import { useMemo, useState } from 'react';
import type { EarnRate } from '../types';
import type { Store } from '../lib/store';
import { todayStr } from '../lib/dates';
import { BankBadge } from './shared';

function rankLabel(rank: number): string {
  if (rank === 0) return '可考虑';
  if (rank === 1) return '首选';
  return '次选';
}

function RateRow({ rate, store }: { rate: EarnRate; store: Store }) {
  const [editing, setEditing] = useState(false);
  const [rateText, setRateText] = useState(rate.rateText);
  const [reason, setReason] = useState(rate.reason);
  const [note, setNote] = useState(rate.note);
  const [pending, setPending] = useState(rate.pending);
  const expired = rate.quarterly && rate.validUntil ? rate.validUntil < todayStr() : false;

  return (
    <div className={`earn-row ${expired ? 'expired' : ''} ${rate.rank === 0 ? 'consider' : ''}`}>
      <div className="earn-row-top">
        <span className={`rank-badge rank-${rate.rank === 0 ? 'consider' : rate.rank === 1 ? 'first' : 'second'}`}>
          {rankLabel(rate.rank)}
        </span>
        <BankBadge bank={rate.bank} size="xs" />
        <span className="earn-card-name">{rate.cardName}</span>
        <span className="earn-rate">{rate.rateText || '待确认'}</span>
        {rate.pending ? <span className="pending-badge">待确认</span> : null}
        {expired ? <span className="pending-badge expired-badge">已过期</span> : null}
        <button type="button" className="icon-btn" title="编辑" onClick={() => setEditing(!editing)}>
          ✎
        </button>
      </div>
      {rate.reason ? <div className="earn-reason">{rate.reason}</div> : null}
      {rate.note ? <div className="benefit-note">{rate.note}</div> : null}
      {editing && (
        <div className="edit-form">
          <label className="field">
            <span className="field-label">返现 / 倍率</span>
            <input value={rateText} onChange={(e) => setRateText(e.target.value)} placeholder="如 5% / 3x" />
          </label>
          <label className="field">
            <span className="field-label">理由（一句话）</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">备注</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">待确认</span>
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
              保存
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm(`确定删除「${rate.cardName}」这条吗？`)) {
                  store.setEarnRates(store.state.earnRates.filter((r) => r !== rate));
                }
              }}
            >
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EarnTab({ store }: { store: Store }) {
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [newCard, setNewCard] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newReason, setNewReason] = useState('');
  const today = todayStr();

  const categories = useMemo(() => {
    const map = new Map<string, { label: string; rates: EarnRate[] }>();
    store.state.earnRates.forEach((r) => {
      const entry = map.get(r.category) ?? { label: r.categoryLabel, rates: [] };
      entry.rates.push(r);
      map.set(r.category, entry);
    });
    return [...map.entries()].map(([key, v]) => {
      // 季度轮换且已过期的排到最后，不再当首选
      const sorted = [...v.rates].sort((a, b) => {
        const aExp = a.quarterly && a.validUntil ? a.validUntil < today : false;
        const bExp = b.quarterly && b.validUntil ? b.validUntil < today : false;
        if (aExp !== bExp) return aExp ? 1 : -1;
        return a.rank - b.rank;
      });
      return { key, label: v.label, rates: sorted };
    });
  }, [store.state.earnRates, today]);

  // 轮换横幅：由未过期的季度轮换种子数据自动生成
  const banner = useMemo(() => {
    const active = store.state.earnRates.filter(
      (r) => r.quarterly && r.validUntil && r.validUntil >= today && r.rank === 1,
    );
    if (active.length === 0) return null;
    const latest = active.map((r) => r.validUntil as string).sort().at(-1) ?? '';
    const cats = [...new Set(active.map((r) => r.categoryLabel))];
    return { cats, until: latest };
  }, [store.state.earnRates, today]);

  return (
    <div>
      {banner ? (
        <div className="q-banner">
          本季度轮换（{banner.cats.join('、')}）5% · 有效期至 {banner.until} · 季度上限 $1,500（同卡轮换类别合计）。过期后自动降级。
        </div>
      ) : (
        <div className="q-banner q-banner-off">当前没有生效中的季度轮换类别；过期轮换已自动降级。</div>
      )}

      <div className="earn-cats">
        {categories.map(({ key, label, rates }) => (
          <div key={key} className="earn-cat">
            <div className="earn-cat-head">
              <span className="earn-cat-name">{label}</span>
              <button type="button" className="btn" onClick={() => setShowAdd(showAdd === key ? null : key)}>
                ＋ 加一条
              </button>
            </div>
            {showAdd === key && (
              <div className="edit-form">
                <input value={newCard} onChange={(e) => setNewCard(e.target.value)} placeholder="卡名，如 Venture X" />
                <input value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="返现 / 倍率，如 2x" />
                <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="理由（一句话）" />
                <div className="edit-form-btns">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!newCard.trim()}
                    onClick={() => {
                      const rank = rates.length ? Math.max(...rates.map((r) => r.rank)) + 1 : 1;
                      store.setEarnRates([
                        ...store.state.earnRates,
                        {
                          bank: '',
                          cardName: newCard.trim(),
                          category: key,
                          categoryLabel: label,
                          rank,
                          rateText: newRate.trim(),
                          reason: newReason.trim(),
                          note: '',
                          pending: false,
                          quarterly: false,
                          validUntil: null,
                          verifiedOn: today,
                        },
                      ]);
                      setNewCard('');
                      setNewRate('');
                      setNewReason('');
                      setShowAdd(null);
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>
            )}
            <div className="earn-rows">
              {rates.map((r) => (
                <RateRow key={`${r.category}-${r.cardName}-${r.rank}`} rate={r} store={store} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="tab-foot-note">返现口径以各银行条款为准；带「待确认」的条目确认前不要按它决策。季度轮换类别是种子数据，可在应用内编辑，过期自动降级。</div>
    </div>
  );
}
