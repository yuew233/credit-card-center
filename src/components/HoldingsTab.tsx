// 持卡 tab：开卡奖励资格管理。
// - 顶部概览：可申请 / 尚未可申请 / 待确认 / 5/24
// - 每张卡默认收起为一行（银行、卡名、持有时长、红绿灯），点开看日期、费用、规则与编辑
// - 间隔从上次拿奖励日期起算；没有该日期时按开卡日 + 3 个月估算并标注“估算”
// - 关卡不重置时钟

import { useMemo, useState } from 'react';
import type { HeldCard } from '../types';
import type { Store } from '../lib/store';
import { evaluateCard, fiveTwentyFour, type Eligibility } from '../lib/churn';
import { CATALOG } from '../data/catalog';
import { fmtShort, heldDuration } from '../lib/dates';
import { BankBadge, Chip, Field, Light } from './shared';

type EligibilityFilter = 'all' | 'eligible' | 'not_eligible';

function CardRow({ card, eligibility, store }: { card: HeldCard; eligibility: Eligibility; store: Store }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openedOn, setOpenedOn] = useState(card.openedOn ?? '');
  const [closedOn, setClosedOn] = useState(card.closedOn ?? '');
  const [lastBonusOn, setLastBonusOn] = useState(card.lastBonusOn ?? '');
  const [bonusReceived, setBonusReceived] = useState(card.bonusReceived === null ? '' : card.bonusReceived ? 'yes' : 'no');
  const [annualFee, setAnnualFee] = useState(card.annualFee === null ? '' : String(card.annualFee));
  const [note, setNote] = useState(card.note);

  return (
    <div className="hold-row">
      <button type="button" className="hold-summary" onClick={() => setOpen(!open)}>
        <BankBadge bank={card.bank} />
        <span className="hold-name">{card.name}</span>
        <span className="hold-duration">{heldDuration(card.openedOn, card.closedOn)}</span>
        <Light color={eligibility.light} />
        <span className="hold-chevron">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="hold-detail">
          <div className="hold-status-line">
            {card.status === 'closed' ? '已关卡' : '持有中'}
            {card.kind === 'business' ? ' · 商业卡' : ' · 个人卡'}
            {eligibility.nextEligibleOn ? (
              <span>
                {' '}
                · 下次可拿奖励：{fmtShort(eligibility.nextEligibleOn)}
                {eligibility.estimated ? '（估算）' : ''}
              </span>
            ) : null}
          </div>
          <div className="hold-rule">{eligibility.note}</div>
          <dl className="hold-dl">
            <div>
              <dt>开卡日期</dt>
              <dd>{fmtShort(card.openedOn)}</dd>
            </div>
            <div>
              <dt>关卡日期</dt>
              <dd>{fmtShort(card.closedOn)}</dd>
            </div>
            <div>
              <dt>上次拿奖励</dt>
              <dd>{fmtShort(card.lastBonusOn)}</dd>
            </div>
            <div>
              <dt>是否拿过奖励</dt>
              <dd>{card.bonusReceived === null ? '待确认' : card.bonusReceived ? '是' : '否'}</dd>
            </div>
            <div>
              <dt>年费</dt>
              <dd>{card.annualFee === null ? '—' : `$${card.annualFee}`}</dd>
            </div>
          </dl>
          {card.note ? <div className="benefit-note">{card.note}</div> : null}
          <div className="hold-btns">
            <button type="button" className="btn" onClick={() => setEditing(!editing)}>
              {editing ? '取消编辑' : '编辑'}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm(`确定删除「${card.name}」吗？它的福利和已用记录也会一起删除。`)) store.deleteCard(card.id);
              }}
            >
              删除
            </button>
          </div>
          {editing && (
            <div className="edit-form">
              <Field label="开卡日期">
                <input type="date" value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} />
              </Field>
              <Field label="关卡日期（持有中请留空）">
                <input type="date" value={closedOn} onChange={(e) => setClosedOn(e.target.value)} />
              </Field>
              <Field label="上次拿奖励日期">
                <input type="date" value={lastBonusOn} onChange={(e) => setLastBonusOn(e.target.value)} />
              </Field>
              <Field label="是否拿过该卡奖励">
                <select value={bonusReceived} onChange={(e) => setBonusReceived(e.target.value)}>
                  <option value="">待确认</option>
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </Field>
              <Field label="年费（$）">
                <input type="number" min="0" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)} placeholder="未知" />
              </Field>
              <Field label="备注">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注" />
              </Field>
              <div className="edit-form-btns">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    store.updateCard(card.id, {
                      openedOn: openedOn || null,
                      closedOn: closedOn || null,
                      lastBonusOn: lastBonusOn || null,
                      bonusReceived: bonusReceived === '' ? null : bonusReceived === 'yes',
                      annualFee: annualFee === '' ? null : Number(annualFee),
                      note,
                      status: closedOn ? 'closed' : 'open',
                    });
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

export function HoldingsTab({ store }: { store: Store }) {
  const [bankFilter, setBankFilter] = useState('');
  const [eligFilter, setEligFilter] = useState<EligibilityFilter>('all');
  const [productId, setProductId] = useState(CATALOG[0]?.id ?? '');
  const [newOpenedOn, setNewOpenedOn] = useState('');
  const [newLastBonusOn, setNewLastBonusOn] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const today = new Date();

  const evaluated = useMemo(
    () =>
      store.state.cards.map((card) => ({
        card,
        eligibility: evaluateCard(card, store.state.cards, today),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.state.cards],
  );

  const counts = useMemo(() => {
    let eligible = 0;
    let notYet = 0;
    let unknown = 0;
    evaluated.forEach(({ eligibility }) => {
      if (eligibility.status === 'eligible') eligible += 1;
      else if (eligibility.status === 'not_yet') notYet += 1;
      else unknown += 1;
    });
    return { eligible, notYet, unknown };
  }, [evaluated]);

  const f524 = fiveTwentyFour(store.state.cards, today);
  const banks = useMemo(() => [...new Set(store.state.cards.map((c) => c.bank).filter(Boolean))].sort(), [store.state.cards]);

  const filtered = evaluated.filter(({ card, eligibility }) => {
    if (bankFilter && card.bank !== bankFilter) return false;
    if (eligFilter === 'eligible') return eligibility.status === 'eligible';
    if (eligFilter === 'not_eligible') return eligibility.status !== 'eligible';
    return true;
  });

  const groupedBanks = useMemo(() => {
    const map = new Map<string, typeof CATALOG>();
    CATALOG.forEach((p) => {
      const arr = map.get(p.bank) ?? [];
      arr.push(p);
      map.set(p.bank, arr);
    });
    return [...map.entries()];
  }, []);

  return (
    <div>
      <div className="overview">
        <div className="overview-item">
          <span className="overview-num green">{counts.eligible}</span>
          <span className="overview-label">可申请 / 可重开</span>
        </div>
        <div className="overview-item">
          <span className="overview-num red">{counts.notYet}</span>
          <span className="overview-label">尚未可申请</span>
        </div>
        <div className="overview-item">
          <span className="overview-num gray">{counts.unknown}</span>
          <span className="overview-label">待确认</span>
        </div>
        <div className="overview-item">
          <span className="overview-num">{f524}/5</span>
          <span className="overview-label">5/24（个人卡）</span>
        </div>
      </div>

      <div className="tab-head">
        <div className="tab-filters">
          <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} aria-label="按银行筛选">
            <option value="">全部银行</option>
            {banks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <div className="chip-row">
            {(
              [
                ['all', '全部'],
                ['eligible', '可开'],
                ['not_eligible', '不可开（含待确认）'],
              ] as [EligibilityFilter, string][]
            ).map(([f, label]) => (
              <Chip key={f} active={eligFilter === f} onClick={() => setEligFilter(f)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '取消' : '＋ 添加卡片'}
        </button>
      </div>

      {showAdd && (
        <div className="add-card">
          <Field label="卡产品（从目录选择，福利自动生成）">
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              {groupedBanks.map(([bank, products]) => (
                <optgroup key={bank} label={bank}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.annualFee !== null ? `（年费 $${p.annualFee}）` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="开卡日期">
            <input type="date" value={newOpenedOn} onChange={(e) => setNewOpenedOn(e.target.value)} />
          </Field>
          <Field label="上次拿奖励日期（没有可空着，会按开卡日估算）">
            <input type="date" value={newLastBonusOn} onChange={(e) => setNewLastBonusOn(e.target.value)} />
          </Field>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const product = CATALOG.find((p) => p.id === productId);
              if (!product) return;
              store.addCard({
                productId: product.id,
                bank: product.bank,
                name: product.name,
                kind: product.kind,
                annualFee: product.annualFee,
                status: 'open',
                openedOn: newOpenedOn || null,
                lastBonusOn: newLastBonusOn || null,
              });
              setNewOpenedOn('');
              setNewLastBonusOn('');
              setShowAdd(false);
            }}
          >
            添加
          </button>
          <div className="add-card-hint">也可以点顶部「导入模板」批量导入，或用「加载示例卡」先看看效果。</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">没有符合条件的卡。</div>
      ) : (
        <div className="hold-list">
          {filtered.map(({ card, eligibility }) => (
            <CardRow key={card.id} card={card} eligibility={eligibility} store={store} />
          ))}
        </div>
      )}
      <div className="tab-foot-note">间隔从上次拿奖励日期起算，关卡不重置时钟；没有拿奖励日期时按开卡日 + 3 个月估算，并标注“估算”。</div>
    </div>
  );
}
