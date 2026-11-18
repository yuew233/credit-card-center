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
import { uid } from './dates';

const STORAGE_KEY = 'credit-card-center-v1';

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

function emptyState(): AppState {
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = emptyState();
    return {
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      benefits: Array.isArray(parsed.benefits) ? parsed.benefits : [],
      uses: Array.isArray(parsed.uses) ? parsed.uses : [],
      earnRates: Array.isArray(parsed.earnRates) && parsed.earnRates.length ? parsed.earnRates : base.earnRates,
      transferBonuses: Array.isArray(parsed.transferBonuses) ? parsed.transferBonuses : base.transferBonuses,
      transferRates: Array.isArray(parsed.transferRates) && parsed.transferRates.length ? parsed.transferRates : base.transferRates,
      currencyValues: Array.isArray(parsed.currencyValues) && parsed.currencyValues.length ? parsed.currencyValues : base.currencyValues,
    };
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

  /** 导入一组卡（模板 JSON 或导出文件格式）。返回导入的张数。 */
  const importCards = useCallback(
    (inputs: ImportCardInput[]): number => {
      let count = 0;
      inputs.forEach((input) => {
        if (!input.name) return;
        addCard(input);
        count += 1;
      });
      return count;
    },
    [addCard],
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
    setState(emptyState());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), cards: state.cards, benefits: state.benefits, uses: state.uses }, null, 2)], {
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
    importCards,
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
