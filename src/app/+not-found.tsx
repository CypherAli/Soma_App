import { router } from "expo-router";
import { Empty, Page } from "../ui/components";
export default function NotFound() {
  return (
    <Page>
      <Empty
        title="Không tìm thấy màn hình"
        action="Về Hôm nay"
        onPress={() => router.replace("/(tabs)")}
      />
    </Page>
  );
}
