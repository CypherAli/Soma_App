import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { apiRequest, ApiError, errorMessage, normalizeApiUrl } from "./api";
import { readCredential, writeCredential } from "./credentials";
import { accountKey, readStored, writeStored } from "./storage";
import { selectQuestions, submissionOf } from "./practice";
import type {
  Attempt,
  AuthResponse,
  Catalogue,
  Credential,
  Draft,
  History,
  PlanInput,
  Preferences,
  PrivateData,
  StudyPath,
  User,
} from "./types";

const EMPTY_PRIVATE: PrivateData = { saved: [], draft: null };
const allowHttp = __DEV__ || Constants.expoConfig?.extra?.allowHttp === true;
function defaultApi() {
  const configured =
    Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
  if (configured) return normalizeApiUrl(configured, allowHttp);
  if (!allowHttp) return "";
  if (Platform.OS === "web")
    return `http://${globalThis.location?.hostname || "localhost"}:4000/api`;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host && host !== "localhost" ? host : "10.0.2.2"}:4000/api`;
}
const DEFAULT_PREFERENCES: Preferences = {
  apiUrl: defaultApi(),
  appearance: "system",
};
const PUBLIC_EMPTY: Catalogue = {
  schemaVersion: 1,
  version: "",
  models: [],
  questions: [],
};

interface AppContext {
  booting: boolean;
  user: User | null;
  preferences: Preferences;
  catalogue: Catalogue;
  offline: boolean;
  notice: string | null;
  dismissNotice: () => void;
  privateData: PrivateData;
  privateReady: boolean;
  history: History | null;
  studyPath: StudyPath | null;
  dueKeys: string[];
  studyLoading: boolean;
  studyError: string | null;
  request: <T>(
    path: string,
    options?: { method?: string; body?: unknown; auth?: boolean },
  ) => Promise<T>;
  login: (email: string, password: string, name?: string) => Promise<void>;
  acceptSession: (result: AuthResponse, base: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshStudy: () => Promise<void>;
  updatePreferences: (next: Preferences) => Promise<void>;
  toggleSaved: (id: string) => Promise<void>;
  setDraft: (draft: Draft | null) => Promise<void>;
  beginPractice: (options: {
    scope?: string;
    modelId?: string;
    count: number;
    only?: string[];
  }) => Promise<void>;
  submitDraft: () => Promise<Attempt>;
  savePlan: (input: PlanInput) => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
}
const Context = createContext<AppContext | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true),
    [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [user, setUser] = useState<User | null>(null),
    [credential, setCredential] = useState<Credential | null>(null);
  const [catalogue, setCatalogue] = useState(PUBLIC_EMPTY),
    [offline, setOffline] = useState(false),
    [notice, setNotice] = useState<string | null>(null);
  const [privateData, setPrivateData] = useState<PrivateData>(EMPTY_PRIVATE),
    [privateReady, setPrivateReady] = useState(false);
  const [history, setHistory] = useState<History | null>(null),
    [studyPath, setStudyPath] = useState<StudyPath | null>(null),
    [dueKeys, setDueKeys] = useState<string[]>([]);
  const [studyLoading, setStudyLoading] = useState(false),
    [studyError, setStudyError] = useState<string | null>(null);
  const authRef = useRef<Credential | null>(null),
    baseRef = useRef(preferences.apiUrl),
    privateRef = useRef(EMPTY_PRIVATE),
    scopeRef = useRef("");
  const submitRef = useRef<Promise<Attempt> | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const clearAccount = useCallback(() => {
    authRef.current = null;
    setCredential(null);
    setUser(null);
    scopeRef.current = "";
    privateRef.current = EMPTY_PRIVATE;
    setPrivateData(EMPTY_PRIVATE);
    setPrivateReady(false);
    setHistory(null);
    setStudyPath(null);
    setDueKeys([]);
    setStudyError(null);
    setStudyLoading(false);
    submitRef.current = null;
  }, []);

  const request = useCallback(
    async <T,>(
      path: string,
      options: { method?: string; body?: unknown; auth?: boolean } = {},
    ): Promise<T> => {
      const token = options.auth === false ? undefined : authRef.current?.token;
      try {
        return await apiRequest<T>(baseRef.current, path, {
          ...options,
          token,
        });
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 401 &&
          token &&
          token === authRef.current?.token
        ) {
          clearAccount();
          await writeCredential(null);
          setNotice(
            "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục; bài làm của bạn vẫn được giữ trên thiết bị.",
          );
        }
        throw error;
      }
    },
    [clearAccount],
  );

  const refreshCatalogue = useCallback(async () => {
    const base = baseRef.current;
    try {
      const data = await apiRequest<Catalogue>(base, "/mobile/bootstrap");
      if (
        data.schemaVersion !== 1 ||
        !Array.isArray(data.models) ||
        !Array.isArray(data.questions)
      )
        throw new Error("Phiên bản dữ liệu chưa được app hỗ trợ.");
      if (base !== baseRef.current || !alive.current) return;
      setCatalogue(data);
      setOffline(false);
      await writeStored(
        `soma.catalogue:${encodeURIComponent(base)}`,
        data,
      ).catch(() => setNotice("Không lưu được bộ nhớ nội dung trên thiết bị."));
    } catch (error) {
      if (base === baseRef.current && alive.current) {
        setOffline(true);
        setNotice(errorMessage(error));
      }
    }
  }, []);

  const refreshStudy = useCallback(async () => {
    const owner = authRef.current?.userId,
      base = baseRef.current;
    if (!owner) return;
    setStudyLoading(true);
    setStudyError(null);
    try {
      const [h, p, d] = await Promise.all([
        request<History>("/study/history"),
        request<StudyPath>("/study/path"),
        request<{ items: { itemKey: string }[] }>("/mobile/due"),
      ]);
      if (authRef.current?.userId !== owner || baseRef.current !== base) return;
      setHistory(h);
      setStudyPath(p);
      setDueKeys(d.items.map((item) => item.itemKey));
    } catch (error) {
      if (authRef.current?.userId === owner && baseRef.current === base)
        setStudyError(errorMessage(error));
    } finally {
      if (authRef.current?.userId === owner && baseRef.current === base)
        setStudyLoading(false);
    }
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const prefs = await readStored<Preferences>(
          "soma.preferences.v1",
          DEFAULT_PREFERENCES,
        );
        const apiUrl = normalizeApiUrl(prefs.apiUrl, allowHttp);
        if (cancelled) return;
        baseRef.current = apiUrl;
        setPreferences({ ...prefs, apiUrl });
        const cached = await readStored<Catalogue>(
          `soma.catalogue:${encodeURIComponent(apiUrl)}`,
          PUBLIC_EMPTY,
        );
        if (
          !cancelled &&
          cached.schemaVersion === 1 &&
          Array.isArray(cached.models) &&
          Array.isArray(cached.questions)
        )
          setCatalogue(cached);
        const saved = await readCredential();
        if (
          saved &&
          saved.token &&
          saved.userId &&
          saved.apiUrl === apiUrl &&
          Date.parse(saved.expiresAt) > Date.now()
        ) {
          try {
            const me = await apiRequest<{ user: User }>(apiUrl, "/auth/me", {
              token: saved.token,
            });
            if (!cancelled) {
              authRef.current = saved;
              setCredential(saved);
              setUser(me.user);
              void refreshStudy();
            }
          } catch (error) {
            if (error instanceof ApiError && error.status === 401)
              await writeCredential(null);
            else if (!cancelled)
              setNotice(
                "Chưa xác minh được phiên đăng nhập. Kiểm tra kết nối rồi đăng nhập lại.",
              );
          }
        } else if (saved) await writeCredential(null);
      } catch (error) {
        if (!cancelled) setNotice(errorMessage(error));
      } finally {
        if (!cancelled) {
          setBooting(false);
          void refreshCatalogue();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCatalogue, refreshStudy]);

  useEffect(() => {
    if (booting) return;
    const key = accountKey(preferences.apiUrl, credential?.userId ?? "guest");
    let cancelled = false;
    scopeRef.current = key;
    privateRef.current = EMPTY_PRIVATE;
    void readStored<PrivateData>(key, EMPTY_PRIVATE)
      .then((data) => {
        if (cancelled || scopeRef.current !== key) return;
        const next = {
          saved: Array.isArray(data.saved) ? data.saved : [],
          draft: data.draft?.owner === key ? data.draft : null,
        };
        privateRef.current = next;
        setPrivateData(next);
        setPrivateReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPrivateReady(true);
          setNotice("Không đọc được dữ liệu học trên thiết bị.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [booting, credential?.userId, preferences.apiUrl]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active" && !booting) {
        void refreshStudy();
        if (authRef.current) void request("/auth/me").catch(() => {});
      }
    });
    return () => listener.remove();
  }, [booting, refreshStudy, request]);

  const mutatePrivate = useCallback(
    async (transform: (previous: PrivateData) => PrivateData) => {
      const key = scopeRef.current;
      if (!key) throw new Error("Dữ liệu tài khoản đang được chuẩn bị.");
      const next = transform(privateRef.current);
      privateRef.current = next;
      setPrivateData(next);
      try {
        await writeStored(key, next);
      } catch {
        setNotice(
          "Không lưu được dữ liệu trên thiết bị. Hãy kiểm tra bộ nhớ trước khi thoát app.",
        );
        throw new Error("Không lưu được bài làm trên thiết bị.");
      }
    },
    [],
  );

  const acceptSession = useCallback(
    async (result: AuthResponse, base: string) => {
      if (base !== baseRef.current)
        throw new Error("Địa chỉ máy chủ đã thay đổi. Vui lòng đăng nhập lại.");
      const next = {
        token: result.token,
        expiresAt: result.expiresAt,
        userId: result.user.id,
        apiUrl: base,
      };
      await writeCredential(next);
      clearAccount();
      authRef.current = next;
      setCredential(next);
      setUser(result.user);
      setNotice(null);
      void refreshStudy();
    },
    [clearAccount, refreshStudy],
  );

  const login = useCallback(
    async (email: string, password: string, name?: string) => {
      const base = baseRef.current;
      const result = await apiRequest<AuthResponse>(
        base,
        name ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          body: name
            ? { name: name.trim(), email: email.trim().toLowerCase(), password }
            : { email: email.trim().toLowerCase(), password },
        },
      );
      await acceptSession(result, base);
    },
    [acceptSession],
  );

  const logout = useCallback(async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401))
        setNotice(
          "Đã đăng xuất trên thiết bị. Chưa xác nhận thu hồi phiên trên máy chủ do mất kết nối.",
        );
    } finally {
      await writeCredential(null);
      clearAccount();
    }
  }, [clearAccount, request]);

  const updatePreferences = useCallback(
    async (next: Preferences) => {
      const normalized = {
        ...next,
        apiUrl: normalizeApiUrl(next.apiUrl, allowHttp),
      };
      await writeStored("soma.preferences.v1", normalized);
      if (normalized.apiUrl !== baseRef.current) {
        await writeCredential(null);
        clearAccount();
        baseRef.current = normalized.apiUrl;
        setCatalogue(PUBLIC_EMPTY);
        setPreferences(normalized);
        await refreshCatalogue();
      } else setPreferences(normalized);
    },
    [clearAccount, refreshCatalogue],
  );
  const setDraft = useCallback(
    async (draft: Draft | null) => {
      if (draft && draft.owner !== scopeRef.current)
        throw new Error(
          "Tài khoản đã thay đổi. Hãy mở lại bài làm của tài khoản hiện tại.",
        );
      await mutatePrivate((previous) => ({ ...previous, draft }));
    },
    [mutatePrivate],
  );
  const toggleSaved = useCallback(
    (id: string) =>
      mutatePrivate((previous) => ({
        ...previous,
        saved: previous.saved.includes(id)
          ? previous.saved.filter((v) => v !== id)
          : [...previous.saved, id],
      })),
    [mutatePrivate],
  );
  const beginPractice = useCallback(
    async (options: {
      scope?: string;
      modelId?: string;
      count: number;
      only?: string[];
    }) => {
      if (!authRef.current)
        throw new Error("Đăng nhập để lưu kết quả học tập.");
      const questions = selectQuestions(catalogue.questions, options);
      if (!questions.length)
        throw new Error("Chưa có câu hỏi phù hợp trong phiên bản app này.");
      const scopes = new Set(questions.map((q) => q.scope));
      await setDraft({
        id: Crypto.randomUUID(),
        owner: scopeRef.current,
        questions,
        answers: {},
        confirmed: [],
        index: 0,
        scope: scopes.size === 1 ? questions[0].scope : "all",
        startedAt: Date.now(),
      });
    },
    [catalogue.questions, setDraft],
  );

  const submitDraft = useCallback(async () => {
    if (submitRef.current) return submitRef.current;
    const draft = privateRef.current.draft,
      owner = scopeRef.current;
    if (!draft || !draft.completedAt)
      throw new Error("Chưa có bài làm hoàn chỉnh.");
    if (draft.receipt) return draft.receipt;
    const operation = (async () => {
      const receipt = await request<Attempt>("/mobile/attempts", {
        method: "POST",
        body: submissionOf(draft),
      });
      if (owner === scopeRef.current) {
        await mutatePrivate((previous) => ({
          ...previous,
          draft:
            previous.draft?.id === draft.id
              ? { ...draft, receipt }
              : previous.draft,
        }));
        await refreshStudy();
      }
      return receipt;
    })();
    submitRef.current = operation;
    try {
      return await operation;
    } finally {
      if (submitRef.current === operation) submitRef.current = null;
    }
  }, [mutatePrivate, refreshStudy, request]);

  const savePlan = useCallback(
    async (input: PlanInput) => {
      await request("/study/path", { method: "PUT", body: input });
      await refreshStudy();
    },
    [refreshStudy, request],
  );
  const updateProfile = useCallback(
    async (name: string) => {
      const token = authRef.current?.token;
      const result = await request<{ user: User }>("/auth/profile", {
        method: "PATCH",
        body: { name: name.trim() },
      });
      if (token === authRef.current?.token) setUser(result.user);
    },
    [request],
  );
  const refresh = useCallback(async () => {
    await Promise.all([refreshCatalogue(), refreshStudy()]);
  }, [refreshCatalogue, refreshStudy]);
  const value = useMemo<AppContext>(
    () => ({
      booting,
      user,
      preferences,
      catalogue,
      offline,
      notice,
      dismissNotice: () => setNotice(null),
      privateData,
      privateReady,
      history,
      studyPath,
      dueKeys,
      studyLoading,
      studyError,
      request,
      login,
      acceptSession,
      logout,
      refresh,
      refreshStudy,
      updatePreferences,
      toggleSaved,
      setDraft,
      beginPractice,
      submitDraft,
      savePlan,
      updateProfile,
    }),
    [
      booting,
      user,
      preferences,
      catalogue,
      offline,
      notice,
      privateData,
      privateReady,
      history,
      studyPath,
      dueKeys,
      studyLoading,
      studyError,
      request,
      login,
      acceptSession,
      logout,
      refresh,
      refreshStudy,
      updatePreferences,
      toggleSaved,
      setDraft,
      beginPractice,
      submitDraft,
      savePlan,
      updateProfile,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AppProvider");
  return value;
}
