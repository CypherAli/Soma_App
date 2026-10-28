import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { errorMessage } from "../../core/api";
import { useApp } from "../../core/AppProvider";
import { isForeground, onForeground } from "../../core/foreground";
import { accountKey } from "../../core/storage";
import type { Membership, User } from "../../core/types";

export function useAccountOverview() {
  const { user, request, preferences } = useApp();
  const key = user ? accountKey(preferences.apiUrl, user.id) : "";
  const reload = useRef(() => {});
  const [result, setResult] = useState<{
      key: string;
      user: User;
      membership: Membership;
    } | null>(null),
    [failure, setFailure] = useState<{ key: string; message: string } | null>(
      null,
    );
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const abort = new AbortController();
      let pending = false;
      const refresh = () => {
        if (pending || abort.signal.aborted || !isForeground()) return;
        pending = true;
        void request<{ user: User; membership: Membership }>(
          "/mobile/account",
          {
            signal: abort.signal,
          },
        )
          .then((data) => {
            if (!abort.signal.aborted) {
              setResult({ key, ...data });
              setFailure(null);
            }
          })
          .catch((cause) => {
            if (!abort.signal.aborted)
              setFailure({ key, message: errorMessage(cause) });
          })
          .finally(() => {
            pending = false;
          });
      };
      reload.current = refresh;
      refresh();
      const unsubscribe = onForeground(refresh);
      const timer = setInterval(refresh, 10000);
      return () => {
        abort.abort();
        unsubscribe();
        clearInterval(timer);
        reload.current = () => {};
      };
    }, [user, request, key]),
  );
  return {
    data: result?.key === key ? result : null,
    error: failure?.key === key ? failure.message : null,
    reload: () => reload.current(),
  };
}
