export function accountKey(base: string, userId: string) {
  return `soma.private.v1:${encodeURIComponent(base)}:${userId}`;
}
