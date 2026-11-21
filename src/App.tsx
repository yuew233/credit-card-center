import { useRef, useState } from 'react';
import { useStore } from './lib/store';
import { ReimbursementsTab } from './components/ReimbursementsTab';
import { HoldingsTab } from './components/HoldingsTab';
import { TransfersTab } from './components/TransfersTab';
import { EarnTab } from './components/EarnTab';
import { SettingsTab } from './components/SettingsTab';
import { IconCard, IconGear, IconReceipt, IconSwap, IconZap } from './components/shared';
// 示例卡模板（data/cards-template.json）：明确标注为示例的假数据。
import templateData from './data/cards-template.json';
import { getLang, LangContext, setLangModule, t, type Lang } from './lib/i18n';

type Tab = 'reimburse' | 'holdings' | 'transfers' | 'earn' | 'settings';

const TABS: { id: Tab; labelKey: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: 'reimburse', labelKey: 'tab.reimburse', Icon: IconReceipt },
  { id: 'holdings', labelKey: 'tab.holdings', Icon: IconCard },
  { id: 'transfers', labelKey: 'tab.transfers', Icon: IconSwap },
  { id: 'earn', labelKey: 'tab.earn', Icon: IconZap },
  { id: 'settings', labelKey: 'tab.settings', Icon: IconGear },
];

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>('reimburse');
  const [msg, setMsg] = useState('');
  const [lang, setLangState] = useState<Lang>(getLang());
  const fileRef = useRef<HTMLInputElement>(null);

  const setLang = (l: Lang) => {
    setLangModule(l);
    setLangState(l);
  };
  const ctx = { lang, setLang, t };

  const loadSample = () => {
    try {
      const summary = store.importData(JSON.stringify(templateData));
      setMsg(t('msg.sampleLoaded', { n: summary.cardsAdded + summary.cardsUpdated }));
    } catch {
      setMsg(t('msg.sampleFailed'));
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const summary = store.importData(await f.text());
      setMsg(
        t('msg.imported', {
          cards: summary.cardsAdded + summary.cardsUpdated,
          ca: summary.cardsAdded,
          cu: summary.cardsUpdated,
          benefits: summary.benefitsAdded + summary.benefitsUpdated,
          earn: summary.earnAdded + summary.earnUpdated,
          rates: summary.transferRatesAdded + summary.transferRatesUpdated,
          bonuses: summary.bonusesAdded + summary.bonusesUpdated,
        }),
      );
    } catch (e) {
      setMsg(t('msg.importFailed', { err: e instanceof Error ? e.message : String(e) }));
    }
  };

  const clearAllData = () => {
    if (window.confirm(t('confirm.clear'))) {
      store.clearAll();
      setMsg(t('msg.cleared'));
    }
  };

  return (
    <LangContext.Provider value={ctx}>
      <div className="app">
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
        <header className="app-header">
          <div>
            <h1>{t('app.title')}</h1>
            <p className="app-sub">{t('app.subtitle')}</p>
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
            <h2>{t('welcome.title')}</h2>
            <ol>
              <li>{t('welcome.li1')}</li>
              <li>{t('welcome.li2')}</li>
              <li>{t('welcome.li3')}</li>
            </ol>
            <p className="welcome-note">{t('welcome.note')}</p>
          </div>
        )}

        <main className="tab-body">
          {tab === 'reimburse' && <ReimbursementsTab store={store} />}
          {tab === 'holdings' && <HoldingsTab store={store} />}
          {tab === 'transfers' && <TransfersTab store={store} />}
          {tab === 'earn' && <EarnTab store={store} />}
          {tab === 'settings' && (
            <SettingsTab
              onImportClick={() => fileRef.current?.click()}
              onLoadSample={loadSample}
              onExport={() => store.exportJson()}
              onClear={clearAllData}
            />
          )}
        </main>

        <footer className="app-footer">{t('app.footer')}</footer>

        <nav className="bottom-nav">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              className={`bottom-nav-item ${tab === tb.id ? 'active' : ''}`}
              onClick={() => setTab(tb.id)}
            >
              <tb.Icon size={20} />
              <span>{t(tb.labelKey)}</span>
            </button>
          ))}
        </nav>
      </div>
    </LangContext.Provider>
  );
}
