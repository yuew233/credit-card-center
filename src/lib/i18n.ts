// 中英文切换：界面文字双语，卡名、银行名、伙伴名和用户输入的数据不翻译。
// 默认中文，选择记在 localStorage。t() 缺 key 时回退显示 key 本身。

import { createContext, useContext } from 'react';

export type Lang = 'zh' | 'en';

const LANG_KEY = 'credit-card-center-lang';

function readInitialLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

let current: Lang = typeof localStorage !== 'undefined' ? readInitialLang() : 'zh';

export function getLang(): Lang {
  return current;
}

export function setLangModule(l: Lang): void {
  current = l;
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignore */
  }
}

export const STRINGS: Record<string, { zh: string; en: string }> = {
  // ---- App ----
  'app.title': { zh: '信用卡中心', en: 'Credit Card Center' },
  'app.subtitle': {
    zh: '报销 · 开卡间隔 · 转分 · 刷哪张 —— 数据只存在你的浏览器里，不上传、不注册。',
    en: 'Reimbursements · churn timing · transfers · best card — your data stays in this browser only, never uploaded, no account needed.',
  },
  'tab.reimburse': { zh: '报销', en: 'Reimbursements' },
  'tab.holdings': { zh: '持卡', en: 'Cards' },
  'tab.transfers': { zh: '转分', en: 'Transfers' },
  'tab.earn': { zh: '刷哪张', en: 'Best Card' },
  'btn.import': { zh: '导入备份', en: 'Import backup' },
  'btn.sample': { zh: '加载示例卡', en: 'Load sample cards' },
  'btn.export': { zh: '导出备份', en: 'Export backup' },
  'btn.clear': { zh: '清空数据', en: 'Clear data' },
  'confirm.clear': {
    zh: '确定清空全部数据吗？包括卡片、福利和使用记录（参考数据会恢复为内置默认值）。',
    en: 'Clear all data? Cards, benefits and usage records will be removed (reference data resets to built-in defaults).',
  },
  'msg.cleared': { zh: '已清空。', en: 'Cleared.' },
  'msg.sampleLoaded': {
    zh: '已加载 {n} 张示例卡（标注“示例”，数据是假的，仅供体验；请删除后导入自己的卡）。',
    en: 'Loaded {n} sample cards (marked “sample” — fake data for trying things out; delete them and import your own cards).',
  },
  'msg.sampleFailed': { zh: '示例模板加载失败。', en: 'Failed to load the sample template.' },
  'msg.imported': {
    zh: '已导入：{cards} 张卡（新增 {ca} / 更新 {cu}）、{benefits} 项福利、{earn} 条刷卡返现、{rates} 条转分比例、{bonuses} 条奖励。',
    en: 'Imported: {cards} cards (added {ca} / updated {cu}), {benefits} benefits, {earn} earn rates, {rates} transfer rates, {bonuses} bonuses.',
  },
  'msg.importFailed': { zh: '导入失败：{err}', en: 'Import failed: {err}' },
  'welcome.title': { zh: '先把你的卡导进来', en: 'Import your cards first' },
  'welcome.li1': {
    zh: '复制 data/cards-template.json，按格式填自己的卡和开卡日期，点「导入备份」上传；也可以直接导入之前导出的备份文件。',
    en: 'Copy data/cards-template.json, fill in your cards and opened dates, then click “Import backup”; or import a backup file you exported before.',
  },
  'welcome.li2': {
    zh: '或者点「加载示例卡」先看 3 张示例卡的效果（假数据，标着“示例”），熟悉后再清空、导入自己的卡。',
    en: 'Or click “Load sample cards” to preview 3 clearly-marked sample cards (fake data), then clear them and import your own.',
  },
  'welcome.li3': { zh: '也可以在「持卡」页点「＋ 添加卡片」，一张张手动加。', en: 'Or add cards one by one from the Cards tab (“+ Add card”).' },
  'welcome.note': {
    zh: '所有数据只保存在浏览器 localStorage，不会发到任何服务器。换浏览器或清缓存会丢数据，记得「导出备份」。',
    en: 'All data stays in this browser’s localStorage and is never sent to any server. Switching browsers or clearing cache loses it — remember to “Export backup”.',
  },
  'app.footer': {
    zh: '参考数据（转分比例、奖励、估值、刷卡返现）为公开信息，2026-11-18 核实；银行条款会变，请以发卡行官网为准。转分不可逆。',
    en: 'Reference data (transfer ratios, bonuses, valuations, earn rates) is public information, verified 2026-11-18; bank terms change — check the issuer’s site. Transfers are irreversible.',
  },
  'app.version': { zh: '版本 v1.0.0', en: 'Version v1.0.0' },

  // ---- 通用 ----
  'common.unknownDate': { zh: '待确认', en: 'To confirm' },
  'common.save': { zh: '保存', en: 'Save' },
  'common.cancel': { zh: '取消', en: 'Cancel' },
  'common.edit': { zh: '编辑', en: 'Edit' },
  'common.delete': { zh: '删除', en: 'Delete' },
  'common.add': { zh: '添加', en: 'Add' },
  'common.allBanks': { zh: '全部银行', en: 'All banks' },
  'common.yes': { zh: '是', en: 'Yes' },
  'common.no': { zh: '否', en: 'No' },
  'common.note': { zh: '备注', en: 'Note' },
  'common.unknown': { zh: '未知', en: 'Unknown' },

  // ---- 报销 ----
  'reimburse.total': { zh: '本期未用总额 ${total}', en: 'Unused this period: ${total}' },
  'reimburse.totalNote': { zh: '只统计最近的周期，过期的不管；免房晚不计入美元总额。', en: 'Only the current period counts; expired periods are excluded; free nights don’t count toward the dollar total.' },
  'reimburse.unused': { zh: '未用', en: 'Unused' },
  'reimburse.used': { zh: '已用', en: 'Used' },
  'reimburse.all': { zh: '全部', en: 'All' },
  'reimburse.noCards': { zh: '还没有卡。去「持卡」页最下面点「加载示例卡」看看效果，或「导入备份」导入自己的卡。', en: 'No cards yet. Go to the bottom of the Cards tab and click “Load sample cards” to try it out, or “Import backup” to bring in your cards.' },
  'reimburse.noBenefits': { zh: '当前筛选下没有福利。', en: 'No benefits match the current filters.' },
  'reimburse.remaining': { zh: '还剩 {amount}', en: '{amount} left' },
  'reimburse.until': { zh: '截至 {date}', en: 'until {date}' },
  'reimburse.notCounted': { zh: '不计入美元总额', en: 'not counted in the dollar total' },
  'reimburse.notStarted': { zh: '第二年起 · {date} 开始', en: 'Starts year 2 · {date}' },
  'reimburse.notStartedNoDate': { zh: '第二年起（请填写开卡日期）', en: 'Starts year 2 (enter the opened date first)' },
  'reimburse.usedThisPeriod': { zh: '本期已用 {amount}', en: 'Used this period: {amount}' },
  'reimburse.markUsed': { zh: '标记已用', en: 'Mark used' },
  'reimburse.logAmountPh': { zh: '记一笔金额', en: 'Log an amount' },
  'reimburse.log': { zh: '记录', en: 'Log' },
  'reimburse.ignore': { zh: '忽略这项', en: 'Ignore this' },
  'reimburse.editNamePh': { zh: '福利名称', en: 'Benefit name' },
  'reimburse.editAmountPh': { zh: '额度', en: 'Amount' },
  'reimburse.editNotePh': { zh: '说明', en: 'Note' },
  'reimburse.deleteBenefit': { zh: '删除此福利', en: 'Delete this benefit' },
  'reimburse.deleteConfirm': { zh: '确定删除「{name}」吗？', en: 'Delete “{name}”?' },
  'reimburse.ignored': { zh: '已忽略（{n}）', en: 'Ignored ({n})' },
  'reimburse.restore': { zh: '恢复', en: 'Restore' },
  'reimburse.doordashNote': { zh: '每月（自然月）额度；自提订单有最低消费门槛。', en: 'Monthly (calendar month) allowance; pickup orders have a minimum spend.' },
  'reimburse.doordashUsed': { zh: '（已用）', en: '(used)' },
  'period.anniversary': { zh: '持卡周年', en: 'Anniversary year' },
  'period.calendarYear': { zh: '自然年', en: 'Calendar year' },
  'period.monthly': { zh: '自然月', en: 'Calendar month' },
  'period.semiH1': { zh: '自然半年·上半年', en: 'Calendar half-year · H1' },
  'period.semiH2': { zh: '自然半年·下半年', en: 'Calendar half-year · H2' },
  'period.multiYear': { zh: '每 {n} 个月·持卡周年', en: 'Every {n} months · anniversary' },
  'period.perStay': { zh: '自然年·每次入住', en: 'Calendar year · per stay' },
  'period.oneTime': { zh: '一次性', en: 'One-time' },

  // ---- 持卡 ----
  'holdings.eligible': { zh: '可申请 / 可重开', en: 'Eligible / can re-apply' },
  'holdings.notYet': { zh: '尚未可申请', en: 'Not yet eligible' },
  'holdings.unknown': { zh: '待确认', en: 'To confirm' },
  'holdings.f524': { zh: '5/24（个人卡）', en: '5/24 (personal)' },
  'holdings.all': { zh: '全部', en: 'All' },
  'holdings.canOpen': { zh: '可开', en: 'Eligible' },
  'holdings.cannotOpen': { zh: '不可开（含待确认）', en: 'Not eligible (incl. to confirm)' },
  'holdings.addCard': { zh: '＋ 添加卡片', en: '+ Add card' },
  'holdings.productLabel': { zh: '卡产品（从目录选择，福利自动生成）', en: 'Card product (pick from the catalog; benefits are auto-generated)' },
  'holdings.openedOn': { zh: '开卡日期', en: 'Opened date' },
  'holdings.lastBonusLabel': { zh: '上次拿奖励日期（没有可空着，会按开卡日估算）', en: 'Last bonus date (leave blank if unknown; estimated from opened date)' },
  'holdings.addHint': { zh: '也可以到本页最下面点「导入备份」批量导入，或用「加载示例卡」先看看效果。', en: 'You can also bulk-import from “Import backup” at the bottom of this page, or try “Load sample cards” first.' },
  'holdings.empty': { zh: '没有符合条件的卡。', en: 'No cards match.' },
  'holdings.footNote': {
    zh: '间隔从上次拿奖励日期起算，关卡不重置时钟；没有拿奖励日期时按开卡日 + 3 个月估算，并标注“估算”。',
    en: 'Intervals count from the last bonus date; closing a card doesn’t reset the clock. Without a bonus date, we estimate from opened date + 3 months, marked “estimated”.',
  },
  'holdings.open': { zh: '持有中', en: 'Open' },
  'holdings.closed': { zh: '已关卡', en: 'Closed' },
  'holdings.business': { zh: '商业卡', en: 'Business' },
  'holdings.personal': { zh: '个人卡', en: 'Personal' },
  'holdings.nextEligible': { zh: '下次可拿奖励：{date}', en: 'Next bonus eligible: {date}' },
  'holdings.estimated': { zh: '（估算）', en: '(estimated)' },
  'holdings.closedOn': { zh: '关卡日期', en: 'Closed date' },
  'holdings.closedOnHint': { zh: '关卡日期（持有中请留空）', en: 'Closed date (leave blank if still open)' },
  'holdings.lastBonus': { zh: '上次拿奖励', en: 'Last bonus' },
  'holdings.bonusReceived': { zh: '是否拿过奖励', en: 'Bonus received' },
  'holdings.annualFee': { zh: '年费', en: 'Annual fee' },
  'holdings.annualFeeUnknown': { zh: '未知', en: 'Unknown' },
  'holdings.deleteConfirm': { zh: '确定删除「{name}」吗？它的福利和已用记录也会一起删除。', en: 'Delete “{name}”? Its benefits and usage records go too.' },
  'churn.noRule': { zh: '无间隔规则，只看 5/24。', en: 'No interval rule; 5/24 only.' },
  'churn.noRuleOpen': { zh: '已持有；无间隔规则，只看 5/24。', en: 'Held; no interval rule; 5/24 only.' },
  'churn.lifetimeTaken': { zh: '一生一次，已拿过奖励，不能再拿。', en: 'Once per lifetime; bonus already received.' },
  'churn.lifetimeNotTaken': { zh: '一生一次，尚未拿过奖励，可以申请。', en: 'Once per lifetime; bonus not yet received — can apply.' },
  'churn.lifetimeUnknown': { zh: '一生一次；是否拿过奖励待确认。', en: 'Once per lifetime; whether the bonus was received is unconfirmed.' },
  'churn.everHad': { zh: '曾经持有过这张卡，新奖励可能被拒；Chase 会在申请前提示资格，硬查询前可先看提示。', en: 'You’ve held this card before, so a new bonus may be declined; Chase shows eligibility before the hard pull.' },
  'churn.everHadNo': { zh: '未持有过，可以申请。', en: 'Never held; can apply.' },
  'churn.monthsSinceBonus': { zh: '距上次拿奖励 {months} 个月。', en: '{months} months since the last bonus.' },
  'churn.estimateFromOpened': { zh: '未填上次拿奖励日期，按开卡日 + 3 个月估算。', en: 'No bonus date on file; estimated from opened date + 3 months.' },
  'churn.noDates': { zh: '缺少开卡日和上次拿奖励日期，无法判断。', en: 'Opened date and last bonus date are both missing; can’t judge.' },
  'churn.sapphireBoth': {
    zh: '家族内只能同时持有一张 Sapphire，另一张还在持有中；且距最近一次 Sapphire 奖励需满 {months} 个月。',
    en: 'Only one Sapphire can be held at a time and another is still open; also {months} months must pass since the last Sapphire bonus.',
  },
  'churn.sapphireMonths': { zh: '蓝宝石家族 {months} 个月：距最近一次 Sapphire 奖励起算。', en: 'Sapphire family, {months} months: counted from the last Sapphire bonus.' },
  'churn.sapphireOneOpen': { zh: '家族内只能同时持有一张 Sapphire，另一张还在持有中。', en: 'Only one Sapphire can be held at a time and another is still open.' },
  'churn.inkTaken': { zh: 'Ink Cash / Unlimited 同一奖励家族，已拿过其中一张的奖励。', en: 'Ink Cash / Unlimited share one bonus family; a bonus was already received on one of them.' },
  'churn.inkUnknown': { zh: '家族内有拿奖励记录，但间隔口径待确认。', en: 'The family has a bonus record, but the interval rule is unconfirmed.' },
  'churn.inkOk': { zh: '家族内尚未拿过奖励，可以申请。', en: 'No bonus received in the family yet; can apply.' },
  'churn.marriottLifetime': { zh: 'AmEx 本卡一生一次，已拿过奖励。', en: 'Once per lifetime on this AmEx card; bonus already received.' },
  'churn.marriottCross': { zh: '与另一张 Marriott 卡交叉限制 {months} 个月：距最近一次拿奖励起算。', en: 'Marriott cross-restriction, {months} months: counted from the last bonus on either card.' },
  'churn.custom': { zh: '自定义卡，没有对应产品的规则。', en: 'Custom card; no catalog rule applies.' },

  // ---- 转分 ----
  'transfers.warn': { zh: '⚠️ 转分不可逆，转出前请确认目标账户与姓名一致。', en: '⚠️ Transfers are irreversible — confirm the destination account and name match before transferring.' },
  'transfers.valueLine': { zh: '积分典型价值（TPG 2026 年 11 月估值，非保证价）：', en: 'Typical point values (TPG Nov 2026 estimates, not guaranteed):' },
  'transfers.verifiedOn': { zh: '核实于 {date}', en: 'Verified {date}' },
  'transfers.bonusTitle': { zh: '当前奖励 +{pct}%，加成后约 {to}', en: 'Current bonus +{pct}%, about {to} with bonus' },
  'transfers.centsPerPt': { zh: '美分/点', en: 'cents/pt' },
  'transfers.starTitle': { zh: '网上常推荐', en: 'Commonly recommended' },
  'transfers.byPartner': { zh: '按伙伴分组', en: 'Group by partner' },
  'transfers.byBank': { zh: '按银行分组', en: 'Group by bank' },
  'transfers.count': { zh: '{n} 条比例 · ★ 为网上常推荐路线', en: '{n} rates · ★ = commonly recommended route' },
  'transfers.bonuses': { zh: '当前转分奖励', en: 'Current transfer bonuses' },
  'transfers.noBonuses': { zh: '暂无进行中的奖励。', en: 'No active bonuses right now.' },
  'transfers.ended': { zh: '最近结束（{n}）', en: 'Recently ended ({n})' },
  'transfers.endedOn': { zh: '已于 {date} 结束', en: 'Ended {date}' },
  'transfers.until': { zh: '截至 {date}', en: 'Ends {date}' },
  'transfers.sources': { zh: '{n} 个来源', en: '{n} sources' },
  'transfers.airline': { zh: '航司', en: 'Airline' },
  'transfers.hotel': { zh: '酒店', en: 'Hotel' },
  'transfers.showRest': { zh: '展开其余 {n} 条', en: 'Show {n} more' },
  'transfers.hideRest': { zh: '收起', en: 'Collapse' },
  'transfers.calc': { zh: '换算器', en: 'Calculator' },
  'transfers.calcCurrency': { zh: '积分', en: 'Points' },
  'transfers.calcPartner': { zh: '转到', en: 'Transfer to' },
  'transfers.calcAmount': { zh: '转出点数', en: 'Points to transfer' },
  'transfers.calcOut': { zh: '到账约', en: 'You’ll get about' },
  'transfers.calcBonusIn': { zh: '+{pct}% 已计入', en: '+{pct}% included' },
  'transfers.ratio': { zh: '比例：{ratio}', en: 'Ratio: {ratio}' },
  'transfers.ratioAfter': { zh: '加成后：{ratio}', en: 'With bonus: {ratio}' },
  'transfers.usdValue': { zh: '美元价值：{value}', en: 'USD value: {value}' },
  'transfers.minTransfer': { zh: '最低转分：{n}', en: 'Min transfer: {n}' },
  'transfers.arrival': { zh: '到账：{text}', en: 'Arrival: {text}' },
  'transfers.verified': { zh: '核实：{date}', en: 'Verified: {date}' },
  'transfers.edit': { zh: '编辑这条', en: 'Edit this' },
  'transfers.cancelEdit': { zh: '取消编辑', en: 'Cancel edit' },
  'transfers.editRatio': { zh: '比例（转出 : 到账）', en: 'Ratio (out : in)' },
  'transfers.editStar': { zh: '网上常推荐（★）', en: 'Commonly recommended (★)' },
  'transfers.editStarReason': { zh: '推荐理由', en: 'Why recommended' },
  'transfers.editNote': { zh: '备注', en: 'Note' },
  'transfers.miles': { zh: '里程', en: 'miles' },
  'transfers.points': { zh: '积分', en: 'points' },

  // ---- 刷哪张 ----
  'earn.banner': {
    zh: '本季度轮换（{cats}）5% · 有效期至 {until} · 季度上限 $1,500（同卡轮换类别合计）。过期后自动降级。',
    en: 'This quarter’s rotating categories ({cats}) at 5% · valid until {until} · $1,500/quarter cap (combined per card). Auto-demotes after expiry.',
  },
  'earn.noBanner': { zh: '当前没有生效中的季度轮换类别；过期轮换已自动降级。', en: 'No rotating category is active right now; expired ones have auto-demoted.' },
  'earn.showAll': { zh: '看全部（含市场卡）', en: 'Show all (incl. market cards)' },
  'earn.showMine': { zh: '只看我的卡', en: 'Only my cards' },
  'earn.myBest': { zh: '📌 我的最佳', en: '📌 My best' },
  'earn.marketBest': { zh: '★ 市场最佳', en: '★ Market best' },
  'earn.marketN': { zh: '市场 #{n}', en: 'Market #{n}' },
  'earn.gapHigher': { zh: '比我的最佳高 {gap} 个百分点', en: '{gap} pp above my best' },
  'earn.gapLower': { zh: '比我的最佳低 {gap} 个百分点', en: '{gap} pp below my best' },
  'earn.legend': {
    zh: '比较口径：返现 % 直接比；积分按转分典型价值折算（UR 2.05¢、MR 2.0¢、Citi 1.95¢、Cap One 1.85¢）；无可靠估值的积分不折算、不显示差距。',
    en: 'Comparison basis: cashback % compared directly; points converted at typical transfer values (UR 2.05¢, MR 2.0¢, Citi 1.95¢, Cap One 1.85¢); points with no reliable valuation aren’t converted and show no gap.',
  },
  'earn.expandMine': { zh: '展开其他 {n} 张卡', en: 'Show {n} more cards' },
  'earn.collapseMine': { zh: '收起其他卡', en: 'Hide other cards' },
  'earn.expandMarket': { zh: '展开其他 {n} 张市场卡', en: 'Show {n} more market cards' },
  'earn.collapseMarket': { zh: '收起市场卡', en: 'Hide market cards' },
  'earn.addOne': { zh: '＋ 加一条', en: '+ Add one' },
  'earn.addCardPh': { zh: '卡名，如 Venture X', en: 'Card name, e.g. Venture X' },
  'earn.addRatePh': { zh: '返现 / 倍率，如 2x', en: 'Cashback / multiplier, e.g. 2x' },
  'earn.addReasonPh': { zh: '理由（一句话）', en: 'Reason (one line)' },
  'earn.editRate': { zh: '返现 / 倍率', en: 'Cashback / multiplier' },
  'earn.ratePh': { zh: '如 5% / 3x', en: 'e.g. 5% / 3x' },
  'earn.editReason': { zh: '理由（一句话）', en: 'Reason (one line)' },
  'earn.editNote': { zh: '备注', en: 'Note' },
  'earn.editPending': { zh: '待确认', en: 'To confirm' },
  'earn.deleteConfirm': { zh: '确定删除「{name}」这条吗？', en: 'Delete the “{name}” row?' },
  'earn.rankFirst': { zh: '首选', en: 'Top pick' },
  'earn.rankSecond': { zh: '次选', en: 'Also good' },
  'earn.rankConsider': { zh: '可考虑', en: 'Consider' },
  'earn.expired': { zh: '已过期', en: 'Expired' },
  'earn.pendingBadge': { zh: '待确认', en: 'To confirm' },
  'earn.unverifiedRate': { zh: '待确认', en: 'To confirm' },
  'earn.marketSource': { zh: '来源：{source}', en: 'Source: {source}' },
  'earn.marketVerified': { zh: '核实于 {date}', en: 'Verified {date}' },
  'earn.footNote': {
    zh: '返现口径以各银行条款为准；带「待确认」的条目确认前不要按它决策。季度轮换类别是种子数据，可在应用内编辑，过期自动降级。',
    en: 'Cashback terms follow each bank’s rules; don’t act on “To confirm” rows before verifying. Rotating categories are seed data, editable in-app, and auto-demote after expiry.',
  },
  'dates.unknown': { zh: '未知', en: 'Unknown' },
};

/** 目录里的开卡规则说明（中文原文 → 英文），供 churn 引擎按当前语言取用。 */
export const RULE_NOTE_EN: Record<string, string> = {
  '48 个月规则是否适用待确认，不要按它决策。': 'Whether the 48-month rule applies is unconfirmed; don’t act on it.',
  'AmEx 各卡一生一次奖励。': 'Once per lifetime per AmEx card.',
  'Citi AA 个人卡 48 个月：距上次拿奖励满 48 个月。': 'Citi AA personal card, 48 months since the last bonus.',
  'Citi AA 商业卡 48 个月：距上次拿奖励满 48 个月。': 'Citi AA business card, 48 months since the last bonus.',
  'Ink Cash 与 Ink Unlimited 是同一个奖励家族：两个只能拿一次奖励。': 'Ink Cash and Ink Unlimited share one bonus family: only one bonus across both.',
  'ThankYou 卡 48 个月：距上次拿奖励满 48 个月。': 'ThankYou cards, 48 months since the last bonus.',
  '与 AmEx Brilliant 交叉限制：拿过其中一张的奖励后 24 个月内拿不到另一张的奖励（另有 90 天内新开卡限制）；同时持有两张没有问题。':
    'Cross-restriction with AmEx Brilliant: no bonus on the other card within 24 months of a bonus (plus a 90-day recent-account limit); holding both at once is fine.',
  '与 Boundless 之间没有交叉限制，只看 5/24。': 'No cross-restriction with Boundless; 5/24 only.',
  '与 Chase Boundless 交叉限制：拿过其中一张的奖励后 24 个月内拿不到另一张的奖励；同时持有两张没有问题。AmEx 本卡也是一生一次。':
    'Cross-restriction with Chase Boundless: no bonus on the other card within 24 months of a bonus; holding both at once is fine. This AmEx card itself is once per lifetime.',
  '同卡 24 个月（估算，待确认）。': '24 months on the same card (estimate, unconfirmed).',
  '同卡 24 个月：距上次拿奖励满 24 个月。': '24 months on the same card since the last bonus.',
  '同卡 24 个月：距上次拿该卡奖励满 24 个月。': '24 months on the same card since the last bonus on this card.',
  '无严格间隔规则（首年返现翻倍只给一次）。': 'No strict interval rule (first-year cashback match is once only).',
  '无间隔规则。': 'No interval rule.',
  '无间隔规则，只看 5/24。': 'No interval rule; 5/24 only.',
  '无间隔规则，只看 5/24。版本待确认：Prime Visa 5%，普通 Amazon Visa 3%。':
    'No interval rule; 5/24 only. Version unconfirmed: Prime Visa 5%, regular Amazon Visa 3%.',
  '无间隔规则，只看 5/24。需保持 Robinhood Gold 会员（$50/年），否则卡会被关闭；3% 返现返到券商账户才是足值。':
    'No interval rule; 5/24 only. Must keep Robinhood Gold ($50/yr) or the card closes; 3% is full value only when redeemed into the brokerage account.',
  '曾经持有过这张卡就可能拿不到新奖励（条款写的是 ever had）；Chase 会在申请前提示资格，硬查询前可先看提示。':
    'Holding this card before may block a new bonus (“ever had” terms); Chase shows eligibility before the hard pull.',
  '每张卡一生一次奖励。': 'Once per lifetime per card.',
  '蓝宝石家族 48 个月：距最近一次 Sapphire 开卡奖励满 48 个月，且家族内只能同时持有一张。':
    'Sapphire family, 48 months: 48 months since the last Sapphire bonus, and only one Sapphire can be held at a time.',
  '间隔规则待确认。': 'Interval rule unconfirmed.',
};

export function ruleNoteEn(note: string): string {
  return current === 'en' ? (RULE_NOTE_EN[note] ?? note) : note;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const s = STRINGS[key];
  const raw = s ? s[current] : key;
  if (!vars) return raw;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), raw);
}

export interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export const LangContext = createContext<LangContextValue>({ lang: current, setLang: () => {}, t });

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
