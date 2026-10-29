import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../core/AppProvider";
import { errorMessage } from "../core/api";
import { accountKey } from "../core/storage";
import {
  Body,
  Button,
  ErrorText,
  Field,
  Page,
  SignInPrompt,
  Title,
} from "../ui/components";
import { useI18n } from "../ui/i18n";
import { useTheme } from "../ui/theme";

interface Source {
  id: string;
  title: string;
  detail: string;
  href: string;
}
interface Message {
  role: "user" | "bot";
  text: string;
  sources?: Source[];
  suggestions?: string[];
  engine?: string;
}
export function AssistantScreen() {
  const app = useApp();
  if (!app.user)
    return (
      <Page back="Hôm nay">
        <Title>Trợ lý Soma</Title>
        <SignInPrompt />
      </Page>
    );
  return (
    <AssistantContent key={accountKey(app.preferences.apiUrl, app.user.id)} />
  );
}
function AssistantContent() {
  const app = useApp(),
    t = useTheme(),
    { language } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<number[]>([]);
  const abort = useRef<AbortController | null>(null),
    pending = useRef(false);
  useEffect(() => () => abort.current?.abort(), []);
  async function send(question = text) {
    if (!question.trim() || pending.current) return;
    const controller = new AbortController();
    abort.current = controller;
    pending.current = true;
    setBusy(true);
    setError(null);
    const user: Message = { role: "user", text: question.trim() };
    const history = messages
      .slice(-4)
      .map(({ role, text }) => ({ role, text: text.slice(0, 2000) }));
    setMessages([...messages, user]);
    setText("");
    try {
      const result = await app.request<{
        answer: string;
        sources: Source[];
        suggestions: string[];
        engine: string;
      }>("/mobile/assistant", {
        method: "POST",
        body: { question: user.text, locale: language, history },
        timeoutMs: 65000,
        signal: controller.signal,
      });
      if (!controller.signal.aborted)
        setMessages((previous) => [
          ...previous,
          {
            role: "bot",
            text: result.answer,
            sources: result.sources,
            suggestions: result.suggestions,
            engine: result.engine,
          },
        ]);
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(errorMessage(e));
        setText(user.text);
        setMessages((previous) => previous.slice(0, -1));
      }
    } finally {
      pending.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <Page
      back="Hôm nay"
      followContent
      footer={
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderColor: t.rule,
            backgroundColor: t.paper,
          }}
        >
          <ErrorText message={error} />
          <Field
            label="Nhập câu hỏi (tối đa 500 ký tự)"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            accessibilityLabel={language === "en" ? "Ask Soma" : "Hỏi Soma"}
            style={{ maxHeight: 110 }}
            editable={!busy}
          />
          <Button
            disabled={!text.trim()}
            loading={busy}
            onPress={() => void send()}
          >
            {busy ? "Đang trả lời…" : "Gửi"}
          </Button>
          {!!messages.length && (
            <Button
              secondary
              disabled={busy}
              onPress={() => {
                setMessages([]);
                setError(null);
              }}
            >
              Xóa hội thoại
            </Button>
          )}
        </View>
      }
    >
      <Title>Trợ lý Soma</Title>
      <Body muted>
        Trợ lý giải thích dựa trên tài liệu Soma và hiển thị nguồn tham khảo.
      </Body>
      <Body muted style={{ fontSize: 12, marginVertical: 12 }}>
        Tin nhắn được gửi tới máy chủ để trả lời. Không gửi thông tin sức khỏe
        cá nhân.
      </Body>
      {messages.map((m, i) => (
        <View
          key={i}
          style={{
            padding: 16,
            marginVertical: 8,
            borderRadius: 16,
            backgroundColor: m.role === "user" ? t.tint : t.paper,
            borderWidth: 1,
            borderColor: t.rule,
          }}
        >
          <Body style={{ fontWeight: "600", marginBottom: 8 }}>
            {m.role === "user" ? app.user?.name || "Bạn" : "Soma"}
          </Body>
          <Body>{m.text}</Body>
          {!!m.sources?.length && (
            <>
              <Button
                secondary
                onPress={() =>
                  setExpandedSources((previous) =>
                    previous.includes(i)
                      ? previous.filter((index) => index !== i)
                      : [...previous, i],
                  )
                }
              >
                Nguồn tham khảo
              </Button>
              {expandedSources.includes(i) &&
                m.sources.map((s, j) => {
                  const model = app.catalogue.models.find(
                    (item) =>
                      item.id === s.id ||
                      s.href.includes(`/mo-hinh/${item.id}`),
                  );
                  return (
                    <View key={`${s.id}-${j}`} style={{ marginBottom: 12 }}>
                      <Body style={{ fontWeight: "600" }}>
                        [{j + 1}] {s.title}
                      </Body>
                      <Body muted style={{ fontSize: 12 }}>
                        {s.detail.slice(0, 700)}
                      </Body>
                      {model && (
                        <Button
                          secondary
                          onPress={() =>
                            router.push({
                              pathname: "/atlas/[id]",
                              params: { id: model.id },
                            })
                          }
                        >
                          Mở mô hình
                        </Button>
                      )}
                    </View>
                  );
                })}
            </>
          )}
          {m.engine === "lookup-fallback" && (
            <Body muted style={{ fontSize: 11 }}>
              Tra cứu từ nguồn
            </Body>
          )}
          {i === messages.length - 1 &&
            m.suggestions?.map((s) => (
              <Button
                key={s}
                secondary
                disabled={busy}
                onPress={() => void send(s)}
              >
                {s}
              </Button>
            ))}
        </View>
      ))}
    </Page>
  );
}
