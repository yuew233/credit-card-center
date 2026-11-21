// 持卡 tab：开卡奖励资格管理。
// - 顶部概览：可申请 / 不可申请 / 待确认 / 5/24
// - 每张卡默认收起为一行（银行、卡名、持有时长、红绿灯），点开看日期、费用、规则与编辑
// - 间隔从上次拿奖励日期起算；没有该日期时按开卡日 + 3 个月估算并标注“估算”
// - 关卡不重置时钟

import { useMemo, useState } from 'react';
import type { HeldCard } from '../types';
import type { Store } from '../lib/store';
import { evaluateCard, fiveTwentyFour, fiveTwentyFourDetail, type Eligibility } from '../lib/churn';
import { CATALOG } from '../data/catalog';
import { addMonths, fmtShort, heldDuration } from '../lib/dates';
import { BankBadge, Chip, Field, sortBanks } from './shared';
import { t, useLang } from '../lib/i18n';

function statusText(status: Eligibility['status']): string {
  if (status === 'eligible') return t('holdings.statusEligible');
  if (status === 'not_yet') return t('holdings.statusNotYet');
  return t('holdings.statusUnknown');
}

type EligibilityFilter = 'all' | 'eligible' | 'not_eligible';

function CardRow({ card, eligibility, store }: { card: HeldCard; eligibility: Eligibility; store: Store }) {
  const { lang } = useLang();
  const fmtDate = (d: string | null) => (d ? fmtShort(d) : t('common.unknownDate'));
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
        <span className="hold-duration">{heldDuration(card.openedOn, card.closedOn, undefined, lang)}</span>
        <span className={`elig-pill elig-${eligibility.status}`}>{statusText(eligibility.status)}</span>
        <span className="hold-chevron">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="hold-detail">
          <div className="hold-status-line">
            {card.status === 'closed' ? t('holdings.closed') : t('holdings.open')}
            {card.kind === 'business' ? ` · ${t('holdings.business')}` : ` · ${t('holdings.personal')}`}
            {' · '}
            {statusText(eligibility.status)}
            {eligibility.nextEligibleOn ? (
              <span>
                {' '}
                · {t('holdings.nextEligible', { date: fmtShort(eligibility.nextEligibleOn) })}
                {eligibility.estimated ? t('holdings.estimated') : ''}
              </span>
            ) : null}
          </div>
          <div className="hold-rule">
            <span className="hold-rule-label">{t('holdings.rule')}：</span>
            {eligibility.note}
          </div>
          {eligibility.conflict ? <div className="hold-conflict">⚠ {eligibility.conflict}</div> : null}
          <dl className="hold-dl">
            <div>
              <dt>{t('holdings.openedOn')}</dt>
              <dd>{fmtDate(card.openedOn)}</dd>
            </div>
            <div>
              <dt>{t('holdings.closedOn')}</dt>
              <dd>{fmtDate(card.closedOn)}</dd>
            </div>
            <div>
              <dt>{t('holdings.lastBonus')}</dt>
              <dd>
                {card.lastBonusOn
                  ? fmtDate(card.lastBonusOn)
                  : card.openedOn
                    ? t('holdings.lastBonusEst', { date: fmtShort(addMonths(card.openedOn, 3)) })
                    : t('common.unknownDate')}
              </dd>
            </div>
            <div>
              <dt>{t('holdings.bonusReceived')}</dt>
              <dd>{card.bonusReceived === null ? t('common.unknownDate') : card.bonusReceived ? t('common.yes') : t('common.no')}</dd>
            </div>
            <div>
              <dt>{t('holdings.annualFee')}</dt>
              <dd>{card.annualFee === null ? t('holdings.annualFeeUnknown') : `$${card.annualFee}`}</dd>
            </div>
          </dl>
          {card.note ? <div className="benefit-note">{card.note}</div> : null}
          <div className="hold-btns">
            <button type="button" className="btn" onClick={() => setEditing(!editing)}>
              {editing ? t('common.cancel') : t('common.edit')}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (window.confirm(t('holdings.deleteConfirm', { name: card.name }))) store.deleteCard(card.id);
              }}
            >
              {t('common.delete')}
            </button>
          </div>
          {editing && (
            <div className="edit-form">
              <Field label={t('holdings.openedOn')}>
                <input type="date" value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} />
              </Field>
              <Field label={t('holdings.closedOnHint')}>
                <input type="date" value={closedOn} onChange={(e) => setClosedOn(e.target.value)} />
              </Field>
              <Field label={t('holdings.lastBonus')}>
                <input type="date" value={lastBonusOn} onChange={(e) => setLastBonusOn(e.target.value)} />
              </Field>
              <Field label={t('holdings.bonusReceived')}>
                <select value={bonusReceived} onChange={(e) => setBonusReceived(e.target.value)}>
                  <option value="">{t('common.unknownDate')}</option>
                  <option value="yes">{t('common.yes')}</option>
                  <option value="no">{t('common.no')}</option>
                </select>
              </Field>
              <Field label={t('holdings.annualFee')}>
                <input type="number" min="0" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)} placeholder={t('common.unknown')} />
              </Field>
              <Field label={t('common.note')}>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('common.note')} />
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

/** 5/24 明细与规则参考（Space 站同款，全部动态计算，绝不写死）。 */
function FiveTwentyFourSection({ cards, today }: { cards: HeldCard[]; today: Date }) {
  const detail = fiveTwentyFourDetail(cards, today);
  const unknownCount = cards.filter((c) => c.kind === 'personal' && !c.openedOn).length;
  const brilliant = cards.find(
    (c) =>
      c.status === 'open' &&
      (c.productId === 'amex-marriott-brilliant' || c.name === 'Marriott Bonvoy Brilliant') &&
      c.openedOn,
  );
  const p3cYear = brilliant?.openedOn ? addMonths(addMonths(brilliant.openedOn, 3), 24).slice(0, 4) : '';
  return (
    <section className="f524-section">
      <h2 className="f524-title">{t('holdings.f524Title')}</h2>
      <div className="f524-list-title">{t('holdings.f524ListTitle', { n: detail.length })}</div>
      <ul className="f524-list">
        {detail.map(({ card, dropOutOn }) => (
          <li key={card.id}>
            {card.bank} {card.name} — {fmtShort(card.openedOn!)}
            {card.status === 'closed' ? t('holdings.f524ClosedNote') : ''}
            {' · '}
            {fmtShort(dropOutOn)}
            {t('holdings.f524Dropout')}
          </li>
        ))}
      </ul>
      {unknownCount > 0 ? <div className="f524-unknown">{t('holdings.f524UnknownNote', { n: unknownCount })}</div> : null}
      <div className="f524-rules">
        <p>{t('holdings.rulesP1')}</p>
        <p>{t('holdings.rulesP2')}</p>
        <p>
          {t('holdings.rulesP3a')}
          <a
            href="https://www.uscreditcardguide.com/marriott-bonvoy-lianmingkakaikajianglixianzhizhengcehuizongjishenqingcelue/?mobile="
            target="_blank"
            rel="noreferrer"
          >
            {t('holdings.rulesP3Link')}
          </a>
          {t('holdings.rulesP3b')}
          {brilliant?.openedOn ? (
            <>
              {' '}
              {t('holdings.rulesP3c', { date: fmtShort(brilliant.openedOn), year: p3cYear })}
            </>
          ) : null}
        </p>
        <p>{t('holdings.rulesP4')}</p>
        <p>{t('holdings.rulesP5')}</p>
      </div>
    </section>
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

  // 持卡中 / 已关卡两节，每节内再按银行分组。
  const openCards = filtered.filter(({ card }) => card.status !== 'closed');
  const closedCards = filtered.filter(({ card }) => card.status === 'closed');
  const groupByBank = (items: typeof filtered) => {
    const byBank = new Map<string, typeof filtered>();
    items.forEach((it) => {
      const bank = it.card.bank || '';
      const arr = byBank.get(bank) ?? [];
      arr.push(it);
      byBank.set(bank, arr);
    });
    return sortBanks([...byBank.keys()]).map((bank) => ({ bank, items: byBank.get(bank)! }));
  };

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
          <span className="overview-label">{t('holdings.eligible')}</span>
        </div>
        <div className="overview-item">
          <span className="overview-num red">{counts.notYet}</span>
          <span className="overview-label">{t('holdings.notYet')}</span>
        </div>
        <div className="overview-item">
          <span className="overview-num gray">{counts.unknown}</span>
          <span className="overview-label">{t('holdings.unknown')}</span>
        </div>
        <div className="overview-item">
          <span className="overview-num">{f524}/5</span>
          <span className="overview-label">{t('holdings.f524')}</span>
        </div>
      </div>

      <div className="tab-head">
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
            {(
              [
                ['all', t('holdings.all')],
                ['eligible', t('holdings.canOpen')],
                ['not_eligible', t('holdings.cannotOpen')],
              ] as [EligibilityFilter, string][]
            ).map(([f, label]) => (
              <Chip key={f} active={eligFilter === f} onClick={() => setEligFilter(f)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? t('common.cancel') : t('holdings.addCard')}
        </button>
      </div>

      {showAdd && (
        <div className="add-card">
          <Field label={t('holdings.productLabel')}>
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              {groupedBanks.map(([bank, products]) => (
                <optgroup key={bank} label={bank}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.annualFee !== null ? `（${t('holdings.annualFee')} $${p.annualFee}）` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label={t('holdings.openedOn')}>
            <input type="date" value={newOpenedOn} onChange={(e) => setNewOpenedOn(e.target.value)} />
          </Field>
          <Field label={t('holdings.lastBonusLabel')}>
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
            {t('common.add')}
          </button>
          <div className="add-card-hint">{t('holdings.addHint')}</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">{t('holdings.empty')}</div>
      ) : (
        (['open', 'closed'] as const).map((sec) => {
          const items = sec === 'open' ? openCards : closedCards;
          if (items.length === 0) return null;
          return (
            <div key={sec} className="hold-section">
              <div className="hold-section-head">
                {sec === 'open' ? t('holdings.openWithCount', { n: items.length }) : t('holdings.closedWithCount', { n: items.length })}
              </div>
              {groupByBank(items).map((g) => (
                <div key={g.bank || 'unknown'} className="hold-bank-group">
                  <div className="hold-bank-head">
                    <BankBadge bank={g.bank} size="xs" />
                    <span className="hold-bank-name">{g.bank || t('common.unknown')}</span>
                    <span className="hold-bank-count">{g.items.length}</span>
                  </div>
                  <div className="hold-list">
                    {g.items.map(({ card, eligibility }) => (
                      <CardRow key={card.id} card={card} eligibility={eligibility} store={store} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}
      <FiveTwentyFourSection cards={store.state.cards} today={today} />
      <div className="tab-foot-note">{t('holdings.footNote')}</div>
    </div>
  );
}
