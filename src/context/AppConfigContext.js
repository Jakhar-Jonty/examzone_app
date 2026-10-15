import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Server-driven app config. `focus` is the one exam family the product serves
// right now (e.g. HSSC) — while set, category pickers are hidden. null = all.
const STORAGE_KEY = 'appConfig';
const AppConfigContext = createContext({ focus: null, loaded: false });

export const useAppConfig = () => useContext(AppConfigContext);
export const useFocusExam = () => useContext(AppConfigContext).focus;

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState({ focus: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    // last known config first (no picker flash on start), then refresh
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!cancelled && raw) setConfig((c) => (c.loaded ? c : { ...JSON.parse(raw), loaded: true }));
      })
      .catch(() => {});
    api
      .get('/config')
      .then((res) => {
        const next = { focus: res.data?.focus || null };
        if (cancelled) return;
        setConfig({ ...next, loaded: true });
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setConfig((c) => ({ ...c, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}
