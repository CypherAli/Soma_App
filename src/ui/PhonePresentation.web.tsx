import { useEffect, useRef, useState, type ReactNode } from "react";

const WIDTH = 414,
  HEIGHT = 892;
export function PhonePresentation({ children }: { children: ReactNode }) {
  const [desktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.parent === window &&
      window.matchMedia("(pointer: fine)").matches,
  );
  return desktop ? <PhoneWindow /> : children;
}
function PhoneWindow() {
  const [source] = useState(() => window.location.href);
  const [scale, setScale] = useState(1),
    [error, setError] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const fit = () =>
      setScale(
        Math.max(
          0.25,
          Math.min(
            1,
            (window.innerWidth - 40) / WIDTH,
            (window.innerHeight - 76) / HEIGHT,
          ),
        ),
      );
    fit();
    window.addEventListener("resize", fit);
    // Reflect only our same-origin app, so OAuth codes leave the outer address bar.
    const reflect = () => {
      try {
        const current = frame.current?.contentWindow?.location;
        if (
          !current ||
          current.origin !== window.location.origin ||
          current.href === "about:blank"
        )
          return;
        const path =
          current.pathname === "/oauth"
            ? "/oauth"
            : current.pathname + current.search + current.hash;
        if (
          window.location.pathname +
            window.location.search +
            window.location.hash !==
          path
        )
          window.history.replaceState(null, "", path);
      } catch {
        /* A provider navigation is handled in the top-level window. */
      }
    };
    const timer = setInterval(reflect, 350);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", fit);
    };
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#e9ecea",
        color: "#292f2b",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: WIDTH * scale,
          height: HEIGHT * scale,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: WIDTH,
            height: HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            boxSizing: "border-box",
            borderRadius: 46,
            padding: "28px 10px 18px",
            background: "#171a18",
            border: "1px solid #414740",
            boxShadow: "0 18px 55px #18251b26",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: 8,
              height: 8,
              borderRadius: 9,
              top: 10,
              left: "calc(50% - 4px)",
              background: "#070a08",
              boxShadow: "inset 0 0 0 2px #303c35",
            }}
          />
          <iframe
            ref={frame}
            src={source}
            title="Soma — màn hình điện thoại"
            allow="fullscreen"
            onError={() => setError(true)}
            style={{
              display: "block",
              margin: "0 auto",
              width: 390,
              height: 844,
              border: 0,
              borderRadius: 27,
              background: "white",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: 7,
              width: 100,
              height: 4,
              borderRadius: 5,
              background: "#747d76",
              left: "calc(50% - 50px)",
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: 12,
          color: "#5a655d",
        }}
      >
        <span>Soma · Xem trước Expo</span>
        <button
          onClick={() => {
            void document.documentElement
              .requestFullscreen()
              .catch(() => setError(true));
          }}
          style={{
            color: "#345b49",
            background: "transparent",
            border: "1px solid #c3cdc6",
            padding: "7px 12px",
            borderRadius: 7,
            cursor: "pointer",
            font: "inherit",
          }}
        >
          Toàn màn hình
        </button>
      </div>
      {error && (
        <span role="alert" style={{ fontSize: 12 }}>
          Nhấn F11 để mở toàn màn hình hoặc Ctrl+R để tải lại.
        </span>
      )}
    </div>
  );
}
