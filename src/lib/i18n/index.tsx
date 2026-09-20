'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/constants';
import enMessages from './messages/en.json';
import mrMessages from './messages/mr.json';
import hiMessages from './messages/hi.json';

type Messages = typeof enMessages;

const messagesMap: Record<SupportedLocale, Messages> = {
  en: enMessages,
  hi: hiMessages as unknown as Messages,
  mr: mrMessages as unknown as Messages,
};


interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, paramsOrFallback?: Record<string, string | number> | string) => string;
  messages: Messages;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Get a nested value from an object using a dot-separated key path.
 * e.g. getNestedValue(obj, 'auth.login') → obj.auth.login
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolate parameters into a translation string.
 * e.g. interpolate("Welcome, {name}", { name: "Meera" }) → "Welcome, Meera"
 */
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key]?.toString() ?? `{${key}}`;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE as SupportedLocale);

  // Load saved locale from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('swasthyasetu-locale');
    if (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) {
      setLocaleState(saved as SupportedLocale);
    }
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem('swasthyasetu-locale', newLocale);
    // Update document lang attribute
    document.documentElement.lang = newLocale;
  }, []);

  const messages = messagesMap[locale];

  const t = useCallback(
    (key: string, paramsOrFallback?: Record<string, string | number> | string): string => {
      const params = typeof paramsOrFallback === 'object' ? paramsOrFallback : undefined;
      const fallbackText = typeof paramsOrFallback === 'string' ? paramsOrFallback : undefined;
      const value = getNestedValue(messages as unknown as Record<string, unknown>, key);
      if (!value) {
        // Fallback to English if key not found in current locale
        const fallback = getNestedValue(enMessages as unknown as Record<string, unknown>, key);
        if (!fallback) {
          if (fallbackText) return fallbackText;
          console.warn(`[i18n] Missing translation key: "${key}"`);
          return key;
        }
        return params ? interpolate(fallback, params) : fallback;
      }
      return params ? interpolate(value, params) : value;
    },
    [messages]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access translations.
 * Usage: const { t, locale, setLocale } = useI18n();
 *        t('auth.login') → "Log In" / "लॉग इन"
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
