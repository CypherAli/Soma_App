import { useEffect, useState } from "react";
import { errorMessage } from "../../core/api";
import { useApp } from "../../core/AppProvider";
import { accountKey } from "../../core/storage";
import type { Membership, User } from "../../core/types";

export function useAccountOverview() {
  const { user, request, preferences } = useApp();
  const key = user ? accountKey(preferences.apiUrl, user.id) : "";
  const [result, setResult] = useState<{
      key: string;
      user: User;
      membership: Membership;
    } | null>(null),
    [failure, setFailure] = useState<{ key: string; message: string } | null>(
      null,
    );
  useEffect(() => {
    if (!user) return;
    const abort = new AbortController();
    void request<{ user: User; membership: Membership }>("/mobile/account", {
      signal: abort.signal,
    })
      .then((data) => {
        if (!abort.signal.aborted) {
          setResult({ key, ...data });
          setFailure(null);
        }
      })
      .catch((cause) => {
        if (!abort.signal.aborted)
          setFailure({ key, message: errorMessage(cause) });
      });
    return () => abort.abort();
  }, [user, request, key]);
  return {
    data: result?.key === key ? result : null,
    error: failure?.key === key ? failure.message : null,
  };
}
