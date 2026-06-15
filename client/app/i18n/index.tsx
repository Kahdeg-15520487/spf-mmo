'use client';

import { createContext, useContext } from 'react';
import vi, { Translations } from './vi';

const I18nContext = createContext<Translations>(vi);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nContext.Provider value={vi}>{children}</I18nContext.Provider>;
}

export function useT(): Translations {
  return useContext(I18nContext);
}
