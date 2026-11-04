import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { kvGet, kvSet } from './db';
import { translate, type Lang, type TKey } from './i18n';
import { migrateProfile, type Profile, type Targets } from './nutrition';

const KEY_STORE = 'gemini_api_key';

interface AppState {
  ready: boolean;
  lang: Lang;
  profile: Profile | null;
  targets: Targets | null;
  apiKey: string;
  /** Bumped whenever diary data changes so screens can refetch. */
  dataVersion: number;
  setLang: (l: Lang) => Promise<void>;
  saveProfile: (p: Profile, t: Targets) => Promise<void>;
  setTargets: (t: Targets) => Promise<void>;
  setApiKey: (k: string) => Promise<void>;
  bump: () => void;
  resetState: () => void;
  /** Re-read everything from the database (after restoring a backup). */
  reload: () => Promise<void>;
  t: (k: TKey) => string;
}

const Ctx = createContext<AppState | null>(null);

function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode;
  return code === 'az' ? 'az' : 'en';
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>(deviceLang());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargetsState] = useState<Targets | null>(null);
  const [apiKey, setApiKeyState] = useState('');
  const [dataVersion, setDataVersion] = useState(0);

  const load = useCallback(async () => {
    const [l, p, tg, stored] = await Promise.all([
      kvGet<Lang>(db, 'lang'),
      kvGet<Profile>(db, 'profile'),
      kvGet<Targets>(db, 'targets'),
      SecureStore.getItemAsync(KEY_STORE).catch(() => null),
    ]);
    if (l) setLangState(l);
    setProfile(p ? migrateProfile(p) : null);
    setTargetsState(tg);
    // Each user brings their own free key (Settings). The env fallback only exists in local dev builds.
    setApiKeyState(stored || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
    setDataVersion((v) => v + 1);
    setReady(true);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const setLang = useCallback(
    async (l: Lang) => {
      setLangState(l);
      await kvSet(db, 'lang', l);
    },
    [db],
  );

  const saveProfile = useCallback(
    async (p: Profile, tg: Targets) => {
      setProfile(p);
      setTargetsState(tg);
      await kvSet(db, 'profile', p);
      await kvSet(db, 'targets', tg);
    },
    [db],
  );

  const setTargets = useCallback(
    async (tg: Targets) => {
      setTargetsState(tg);
      await kvSet(db, 'targets', tg);
    },
    [db],
  );

  const setApiKey = useCallback(async (k: string) => {
    const v = k.trim();
    setApiKeyState(v);
    if (v) await SecureStore.setItemAsync(KEY_STORE, v);
    else await SecureStore.deleteItemAsync(KEY_STORE);
  }, []);

  const bump = useCallback(() => setDataVersion((v) => v + 1), []);
  const resetState = useCallback(() => {
    setProfile(null);
    setTargetsState(null);
    setDataVersion((v) => v + 1);
  }, []);

  const t = useCallback((k: TKey) => translate(lang, k), [lang]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      lang,
      profile,
      targets,
      apiKey,
      dataVersion,
      setLang,
      saveProfile,
      setTargets,
      setApiKey,
      bump,
      resetState,
      reload: load,
      t,
    }),
    [ready, lang, profile, targets, apiKey, dataVersion, setLang, saveProfile, setTargets, setApiKey, bump, resetState, load, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}
