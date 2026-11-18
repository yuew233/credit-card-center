import { useRef, useState } from 'react';
import { useStore, type ImportCardInput } from './lib/store';
import { ReimbursementsTab } from './components/ReimbursementsTab';
import { HoldingsTab } from './components/HoldingsTab';
import { TransfersTab } from './components/TransfersTab';
import { EarnTab } from './components/EarnTab';
// 示例卡模板（data/cards-template.json）：明确标注为示例的假数据。
import templateData from './data/cards-template.json';

type Tab = 'reimburse' | 'holdings' | 'transfers' | 'earn';

const TABS: { id: Tab; label: string }[] = [
  { id: 'reimburse', label: '报销' },
  { id: 'holdings', label: '持卡' },
  { id: 'transfers', label: '转分' },
  { id: 'earn', label: '刷哪张' },
];

function parseImport(text: string): ImportCardInput[] {
  const data = JSON.parse(text) as unknown;
  const arr = Array.isArray(data) ? data : (data as { cards?: unknown }).cards;
  if (!Array.isArray(arr)) throw new Error('文件里没有找到 cards 数组');
  return arr
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x): ImportCardInput => ({
      bank: typeof x.bank === 'string' ? x.bank : undefined,
      name: typeof x.name === 'string' ? x.name : '',
      productId: typeof x.productId === 'string' ? x.productId : undefined,
      kind: x.kind === 'business' ? 'business' : 'personal',
      annualFee: typeof x.annualFee === 'number' ? x.annualFee : null,
      status: x.status === 'closed' ? 'closed' : 'open',
      openedOn: typeof x.openedOn === 'string' ? x.openedOn : null,
      closedOn: typeof x.closedOn === 'string' ? x.closedOn : null,
      lastBonusOn: typeof x.lastBonusOn === 'string' ? x.lastBonusOn : null,
      bonusReceived: typeof x.bonusReceived === 'boolean' ? x.bonusReceived : null,
      note: typeof x.note === 'string' ? x.note : '',
    }))
    .filter((c) => c.name);
}

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('reimburse');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSample = () => {
    try {
      const cards = parseImport(JSON.stringify(templateData));
      const n = store.importCards(cards);
      setMsg(`已加载 ${n} 张示例卡（标注“示例”，数据是假的，仅供体验；请删除后导入自己的卡）。`);
    } catch {
      setMsg('示例模板加载失败。');
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const cards = parseImport(await f.text());
      const n = store.importCards(cards);
      setMsg(`已导入 ${n} 张卡，福利已按卡产品自动生成。`);
    } catch {
      setMsg('导入失败：文件格式不对，请用 data/cards-template.json 的格式。');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>信用卡中心</h1>
          <p className="app-sub">报销 · 开卡间隔 · 转分 · 刷哪张 —— 数据只存在你的浏览器里，不上传、不注册。</p>
        </div>
        <div className="data-btns">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            导入模板
          </button>
          <button type="button" className="btn" onClick={loadSample}>
            加载示例卡
          </button>
          <button type="button" className="btn" onClick={() => store.exportJson()}>
            导出备份
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (window.confirm('确定清空全部数据吗？包括卡片、福利和使用记录（参考数据会恢复为内置默认值）。')) {
                store.clearAll();
                setMsg('已清空。');
              }
            }}
          >
            清空数据
          </button>
        </div>
      </header>

      {msg ? (
        <div className="toast" role="status">
          {msg}
          <button type="button" onClick={() => setMsg('')}>
            ×
          </button>
        </div>
      ) : null}

      {store.state.cards.length === 0 && (
        <div className="welcome">
          <h2>先把你的卡导进来</h2>
          <ol>
            <li>
              复制 <code>data/cards-template.json</code>，按格式填自己的卡和开卡日期，点「导入模板」上传；导入时福利会按卡产品自动生成。
            </li>
            <li>或者点「加载示例卡」先看 3 张示例卡的效果（假数据，标着“示例”），熟悉后再清空、导入自己的卡。</li>
            <li>也可以在「持卡」页点「＋ 添加卡片」，一张张手动加。</li>
          </ol>
          <p className="welcome-note">所有数据只保存在浏览器 localStorage，不会发到任何服务器。换浏览器或清缓存会丢数据，记得「导出备份」。</p>
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="tab-body">
        {tab === 'reimburse' && <ReimbursementsTab store={store} />}
        {tab === 'holdings' && <HoldingsTab store={store} />}
        {tab === 'transfers' && <TransfersTab store={store} />}
        {tab === 'earn' && <EarnTab store={store} />}
      </main>

      <footer className="app-footer">
        参考数据（转分比例、奖励、估值、刷卡返现）为公开信息，2026-11-18 核实；银行条款会变，请以发卡行官网为准。转分不可逆。
      </footer>
    </div>
  );
}
