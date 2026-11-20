// 状态管理：全部存在浏览器 localStorage，不联网、不上传。
// 首次打开时为空（只装入可编辑的通用参考数据）；用户通过导入模板或手动添加卡片来填充。

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AppState,
  BenefitInstance,
  BenefitTemplate,
  CardProduct,
  EarnRate,
  HeldCard,
  TransferBonus,
  TransferRate,
  CurrencyValue,
} from '../types';
import { CATALOG, PRODUCT_MAP } from '../data/catalog';
import { CURRENCY_VALUES, EARN_RATES, TRANSFER_BONUSES, TRANSFER_RATES } from '../data/reference';
// 首次打开的默认数据：2026-11-20 从边栏信用卡中心同步的备份（29 张卡）。
// 由用户明确要求做到网站里，打开就有数据；注意这个仓库是公开的。
import seedJson from '../data/seed.json';
import { uid } from './dates';
import { buildExportFile, mergeImport, parseImportFile, type ImportSummary } from './io';

const STORAGE_KEY = 'credit-card-center-v1';
// 用户点过「清空数据」后留下的标记：有这个标记时不再自动装入默认数据。
const NOSEED_KEY = 'credit-card-center-v1-noseed';

export interface ImportCardInput {
  bank?: string;
  name: string;
  productId?: string;
  kind?: 'personal' | 'business';
  annualFee?: number | null;
  status?: 'open' | 'closed';
  openedOn?: string | null;
  closedOn?: string | null;
  lastBonusOn?: string | null;
  bonusReceived?: boolean | null;
  note?: string;
}

export function emptyState(): AppState {
  return {
    cards: [],
    benefits: [],
    uses: [],
    earnRates: [...EARN_RATES],
    transferBonuses: [...TRANSFER_BONUSES],
    transferRates: [...TRANSFER_RATES],
    currencyValues: [...CURRENCY_VALUES],
  };
}

function loadState(): AppState {
  try {
    const noSeed = localStorage.getItem(NOSEED_KEY) === '1';
    const raw = localStorage.getItem(STORAGE_KEY);
    // 还没存过数据，或存的是空数据（比如之前打开过但还没导入）：直接装入默认备份。
    if (!raw) return noSeed ? emptyState() : seedState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = emptyState();
    const state: AppState = {
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
      uses: Array.isArray(parsed.uses) ? parsed.uses : [],
      earnRates: Array.isArray(parsed.earnRates) && parsed.earnRates.length ? parsed.earnRates : base.earnRates,
      transferBonuses: Array.isArray(parsed.transferBonuses) ? parsed.transferBonuses : base.transferBonuses,
      transferRates: Array.isArray(parsed.transferRates) && parsed.transferRates.length ? parsed.transferRates : base.transferRates,
      currencyValues: Array.isArray(parsed.currencyValues) && parsed.currencyValues.length ? parsed.currencyValues : base.currencyValues,
    };
    if (!noSeed && state.cards.length === 0 && state.benefits.length === 0 && state.uses.length === 0) {
      return seedState();
    }
    return state;
  } catch {
    return emptyState();
  }
}

/** 默认数据：把同步来的备份文件走一遍导入流程，和用户手动导入的结果完全一致。 */
function seedState(): AppState {
  try {
    return mergeImport(emptyState(), parseImportFile(JSON.stringify(seedJson))).state;
  } catch {
    return emptyState();
  }
}

export function benefitInstancesForCard(cardId: string, product: CardProduct | undefined, custom: BenefitTemplate[]): BenefitInstance[] {
  const templates = product ? product.benefits : custom;
  return templates.map((t) => ({ ...t, id: uid(), cardId, ignored: false }));
}

export function useStore() {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage 写满或不可用时静默失败，不阻塞使用
    }
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => fn(structuredClone(prev)));
  }, []);

  /** 添加一张卡（从目录选产品，或自定义）；按产品模板自动生成福利。 */
  const addCard = useCallback(
    (input: ImportCardInput, customBenefits: BenefitTemplate[] = []): string => {
      const id = uid();
      let product: CardProduct | undefined;
      if (input.productId) product = PRODUCT_MAP.get(input.productId);
      if (!product) {
        const byName = CATALOG.find((p) => p.name === input.name && (!input.bank || p.bank === input.bank));
        if (byName) product = byName;
      }
      const card: HeldCard = {
        id,
        productId: product ? product.id : null,
        bank: input.bank ?? product?.bank ?? '',
        name: input.name,
        kind: input.kind ?? product?.kind ?? 'personal',
        annualFee: input.annualFee ?? product?.annualFee ?? null,
        status: input.status ?? 'open',
        openedOn: input.openedOn ?? null,
        closedOn: input.closedOn ?? null,
        lastBonusOn: input.lastBonusOn ?? null,
        bonusReceived: input.bonusReceived ?? null,
        note: input.note ?? '',
      };
      const benefits = benefitInstancesForCard(id, product, customBenefits);
      update((s) => {
        s.cards.push(card);
        s.benefits.push(...benefits);
        return s;
      });
      try {
        localStorage.removeItem(NOSEED_KEY);
      } catch {
        /* ignore */
      }
      return id;
    },
    [update],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<HeldCard>) => {
      update((s) => {
        const c = s.cards.find((x) => x.id === id);
        if (c) Object.assign(c, patch);
        return s;
      });
    },
    [update],
  );

  const deleteCard = useCallback(
    (id: string) => {
      update((s) => {
        s.cards = s.cards.filter((c) => c.id !== id);
        const benefitIds = new Set(s.benefits.filter((b) => b.cardId === id).map((b) => b.id));
        s.benefits = s.benefits.filter((b) => b.cardId !== id);
        s.uses = s.uses.filter((u) => !benefitIds.has(u.benefitId));
        return s;
      });
    },
    [update],
  );

  const addBenefit = useCallback(
    (cardId: string, template: BenefitTemplate) => {
      update((s) => {
        s.benefits.push({ ...template, id: uid(), cardId, ignored: false });
        return s;
      });
    },
    [update],
  );

  const updateBenefit = useCallback(
    (id: string, patch: Partial<BenefitInstance>) => {
      update((s) => {
        const b = s.benefits.find((x) => x.id === id);
        if (b) Object.assign(b, patch);
        return s;
      });
    },
    [update],
  );

  const deleteBenefit = useCallback(
    (id: string) => {
      update((s) => {
        s.benefits = s.benefits.filter((b) => b.id !== id);
        s.uses = s.uses.filter((u) => u.benefitId !== id);
        return s;
      });
    },
    [update],
  );

  const logUse = useCallback(
    (benefitId: string, amount: number, usedOn: string, note = '') => {
      update((s) => {
        s.uses.push({ id: uid(), benefitId, amount, usedOn, note });
        return s;
      });
    },
    [update],
  );

  const deleteUse = useCallback(
    (useId: string) => {
      update((s) => {
        s.uses = s.uses.filter((u) => u.id !== useId);
        return s;
      });
    },
    [update],
  );

  /**
   * 导入一个备份 JSON（完整备份，或只有 cards 的最小文件）。
   * 先完整解析校验，失败时抛错、原数据不动；成功后一次性合并。
   * 返回合并统计，供界面提示。
   */
  const importData = useCallback(
    (text: string): ImportSummary => {
      const parsed = parseImportFile(text);
      const { state: next, summary } = mergeImport(state, parsed);
      setState(next);
      try {
        localStorage.removeItem(NOSEED_KEY);
      } catch {
        /* ignore */
      }
      return summary;
    },
    [state],
  );

  const setEarnRates = useCallback(
    (rates: EarnRate[]) => update((s) => ({ ...s, earnRates: rates })),
    [update],
  );
  const setTransferBonuses = useCallback(
    (rows: TransferBonus[]) => update((s) => ({ ...s, transferBonuses: rows })),
    [update],
  );
  const setTransferRates = useCallback(
    (rows: TransferRate[]) => update((s) => ({ ...s, transferRates: rows })),
    [update],
  );
  const setCurrencyValues = useCallback(
    (rows: CurrencyValue[]) => update((s) => ({ ...s, currencyValues: rows })),
    [update],
  );

  const resetReferenceData = useCallback(() => {
    update((s) => ({
      ...s,
      earnRates: [...EARN_RATES],
      transferBonuses: [...TRANSFER_BONUSES],
      transferRates: [...TRANSFER_RATES],
      currencyValues: [...CURRENCY_VALUES],
    }));
  }, [update]);

  const clearAll = useCallback(() => {
    const empty = emptyState();
    setState(empty);
    try {
      // 写回空数据（而不是删 key），并留下不再自动装入默认数据的标记。
      localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
      localStorage.setItem(NOSEED_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(buildExportFile(state), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credit-card-center-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const cardsById = useMemo(() => new Map(state.cards.map((c) => [c.id, c])), [state.cards]);

  return {
    state,
    cardsById,
    addCard,
    updateCard,
    deleteCard,
    addBenefit,
    updateBenefit,
    deleteBenefit,
    logUse,
    deleteUse,
    importData,
    setEarnRates,
    setTransferBonuses,
    setTransferRates,
    setCurrencyValues,
    resetReferenceData,
    clearAll,
    exportJson,
  };
}

export type Store = ReturnType<typeof useStore>;
