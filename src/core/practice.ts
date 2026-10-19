import type { Draft, Question } from "./types";

export function shuffled<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function selectQuestions(
  bank: readonly Question[],
  options: { scope?: string; modelId?: string; count: number; only?: string[] },
  random: () => number = Math.random,
) {
  const allowed = options.only ? new Set(options.only) : null;
  const pool = bank.filter((q) =>
    allowed
      ? allowed.has(q.itemKey)
      : (!options.modelId || q.modelId === options.modelId) &&
        (!options.scope ||
          options.scope === "all" ||
          q.scope === options.scope),
  );
  return shuffled(pool, random)
    .slice(0, Math.max(1, Math.min(20, options.count)))
    .map((q) => ({ ...q, options: shuffled(q.options, random) }));
}

export function draftScore(draft: Draft) {
  return draft.questions.filter(
    (q) => draft.answers[q.itemKey] === q.correctOptionId,
  ).length;
}
export function completedDraft(draft: Draft, now = Date.now()): Draft {
  if (
    draft.questions.length === 0 ||
    draft.questions.some(
      (q) =>
        !q.options.some((o) => o.id === draft.answers[q.itemKey]) ||
        !draft.confirmed.includes(q.itemKey),
    )
  )
    throw new Error("Bạn chưa xác nhận đầy đủ các câu hỏi.");
  return {
    ...draft,
    completedAt: draft.completedAt ?? now,
    seconds:
      draft.seconds ??
      Math.min(21600, Math.max(0, Math.round((now - draft.startedAt) / 1000))),
  };
}
export function submissionOf(draft: Draft) {
  if (!draft.completedAt) throw new Error("Bài làm chưa hoàn thành.");
  return {
    clientRequestId: draft.id,
    scope: draft.scope,
    seconds: draft.seconds ?? 0,
    answers: draft.questions.map((q) => ({
      itemKey: q.itemKey,
      version: q.version,
      answerId: draft.answers[q.itemKey],
    })),
  };
}
export function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
