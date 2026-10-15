import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Server-driven app config. `focus` is the one exam family the product serves
// right now (e.g. HSSC) — while set, category pickers are hidden. null = all.
// Inside the focus, students may narrow to a sub-exam (CET, Police …); that
// filter only exists once 2+ sub-exams have live exams.
const STORAGE_KEY = 'appConfig';
const SUB_EXAM_KEY = 'subExam';
const MIN_SUB_EXAMS = 2;

const AppConfigContext = createContext({ focus: null, loaded: false, subExams: [], subExamId: null, setSubExamId: () => {} });

export const useAppConfig = () => useContext(AppConfigContext);
export const useFocusExam = () => useContext(AppConfigContext).focus;

/** Sub-exam filter: `options` is empty while there is nothing to choose between. */
export const useSubExam = () => {
  const { subExams, subExamId, setSubExamId } = useContext(AppConfigContext);
  return { options: subExams, selectedId: subExamId, select: setSubExamId };
};

/** Exams with no sub-exam belong to the whole family, so they match every sub-exam. */
export const matchesSubExam = (exam, subExamId) => {
  if (!subExamId) return true;
  const sub = exam?.subCategory?._id || exam?.subCategory;
  return !sub || String(sub) === String(subExamId);
};

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState({ focus: null, loaded: false });
  const [storedSubExamId, setStoredSubExamId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // last known config first (no picker flash on start), then refresh
    AsyncStorage.multiGet([STORAGE_KEY, SUB_EXAM_KEY])
      .then(([[, raw], [, sub]]) => {
        if (cancelled) return;
        if (raw) setConfig((c) => (c.loaded ? c : { ...JSON.parse(raw), loaded: true }));
        if (sub) setStoredSubExamId(sub);
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

  const subExams = useMemo(() => {
    const live = (config.focus?.subCategories || []).filter((s) => s.examCount > 0);
    return live.length >= MIN_SUB_EXAMS ? live : [];
  }, [config.focus]);

  // a stored choice that is no longer offered means "all"
  const subExamId = subExams.some((s) => String(s._id) === String(storedSubExamId)) ? storedSubExamId : null;

  const setSubExamId = useCallback((id) => {
    setStoredSubExamId(id || null);
    (id ? AsyncStorage.setItem(SUB_EXAM_KEY, String(id)) : AsyncStorage.removeItem(SUB_EXAM_KEY)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ ...config, subExams, subExamId, setSubExamId }),
    [config, subExams, subExamId, setSubExamId]
  );

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}
