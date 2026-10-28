import AsyncStorage from "@react-native-async-storage/async-storage";
export { accountKey } from "./identity";
const queues = new Map<string, Promise<void>>();
export async function readStored<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
export function writeStored(key: string, value: unknown): Promise<void> {
  const previous = queues.get(key) ?? Promise.resolve();
  const operation = previous
    .catch(() => {})
    .then(() => AsyncStorage.setItem(key, JSON.stringify(value)));
  queues.set(key, operation);
  void operation
    .finally(() => {
      if (queues.get(key) === operation) queues.delete(key);
    })
    .catch(() => {});
  return operation;
}
