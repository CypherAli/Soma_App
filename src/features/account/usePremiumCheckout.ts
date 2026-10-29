import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useApp } from "../../core/AppProvider";
import { ApiError, errorMessage } from "../../core/api";
import { isForeground, onForeground } from "../../core/foreground";
import {
  parsePremiumOrder,
  premiumStorageKey,
  type PremiumOrder,
} from "../../core/premium";
import { readStored, writeStored } from "../../core/storage";
import type { Membership } from "../../core/types";

export function usePremiumCheckout() {
  const { user, preferences, request, refreshAccount } = useApp();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [order, setOrder] = useState<PremiumOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const alive = useRef(true),
    action = useRef(false),
    mode = useRef<boolean | null>(null);
  const latest = useRef<PremiumOrder | null>(null);
  const userId = user?.id;
  const key = useCallback(
    (sandbox: boolean) =>
      premiumStorageKey(preferences.apiUrl, userId!, sandbox),
    [preferences.apiUrl, userId],
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const commit = useCallback(
    async (next: PremiumOrder) => {
      if (!alive.current) return;
      latest.current = next;
      setOrder(next);
      await writeStored(
        key(next.sandbox),
        next.status === "pending" ? next.id : null,
      );
    },
    [key],
  );
  const confirm = useCallback(
    async (next: PremiumOrder) => {
      await commit(next);
      if (next.status === "paid") {
        const status = await request<Membership>("/membership");
        if (alive.current) setMembership(status);
        await refreshAccount();
      }
    },
    [commit, request, refreshAccount],
  );

  useFocusEffect(
    useCallback(() => {
      const abort = new AbortController();
      void (async () => {
        try {
          const status = await request<Membership>("/membership", {
            signal: abort.signal,
          });
          if (abort.signal.aborted) return;
          const sandbox = Boolean(status.sandbox);
          setMembership(status);
          setError(null);
          if (mode.current !== sandbox) {
            latest.current = null;
            setOrder(null);
          }
          mode.current = sandbox;
          const saved = await readStored<string | null>(key(sandbox), null);
          if (
            !saved ||
            !/^[a-zA-Z0-9_-]{1,80}$/.test(saved) ||
            abort.signal.aborted
          )
            return;
          try {
            const value = await request<unknown>(
              `/membership/orders/${saved}`,
              { signal: abort.signal },
            );
            if (!abort.signal.aborted)
              await confirm(parsePremiumOrder(value, sandbox));
          } catch (cause) {
            if (!abort.signal.aborted) {
              if (cause instanceof ApiError && cause.status === 404)
                await writeStored(key(sandbox), null);
              throw cause;
            }
          }
        } catch (cause) {
          if (!abort.signal.aborted) setError(errorMessage(cause));
        }
      })();
      return () => abort.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Explicit retry restarts this focused load.
    }, [request, key, confirm, reloadTick]),
  );

  const check = useCallback(async () => {
    const current = latest.current;
    if (!current || action.current) return;
    action.current = true;
    try {
      const value = await request<unknown>(`/membership/orders/${current.id}`);
      if (alive.current) {
        await confirm(parsePremiumOrder(value, current.sandbox));
        setError(null);
      }
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      action.current = false;
    }
  }, [request, confirm]);

  useFocusEffect(
    useCallback(() => {
      if (order?.status !== "pending") return;
      const timer = setInterval(() => {
        if (isForeground()) void check();
      }, 4000);
      const unsubscribe = onForeground(() => void check());
      return () => {
        clearInterval(timer);
        unsubscribe();
      };
    }, [order?.status, check]),
  );

  async function start() {
    if (action.current) return;
    action.current = true;
    setBusy(true);
    setError(null);
    try {
      const status = await request<Membership>("/membership");
      if (!status.paymentEnabled)
        throw Error("Thanh toán đang được thiết lập. Vui lòng quay lại sau.");
      const value = await request<unknown>("/membership/checkout", {
        method: "POST",
        timeoutMs: 35000,
      });
      if (alive.current) {
        setMembership(status);
        mode.current = Boolean(status.sandbox);
        await confirm(parsePremiumOrder(value, Boolean(status.sandbox)));
      }
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      action.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function simulate() {
    if (!latest.current?.sandbox || action.current) return;
    action.current = true;
    setBusy(true);
    setError(null);
    try {
      await request(`/membership/orders/${latest.current.id}/simulate`, {
        method: "POST",
      });
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      action.current = false;
      if (alive.current) setBusy(false);
    }
    await check();
  }
  return {
    membership,
    order,
    error,
    busy,
    start,
    check,
    simulate,
    reload: () => setReloadTick((value) => value + 1),
  };
}
