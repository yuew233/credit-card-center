// 设置 tab：语言切换 + 数据管理（导入备份 / 加载示例卡 / 导出备份 / 清空数据）+ 版本。

import { t, useLang } from '../lib/i18n';

export function SettingsTab({
  onImportClick,
  onLoadSample,
  onExport,
  onClear,
}: {
  onImportClick: () => void;
  onLoadSample: () => void;
  onExport: () => void;
  onClear: () => void;
}) {
  const { lang, setLang } = useLang();
  return (
    <div>
      <div className="settings-section">
        <div className="settings-head">{t('settings.language')}</div>
        <div className="lang-toggle" role="group" aria-label="Language / 语言">
          <button type="button" className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
            中文
          </button>
          <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
            English
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-head">{t('settings.data')}</div>
        <div className="data-btns">
          <button type="button" className="btn" onClick={onImportClick}>
            {t('btn.import')}
          </button>
          <button type="button" className="btn" onClick={onLoadSample}>
            {t('btn.sample')}
          </button>
          <button type="button" className="btn" onClick={onExport}>
            {t('btn.export')}
          </button>
          <button type="button" className="btn" onClick={onClear}>
            {t('btn.clear')}
          </button>
        </div>
        <div className="settings-note">{t('settings.localNote')}</div>
      </div>

      <div className="app-version">{t('app.version')}</div>
    </div>
  );
}
