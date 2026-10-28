export function isForeground() {
  return document.visibilityState !== "hidden";
}

/** A desktop preview runs in an iframe; returning to its outer window matters too. */
export function onForeground(refresh: () => void) {
  const resume = () => {
    if (isForeground()) refresh();
  };
  window.addEventListener("focus", resume);
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
  let outer: Window | null = null;
  try {
    if (
      window.parent !== window &&
      window.parent.location.origin === location.origin
    ) {
      outer = window.parent;
      outer.addEventListener("focus", resume);
    }
  } catch {
    // Cross-origin embeds can still refresh through visibility and local focus.
  }
  return () => {
    window.removeEventListener("focus", resume);
    window.removeEventListener("online", resume);
    document.removeEventListener("visibilitychange", resume);
    outer?.removeEventListener("focus", resume);
  };
}
