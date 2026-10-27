import { type ReactNode } from "react";
import { View } from "react-native";
import { useApp } from "../../core/AppProvider";
import { accountKey } from "../../core/storage";
import { Page, SignInPrompt, Title } from "../../ui/components";

export function AccountGate({ children }: { children: ReactNode }) {
  const app = useApp();
  if (!app.user)
    return (
      <Page back="Cá nhân">
        <Title>Tài khoản</Title>
        <SignInPrompt next="profile" />
      </Page>
    );
  return (
    <View
      key={accountKey(app.preferences.apiUrl, app.user.id)}
      style={{ flex: 1 }}
    >
      {children}
    </View>
  );
}
