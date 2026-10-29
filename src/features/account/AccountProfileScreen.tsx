import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { errorMessage } from "../../core/api";
import { useApp } from "../../core/AppProvider";
import {
  Body,
  Button,
  Choice,
  ErrorText,
  Field,
  MenuRow,
  Page,
  Title,
  UserAvatar,
} from "../../ui/components";
import { Text, useI18n } from "../../ui/i18n";
import { useTheme } from "../../ui/theme";
import { AccountGate } from "./AccountGate";
import { dateText } from "./format";
import { MembershipSummary } from "./MembershipSummary";
import { useAccountOverview } from "./useAccountOverview";

export function AccountProfileScreen() {
  return (
    <AccountGate>
      <ProfileDetails />
    </AccountGate>
  );
}

export function ProfileDetails() {
  const app = useApp(),
    t = useTheme(),
    { language } = useI18n(),
    overview = useAccountOverview();
  const [name, setName] = useState(app.user!.name),
    [learningRole, setLearningRole] = useState(
      app.user?.learningRole ?? "learner",
    ),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function photo() {
    if (busy) return;
    setBusy("photo");
    setError(null);
    setMessage(null);
    try {
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (selection.canceled || !alive.current) return;
      const asset = selection.assets[0],
        side = Math.min(asset.width, asset.height);
      const context = ImageManipulator.manipulate(asset.uri);
      context
        .crop({
          originX: Math.max(0, (asset.width - side) / 2),
          originY: Math.max(0, (asset.height - side) / 2),
          width: side,
          height: side,
        })
        .resize({ width: 256, height: 256 });
      const image = await context.renderAsync();
      const result = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.72,
        base64: true,
      });
      context.release();
      image.release();
      if (!result.base64 || result.base64.length > 60000)
        throw Error(
          language === "en"
            ? "Choose a smaller image."
            : "Vui lòng chọn ảnh nhỏ hơn.",
        );
      if (alive.current)
        await app.updateProfile({
          avatar: `data:image/jpeg;base64,${result.base64}`,
        });
      if (alive.current) setMessage("Đã cập nhật ảnh đại diện.");
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  async function removePhoto() {
    if (busy) return;
    setBusy("photo");
    setError(null);
    setMessage(null);
    try {
      await app.updateProfile({ avatar: null });
      if (alive.current) setMessage("Đã cập nhật ảnh đại diện.");
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  async function save() {
    if (busy) return;
    setBusy("profile");
    setError(null);
    setMessage(null);
    try {
      await app.updateProfile({ name: name.trim(), learningRole });
      if (alive.current) setMessage("Đã lưu thông tin tài khoản.");
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      if (alive.current) setBusy(null);
    }
  }
  return (
    <Page back="Cá nhân" refresh>
      <Title>Hồ sơ tài khoản</Title>
      <Body muted style={{ fontSize: 13 }}>
        Thông tin được đồng bộ với Soma trên web.
      </Body>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 20,
          paddingVertical: 28,
        }}
      >
        <UserAvatar name={app.user?.name} uri={app.user?.avatar} size={78} />
        <View style={{ flex: 1, gap: 10 }}>
          <Button
            secondary
            loading={busy === "photo"}
            disabled={!!busy}
            onPress={() => void photo()}
          >
            {app.user?.avatar ? "Thay ảnh đại diện" : "Thêm ảnh đại diện"}
          </Button>
          {!!app.user?.avatar && (
            <Pressable
              accessibilityRole="button"
              disabled={!!busy}
              onPress={() => void removePhoto()}
              style={{ minHeight: 36, justifyContent: "center" }}
            >
              <Text
                style={{ fontSize: 13, color: t.muted, textAlign: "center" }}
              >
                Xóa ảnh
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <Field
        label="Họ và tên"
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Field
        label="Email"
        value={app.user?.email}
        editable={false}
        autoCapitalize="none"
      />
      <Choice
        label="Vai trò học tập"
        value={learningRole}
        onChange={(value) => setLearningRole(value as "learner" | "teacher")}
        options={[
          { value: "learner", label: "Người học" },
          { value: "teacher", label: "Giáo viên" },
        ]}
      />
      <ErrorText message={error} />
      {!!message && (
        <Body style={{ color: t.success, marginVertical: 12 }}>{message}</Body>
      )}
      <Button
        loading={busy === "profile"}
        disabled={
          !!busy ||
          name.trim().length < 2 ||
          (name.trim() === app.user?.name &&
            learningRole === (app.user?.learningRole ?? "learner"))
        }
        onPress={() => void save()}
      >
        Lưu thay đổi
      </Button>
      <View style={{ paddingVertical: 22, gap: 10 }}>
        <Fact
          label="Ngày tham gia"
          value={dateText(app.user?.createdAt, language)}
        />
        <Fact
          label="Loại tài khoản"
          value={
            app.user?.role === "admin"
              ? language === "en"
                ? "Administrator"
                : "Quản trị viên"
              : language === "en"
                ? "Member"
                : "Thành viên"
          }
        />
      </View>
      {overview.data ? (
        <MembershipSummary
          membership={overview.data.membership}
          onRefresh={overview.reload}
        />
      ) : (
        <ErrorText message={overview.error} />
      )}
      <MenuRow
        label="Bảo mật và thiết bị"
        icon="lock-closed-outline"
        onPress={() => router.push("/security")}
      />
      <MenuRow
        label="Tài khoản liên kết"
        icon="link-outline"
        onPress={() => router.push("/connections")}
      />
    </Page>
  );
}

export function Fact({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 18 }}
    >
      <Body muted style={{ fontSize: 13 }}>
        {label}
      </Body>
      <Text
        style={{
          fontSize: 13,
          color: t.ink,
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
