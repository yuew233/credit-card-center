// 报销 tab：
// - 顶部两张汇总卡：本期未用报销（现金类、本周期可用、未忽略、非每次入住的剩余额度合计）+ 临近到期/重置（45 天内到期或重置且还有余额的项数）
// - 未用 / 已用 / 全部是分段滑块；银行下拉只筛列表，不影响汇总
// - 只显示最近的周期：固定周期已过的福利自动隐藏，不计入总额，到新周期再回来
// - 不打「未用」徽章（已在未用筛选下）；临近到期只高亮截至日期
// - 列表按卡扁平排列，不按银行分组；每张卡名前有银行 logo；卡按年费降序
// - 免房晚（FN）第二年才开始：未开始前显示「第二年起 · 开始日」，不计入总额
// - DoorDash 同卡多项福利合并为一张卡，两个按钮分别记账
// - 忽略（眼睛）→ 收进底部「已忽略」区，可恢复
// - 标记已用按钮用 Space 站配色（#0d4a87 底白字；已用态绿边框 + 灰绿底 + 绿字）

import { useMemo, useState } from 'react';
import type { BenefitInstance } from '../types';
import type { Store } from '../lib/store';
import { evaluateBenefit, type BenefitView } from '../lib/periods';
import { daysBetween, fmtShort, todayStr } from '../lib/dates';
import { BankBadge, IconEyeOff, IconPencil } from './shared';
import { t } from '../lib/i18n';

/** 临期：本周期可用、非月度周期、截至日距今天 ≤ 45 天（月度福利每月都轮换，不标临期；与 Space 站同口径）。 */
export function isExpiringSoon(view: BenefitView, today: string): boolean {
  if (view.status !== 'available' || !view.periodEnd) return false;
  if (view.benefit.cycle === 'monthly') return false;
  const d = daysBetween(today, view.periodEnd);
  return d >= 0 && d <= 45;
}

type StatusFilter = 'unused' | 'used' | 'all';

/** 本周期标记切换：未标记时记一笔全额（补足本期剩余额度），已标记时删掉本期的使用记录。 */
function togglePeriodMark(view: BenefitView, store: Store) {
  const today = todayStr();
  const uses = store.state.uses.filter((u) => u.benefitId === view.benefit.id);
  const period = view.period;
  const periodUses = period ? uses.filter((u) => u.usedOn >= period.start && u.usedOn <= period.end) : uses;
  if (view.status === 'used') {
    periodUses.forEach((u) => store.deleteUse(u.id));
  } else if (view.remaining > 0) {
    store.logUse(view.benefit.id, view.remaining, today);
  }
}

function fmtAmount(b: BenefitInstance, n: number): string {
  if (b.unit === '积分') return `${n.toLocaleString()} 积分`;
  return `$${n.toLocaleString()}`;
}

function BenefitCard({
  view,
  bank,
  store,
}: {
  view: BenefitView;
  bank: string;
  store: Store;
}) {
  const { benefit: b } = view;
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(b.name);
  const [editAmount, setEditAmount] = useState(String(b.amount));
  const [editNote, setEditNote] = useState(b.note);
  const pct = b.amount > 0 ? Math.round(((b.amount - view.remaining) / b.amount) * 100) : 0;
  const expiring = isExpiringSoon(view, todayStr());

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
            <IconEyeOff size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            title={t('common.edit')}
            onClick={() => {
              setEditing(!editing);
            }}
          >
            <IconPencil size={18} />
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
            {view.periodEnd ? (
              <span className={`benefit-until ${expiring ? 'expiring-date' : ''}`}>
                {' '}· {t('reimburse.until', { date: fmtShort(view.periodEnd) })}
              </span>
            ) : null}
            {b.unit === '积分' ? <span className="benefit-until"> · {t('reimburse.notCounted')}</span> : null}
          </div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
            <span className="progress-dot" style={{ left: `${pct}%` }} />
          </div>
        </>
      )}

      {b.note ? <div className="benefit-note">{b.note}</div> : null}

      {view.status !== 'not_started' && (
        <div className="benefit-ops">
          <button
            type="button"
            className={`mark-btn ${view.status === 'used' ? 'is-used' : ''}`}
            onClick={() => togglePeriodMark(view, store)}
          >
            {view.status === 'used' ? t('reimburse.markedUsed') : t('reimburse.markUsed')}
          </button>
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
  bank,
  store,
}: {
  views: BenefitView[];
  bank: string;
  store: Store;
}) {
  const total = views.reduce((s, v) => s + v.benefit.amount, 0);
  const remaining = views.reduce((s, v) => s + v.remaining, 0);
  const used = total - remaining;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
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
              <IconEyeOff size={18} />
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
      <div className="doordash-btns">
        {views.map((v) => (
          <button
            key={v.benefit.id}
            type="button"
            className={`mark-btn doordash-btn ${v.status === 'used' ? 'is-used' : ''}`}
            disabled={v.status === 'not_started'}
            onClick={() => togglePeriodMark(v, store)}
          >
            {v.benefit.subLabel ?? v.benefit.name} ${v.remaining.toLocaleString()}
            {v.status === 'used' ? t('reimburse.doordashUsed') : ''}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReimbursementsTab({ store, onGoToHoldings }: { store: Store; onGoToHoldings: () => void }) {
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
  const todayS = todayStr();

  // 过期隐藏；未开始的 FN 显示但不计入总额
  const visible = views.filter(({ view }) => view.status !== 'expired');
  // 汇总口径（全局，不受银行筛选影响）：现金类、本周期可用、未忽略、非每次入住的剩余额度合计
  const summaryBase = visible.filter(
    ({ view }) =>
      !view.benefit.ignored &&
      view.benefit.kind === 'cash' &&
      view.status === 'available' &&
      view.benefit.cycle !== 'per_stay',
  );
  const unusedTotal = summaryBase.reduce((s, { view }) => s + view.remaining, 0);
  // 临近到期 / 重置：45 天内到期或重置且还有余额（月度、每次入住不算）
  const expiringCount = summaryBase.filter(({ view }) => {
    if (!view.periodEnd || view.benefit.cycle === 'monthly') return false;
    const d = daysBetween(todayS, view.periodEnd);
    return d >= 0 && d <= 45;
  }).length;

  const filtered = visible.filter(({ view, card }) => {
    if (bankFilter && card?.bank !== bankFilter) return false;
    if (statusFilter === 'unused') return view.status === 'available' || view.status === 'not_started';
    if (statusFilter === 'used') return view.status === 'used';
    return true;
  });

  const ignored = views.filter(({ view }) => view.benefit.ignored && view.status !== 'expired');

  // 扁平列表：按卡分组（DoorDash 同卡多项福利合成一张卡），卡按年费降序（年费未知排最后）
  type CardGroup = {
    cardId: string;
    cardName: string;
    bank: string;
    annualFee: number | null;
    singles: { view: BenefitView }[];
    doordash: BenefitView[];
  };
  const cardGroups: CardGroup[] = (() => {
    const byCard = new Map<string, CardGroup>();
    filtered.forEach(({ view, card }) => {
      if (view.benefit.ignored) return;
      const cardId = view.benefit.cardId;
      let cg = byCard.get(cardId);
      if (!cg) {
        cg = {
          cardId,
          cardName: card?.name ?? '',
          bank: card?.bank ?? '',
          annualFee: card?.annualFee ?? null,
          singles: [],
          doordash: [],
        };
        byCard.set(cardId, cg);
      }
      if (view.benefit.group === 'doordash') cg.doordash.push(view);
      else cg.singles.push({ view });
    });
    return [...byCard.values()].sort(
      (a, b) => (b.annualFee ?? -1) - (a.annualFee ?? -1) || a.cardName.localeCompare(b.cardName),
    );
  })();

  return (
    <div>
      <div className="reimburse-summary">
        <div className="summary-card">
          <div className="summary-title">{t('reimburse.summaryUnusedTitle')}</div>
          <div className="summary-value">${unusedTotal.toLocaleString()}</div>
          <div className="summary-sub">{t('reimburse.summaryUnusedSub')}</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">{t('reimburse.summaryExpiringTitle')}</div>
          <div className="summary-value">
            {expiringCount}
            <span className="summary-unit">{t('reimburse.summaryExpiringUnit')}</span>
          </div>
          <div className="summary-sub">
            {expiringCount > 0 ? t('reimburse.summaryExpiringSub') : t('reimburse.summaryExpiringNone')}
          </div>
        </div>
      </div>

      <div className="tab-head">
        <div className="seg">
          {(['unused', 'used', 'all'] as StatusFilter[]).map((f) => (
            <button key={f} type="button" className={statusFilter === f ? 'active' : ''} onClick={() => setStatusFilter(f)}>
              {f === 'unused' ? t('reimburse.unused') : f === 'used' ? t('reimburse.used') : t('reimburse.all')}
            </button>
          ))}
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
        </div>
      </div>
      <div className="tab-sub reimburse-howto">{t('reimburse.howto')}</div>

      {store.state.cards.length === 0 ? (
        <div className="empty">
          <p>{t('reimburse.noCards')}</p>
          <button type="button" className="mark-btn" onClick={onGoToHoldings}>
            {t('reimburse.goAddCard')}
          </button>
        </div>
      ) : cardGroups.length === 0 ? (
        <div className="empty">{t('reimburse.noBenefits')}</div>
      ) : (
        <div className="benefit-list">
          {cardGroups.map((cg) => (
            <div key={cg.cardId} className="card-group">
              <div className="card-group-head">
                <BankBadge bank={cg.bank} size="xs" /> {cg.cardName}
              </div>
              {cg.doordash.length > 0 && (
                <DoorDashCard key={`dd-${cg.cardId}`} views={cg.doordash} bank={cg.bank} store={store} />
              )}
              {cg.singles.map(({ view }) => (
                <BenefitCard key={view.benefit.id} view={view} bank={cg.bank} store={store} />
              ))}
            </div>
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
