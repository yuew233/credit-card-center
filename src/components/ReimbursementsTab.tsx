// 报销 tab：
// - 每张福利卡显示「还剩 $X · 截至日期」+ 进度条 + 周期徽章 + 说明
// - 过期的当前周期福利自动隐藏，不计入总额
// - 免房晚（FN）第二年才开始：未开始前显示「第二年起 · 开始日」，不计入总额
// - DoorDash 同卡多项福利合并为一张卡，两个按钮分别记账
// - 忽略（眼睛）→ 收进底部「已忽略」区，可恢复
// - 状态筛选 未用 / 已用 / 全部（默认未用），银行下拉筛选

import { useMemo, useState } from 'react';
import type { BenefitInstance, BenefitUse } from '../types';
import type { Store } from '../lib/store';
import { evaluateBenefit, type BenefitView } from '../lib/periods';
import { fmtShort, todayStr } from '../lib/dates';
import { BankBadge, Chip } from './shared';
import { t } from '../lib/i18n';

type StatusFilter = 'unused' | 'used' | 'all';

function fmtAmount(b: BenefitInstance, n: number): string {
  if (b.unit === '积分') return `${n.toLocaleString()} 积分`;
  return `$${n.toLocaleString()}`;
}

function BenefitCard({
  view,
  cardName,
  bank,
  store,
}: {
  view: BenefitView;
  cardName: string;
  bank: string;
  store: Store;
}) {
  const { benefit: b } = view;
  const [partial, setPartial] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(b.name);
  const [editAmount, setEditAmount] = useState(String(b.amount));
  const [editNote, setEditNote] = useState(b.note);
  const today = todayStr();
  const pct = b.amount > 0 ? Math.round(((b.amount - view.remaining) / b.amount) * 100) : 0;
  const uses = store.state.uses.filter((u) => u.benefitId === b.id);

  const markUsed = () => {
    if (view.remaining > 0) store.logUse(b.id, view.remaining, today);
  };

  return (
    <div className={`benefit-card ${view.status === 'used' ? 'is-used' : ''}`}>
      <div className="benefit-top">
        <div className="benefit-title">
          <BankBadge bank={bank} size="xs" />
          <span className="benefit-name">{b.name}</span>
          <span className="period-badge">{view.periodLabel}</span>
        </div>
        <div className="benefit-actions">
          <button type="button" className="icon-btn" title={t('reimburse.ignore')} onClick={() => store.updateBenefit(b.id, { ignored: true })}>
            👁‍🗨
          </button>
          <button
            type="button"
            className="icon-btn"
            title={t('common.edit')}
            onClick={() => {
              setEditing(!editing);
            }}
          >
            ✎
          </button>
        </div>
      </div>

      {view.status === 'not_started' ? (
        <div className="benefit-remaining not-started">
          {view.startsOn ? t('reimburse.notStarted', { date: fmtShort(view.startsOn) }) : t('reimburse.notStartedNoDate')}
        </div>
      ) : (
        <>
          <div className="benefit-remaining">
            {t('reimburse.remaining', { amount: fmtAmount(b, view.remaining) })}
            {view.periodEnd ? <span className="benefit-until"> · {t('reimburse.until', { date: fmtShort(view.periodEnd) })}</span> : null}
            {b.unit === '积分' ? <span className="benefit-until"> · {t('reimburse.notCounted')}</span> : null}
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
            <span className="progress-dot" style={{ left: `${pct}%` }} />
          </div>
        </>
      )}

      {b.note ? <div className="benefit-note">{b.note}</div> : null}
      <div className="benefit-meta">
        {cardName} · {t('reimburse.usedThisPeriod', { amount: fmtAmount(b, view.used) })}
        {uses.length > 0 ? (
          <span className="use-list">
            {uses.slice(-3).map((u: BenefitUse) => (
              <span key={u.id} className="use-chip" title={`${u.usedOn} ${fmtAmount(b, u.amount)}`}>
                {u.usedOn} {fmtAmount(b, u.amount)}
                <button
                  type="button"
                  className="use-del"
                  title={t('common.delete')}
                  onClick={() => store.deleteUse(u.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </span>
        ) : null}
      </div>

      {view.status !== 'not_started' && view.status !== 'used' && (
        <div className="benefit-ops">
          <button type="button" className="btn btn-primary" onClick={markUsed}>
            {t('reimburse.markUsed')}
          </button>
          <span className="partial">
            <input
              type="number"
              min="0"
              step="1"
              placeholder={t('reimburse.logAmountPh')}
              value={partial}
              onChange={(e) => setPartial(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={!partial || Number(partial) <= 0}
              onClick={() => {
                store.logUse(b.id, Number(partial), today);
                setPartial('');
              }}
            >
              {t('reimburse.log')}
            </button>
          </span>
        </div>
      )}

      {editing && (
        <div className="edit-form">
          <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t('reimburse.editNamePh')} />
          <input
            type="number"
            min="0"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            placeholder={t('reimburse.editAmountPh')}
          />
          <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder={t('reimburse.editNotePh')} />
          <div className="edit-form-btns">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                store.updateBenefit(b.id, { name: editName.trim() || b.name, amount: Number(editAmount) || 0, note: editNote });
                setEditing(false);
              }}
            >
              {t('common.save')}
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm(t('reimburse.deleteConfirm', { name: b.name }))) store.deleteBenefit(b.id);
              }}
            >
              {t('reimburse.deleteBenefit')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DoorDashCard({
  views,
  cardName,
  bank,
  store,
}: {
  views: BenefitView[];
  cardName: string;
  bank: string;
  store: Store;
}) {
  const total = views.reduce((s, v) => s + v.benefit.amount, 0);
  const remaining = views.reduce((s, v) => s + v.remaining, 0);
  const used = total - remaining;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const today = todayStr();
  const periodEnd = views[0]?.periodEnd ?? null;
  return (
    <div className="benefit-card">
      <div className="benefit-top">
        <div className="benefit-title">
          <BankBadge bank={bank} size="xs" />
          <span className="benefit-name">DoorDash</span>
          <span className="period-badge">{t('period.monthly')}</span>
        </div>
        <div className="benefit-actions">
          {views.map((v) => (
            <button
              key={v.benefit.id}
              type="button"
              className="icon-btn"
              title={`${t('reimburse.ignore')} ${v.benefit.name}`}
              onClick={() => store.updateBenefit(v.benefit.id, { ignored: true })}
            >
              👁‍🗨
            </button>
          ))}
        </div>
      </div>
      <div className="benefit-remaining">
        {t('reimburse.remaining', { amount: `$${remaining.toLocaleString()}` })}
        {periodEnd ? <span className="benefit-until"> · {t('reimburse.until', { date: fmtShort(periodEnd) })}</span> : null}
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
        <span className="progress-dot" style={{ left: `${pct}%` }} />
      </div>
      <div className="benefit-note">{t('reimburse.doordashNote')}</div>
      <div className="benefit-meta">{cardName}</div>
      <div className="doordash-btns">
        {views.map((v) => (
          <button
            key={v.benefit.id}
            type="button"
            className="btn doordash-btn"
            disabled={v.status === 'used' || v.status === 'not_started'}
            onClick={() => store.logUse(v.benefit.id, v.remaining, today)}
          >
            {v.benefit.subLabel ?? v.benefit.name} ${v.remaining.toLocaleString()}
            {v.status === 'used' ? t('reimburse.doordashUsed') : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReimbursementsTab({ store }: { store: Store }) {
  const [bankFilter, setBankFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('unused');
  const [showIgnored, setShowIgnored] = useState(false);
  const today = new Date();

  const views = useMemo(() => {
    return store.state.benefits.map((b) => {
      const card = store.cardsById.get(b.cardId);
      return {
        view: evaluateBenefit(b, card?.openedOn ?? null, store.state.uses, today),
        card,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.state]);

  const banks = useMemo(() => [...new Set(store.state.cards.map((c) => c.bank).filter(Boolean))].sort(), [store.state.cards]);

  // 过期隐藏；未开始的 FN 显示但不计入总额
  const visible = views.filter(({ view }) => view.status !== 'expired');
  const unusedTotal = visible
    .filter(({ view, card }) => {
      if (view.benefit.ignored || view.status !== 'available') return false;
      if (view.benefit.kind !== 'cash') return false;
      if (bankFilter && card?.bank !== bankFilter) return false;
      return true;
    })
    .reduce((s, { view }) => s + view.remaining, 0);

  const filtered = visible.filter(({ view, card }) => {
    if (bankFilter && card?.bank !== bankFilter) return false;
    if (statusFilter === 'unused') return view.status === 'available' || view.status === 'not_started';
    if (statusFilter === 'used') return view.status === 'used';
    return true;
  });

  const ignored = views.filter(({ view }) => view.benefit.ignored && view.status !== 'expired');

  // DoorDash 合并：同一张卡的 doordash 组福利合成一张卡
  const groups = new Map<string, { view: BenefitView; card: ReturnType<typeof store.cardsById.get> }[]>();
  const singles: { view: BenefitView; card: ReturnType<typeof store.cardsById.get> }[] = [];
  filtered.forEach((item) => {
    if (item.view.benefit.ignored) return;
    if (item.view.benefit.group === 'doordash') {
      const key = item.view.benefit.cardId;
      const arr = groups.get(key) ?? [];
      arr.push(item);
      groups.set(key, arr);
    } else {
      singles.push(item);
    }
  });

  return (
    <div>
      <div className="tab-head">
        <div>
          <div className="tab-title">{t('reimburse.total', { total: unusedTotal.toLocaleString() })}</div>
          <div className="tab-sub">{t('reimburse.totalNote')}</div>
        </div>
        <div className="tab-filters">
          <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} aria-label={t('common.allBanks')}>
            <option value="">{t('common.allBanks')}</option>
            {banks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <div className="chip-row">
            {(['unused', 'used', 'all'] as StatusFilter[]).map((f) => (
              <Chip key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>
                {f === 'unused' ? t('reimburse.unused') : f === 'used' ? t('reimburse.used') : t('reimburse.all')}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {store.state.cards.length === 0 ? (
        <div className="empty">
          {t('reimburse.noCards')}
        </div>
      ) : filtered.length === 0 && groups.size === 0 ? (
        <div className="empty">{t('reimburse.noBenefits')}</div>
      ) : (
        <div className="benefit-list">
          {[...groups.entries()].map(([cardId, items]) => {
            const card = store.cardsById.get(cardId);
            return (
              <DoorDashCard
                key={`dd-${cardId}`}
                views={items.map((i) => i.view)}
                cardName={card?.name ?? ''}
                bank={card?.bank ?? ''}
                store={store}
              />
            );
          })}
          {singles.map(({ view, card }) => (
            <BenefitCard key={view.benefit.id} view={view} cardName={card?.name ?? ''} bank={card?.bank ?? ''} store={store} />
          ))}
        </div>
      )}

      {ignored.length > 0 && (
        <div className="ignored-section">
          <button type="button" className="ignored-toggle" onClick={() => setShowIgnored(!showIgnored)}>
            {t('reimburse.ignored', { n: ignored.length })} {showIgnored ? '▴' : '▾'}
          </button>
          {showIgnored && (
            <div className="benefit-list">
              {ignored.map(({ view, card }) => (
                <div key={view.benefit.id} className="benefit-card ignored-card">
                  <div className="benefit-top">
                    <div className="benefit-title">
                      <BankBadge bank={card?.bank ?? ''} size="xs" />
                      <span className="benefit-name">{view.benefit.name}</span>
                    </div>
                    <button type="button" className="btn" onClick={() => store.updateBenefit(view.benefit.id, { ignored: false })}>
                      {t('reimburse.restore')}
                    </button>
                  </div>
                  <div className="benefit-note">{card?.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
