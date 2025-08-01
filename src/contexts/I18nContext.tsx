import React, { createContext, useContext, useState, useEffect } from 'react'

import frSubscription from '../locales/fr/subscription.json'
import ciSubscription from '../locales/ci/subscription.json'

const resources: Record<string, any> = {
  fr: { subscription: frSubscription },
  ci: { subscription: ciSubscription }
}

interface I18nContextProps {
  language: string
  setLanguage: (lang: string) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextProps>({
  language: 'fr',
  setLanguage: () => {},
  t: (key: string) => key
})

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState('fr')

  useEffect(() => {
    const stored = localStorage.getItem('language')
    if (stored) {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = (lang: string) => {
    localStorage.setItem('language', lang)
    setLanguageState(lang)
  }

  const t = (key: string): string => {
    const parts = key.split('.')
    let result: any = resources[language]
    for (const part of parts) {
      result = result?.[part]
      if (result === undefined) break
    }
    return typeof result === 'string' ? result : key
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
