import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import type { ViewerHandle, ViewerProps } from "./Viewer.types";
import { parseViewerEvent } from "./Viewer.types";
import { useTheme } from "../ui/theme";

export const TouchViewer = memo(
  forwardRef<ViewerHandle, ViewerProps>(function TouchViewer(
    { uri, onEvent, onError },
    ref,
  ) {
    const view = useRef<WebView>(null),
      t = useTheme(),
      origin = new URL(uri).origin;
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
    return (
      <WebView
        key={uri}
        ref={view}
        source={{ uri }}
        originWhitelist={[origin]}
        onShouldStartLoadWithRequest={(request) =>
          request.url === "about:blank" ||
          request.url.startsWith(origin + new URL(uri).pathname)
        }
        onMessage={(message) => {
          try {
            const event = parseViewerEvent(
              JSON.parse(message.nativeEvent.data),
            );
            if (event) onEvent(event);
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
        javaScriptEnabled
        domStorageEnabled={false}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        mixedContentMode="never"
        startInLoadingState
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
