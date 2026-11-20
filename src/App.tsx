import { useRef, useState } from 'react';
import { useStore } from './lib/store';
import { ReimbursementsTab } from './components/ReimbursementsTab';
import { HoldingsTab } from './components/HoldingsTab';
import { TransfersTab } from './components/TransfersTab';
import { EarnTab } from './components/EarnTab';
// 示例卡模板（data/cards-template.json）：明确标注为示例的假数据。
import templateData from './data/cards-template.json';
import { getLang, LangContext, setLangModule, t, useLang, type Lang } from './lib/i18n';

type Tab = 'reimburse' | 'holdings' | 'transfers' | 'earn';

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'reimburse', labelKey: 'tab.reimburse' },
  { id: 'holdings', labelKey: 'tab.holdings' },
  { id: 'transfers', labelKey: 'tab.transfers' },
  { id: 'earn', labelKey: 'tab.earn' },
];

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Language / 语言">
      <button type="button" className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
        中文
      </button>
      <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
        English
      </button>
    </div>
  );
}

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

  return (
    <LangContext.Provider value={ctx}>
      <div className="app">
        <header className="app-header">
          <div>
            <h1>{t('app.title')}</h1>
            <p className="app-sub">{t('app.subtitle')}</p>
          </div>
          <div className="header-right">
            <LangToggle />
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
                {t('btn.import')}
              </button>
              <button type="button" className="btn" onClick={loadSample}>
                {t('btn.sample')}
              </button>
              <button type="button" className="btn" onClick={() => store.exportJson()}>
                {t('btn.export')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (window.confirm(t('confirm.clear'))) {
                    store.clearAll();
                    setMsg(t('msg.cleared'));
                  }
                }}
              >
                {t('btn.clear')}
              </button>
            </div>
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

        <nav className="tabs">
          {TABS.map((tb) => (
            <button key={tb.id} type="button" className={`tab ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
              {t(tb.labelKey)}
            </button>
          ))}
        </nav>

        <main className="tab-body">
          {tab === 'reimburse' && <ReimbursementsTab store={store} />}
          {tab === 'holdings' && <HoldingsTab store={store} />}
          {tab === 'transfers' && <TransfersTab store={store} />}
          {tab === 'earn' && <EarnTab store={store} />}
        </main>

        <footer className="app-footer">{t('app.footer')}</footer>
      </div>
    </LangContext.Provider>
  );
}
