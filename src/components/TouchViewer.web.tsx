import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { ViewerHandle, ViewerProps } from "./Viewer.types";
import { parseViewerEvent } from "./Viewer.types";

export const TouchViewer = memo(
  forwardRef<ViewerHandle, ViewerProps>(function TouchViewer(
    { uri, onEvent, onError },
    ref,
  ) {
    const frame = useRef<HTMLIFrameElement>(null);
    useImperativeHandle(
      ref,
      () => ({
        command: (value) =>
          frame.current?.contentWindow?.postMessage(
            { source: "soma-app", command: value },
            new URL(uri).origin,
          ),
      }),
      [uri],
    );
    useEffect(() => {
      let finished = false;
      const timeout = setTimeout(() => {
        if (!finished) onError("Mô hình tải quá lâu. Kiểm tra máy chủ rồi tải lại.");
      }, 30000);
      const receive = (event: MessageEvent) => {
        if (
          event.origin !== new URL(uri).origin ||
          event.source !== frame.current?.contentWindow
        )
          return;
        const parsed = parseViewerEvent(event.data);
        if (parsed) {
          if (["ready", "error", "unavailable"].includes(parsed.type)) { finished = true; clearTimeout(timeout); }
          onEvent(parsed);
        }
      };
      window.addEventListener("message", receive);
      return () => { clearTimeout(timeout); window.removeEventListener("message", receive); };
    }, [uri, onEvent, onError]);
    return (
      <iframe
        ref={frame}
        src={uri}
        title="Mô hình giải phẫu 3D tương tác"
        sandbox="allow-scripts allow-same-origin"
        onError={() => onError("Không tải được trình xem 3D.")}
        style={{ border: 0, width: "100%", height: "100%", display: "block" }}
      />
    );
  }),
);
