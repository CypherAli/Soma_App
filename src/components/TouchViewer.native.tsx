import { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import type { ViewerHandle, ViewerProps } from "./Viewer.types";
import { parseViewerEvent } from "./Viewer.types";
import { useTheme } from "../ui/theme";
import { offlineViewerHtml } from "../core/offlineViewer";

export const TouchViewer = memo(
  forwardRef<ViewerHandle, ViewerProps>(function TouchViewer(
    { uri, onEvent, onError },
    ref,
  ) {
    const view = useRef<WebView>(null),
      t = useTheme(),
      origin = new URL(uri).origin;
    const [source, setSource] = useState<{ html: string; baseUrl: string } | { uri: string } | null>(null);
    const terminal = useRef(false);
    const callbacks = useRef({ onError, onEvent });
    callbacks.current = { onError, onEvent };
    useEffect(() => {
      let active = true;
      terminal.current = false;
      setSource(null);
      const timeout = setTimeout(() => {
        if (active && !terminal.current) {
          terminal.current = true;
          callbacks.current.onError("Chưa mở được mô hình sau 30 giây. Hãy tải lại; dữ liệu 3D đã có sẵn trong ứng dụng.");
        }
      }, 30000);
      void offlineViewerHtml(uri).then((html) => {
        if (active && !terminal.current) setSource(html ? { html, baseUrl: "https://offline.soma.local/" } : { uri });
      }).catch(() => {
        if (active && !terminal.current) setSource({ uri });
      });
      return () => { active = false; clearTimeout(timeout); };
    }, [uri]);
    useImperativeHandle(
      ref,
      () => ({
        command: (value) =>
          view.current?.injectJavaScript(
            `window.somaMobileCommand?.(${JSON.stringify(value)});true;`,
          ),
      }),
      [],
    );
    if (!source) return <View style={{ flex: 1, backgroundColor: t.ground }} />;
    return (
      <WebView
        key={uri}
        ref={view}
        source={source}
        originWhitelist={["*"]}
        onShouldStartLoadWithRequest={(request) =>
          request.url === "about:blank" ||
          request.url === "https://offline.soma.local/" ||
          request.url.startsWith(origin + new URL(uri).pathname)
        }
        onMessage={(message) => {
          try {
            const event = parseViewerEvent(
              JSON.parse(message.nativeEvent.data),
            );
            if (event) {
              if (["ready", "error", "unavailable"].includes(event.type)) terminal.current = true;
              onEvent(event);
            }
          } catch {
            onError("Chưa đọc được phản hồi từ mô hình.");
          }
        }}
        onError={() =>
          onError("Không tải được trình xem 3D. Kiểm tra kết nối và thử lại.")
        }
        onHttpError={() =>
          onError("Máy chủ chưa mở được mô hình. Vui lòng thử lại.")
        }
        onRenderProcessGone={() => onError("Trình xem đã đóng để giải phóng bộ nhớ. Hãy mở lại mô hình.")}
        javaScriptEnabled
        domStorageEnabled={false}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        mixedContentMode="never"
        startInLoadingState={false}
        renderLoading={() => (
          <View
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.ground,
            }}
          >
            <ActivityIndicator color={t.accent} />
          </View>
        )}
        style={{ flex: 1, backgroundColor: t.ground }}
        accessibilityLabel="Mô hình giải phẫu 3D: dùng một ngón để xoay, hai ngón để phóng to"
      />
    );
  }),
);
