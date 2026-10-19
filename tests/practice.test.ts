import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completedDraft,
  draftScore,
  selectQuestions,
  submissionOf,
} from "../src/core/practice";
import { normalizeApiUrl } from "../src/core/api";
import type { Draft, Question } from "../src/core/types";
const question = (id: string, scope = "skeletal"): Question => ({
  itemKey: `model:scene/${id}`,
  source: "model",
  scope,
  modelId: "scene",
  meshName: id,
  prompt: id,
  options: [
    { id: "right", text: "Right" },
    { id: "wrong", text: "Wrong" },
  ],
  correctOptionId: "right",
  explanation: "Source explanation",
  citation: "Source",
  version: "a".repeat(64),
});
test("due practice contains exactly the supported requested identities, regardless of scope filter", () => {
  const bank = [question("a"), question("b", "nervous"), question("c")];
  const result = selectQuestions(bank, {
    scope: "skeletal",
    count: 20,
    only: ["model:scene/b", "personal:unsupported"],
  });
  assert.deepEqual(
    result.map((q) => q.itemKey),
    ["model:scene/b"],
  );
});
test("sampling does not repeat or mutate source questions and never fills missing items with invented data", () => {
  const bank = [question("a"), question("b")],
    before = JSON.stringify(bank);
  const result = selectQuestions(bank, { count: 20 }, () => 0.2);
  assert.equal(result.length, 2);
  assert.equal(new Set(result.map((q) => q.itemKey)).size, 2);
  assert.equal(JSON.stringify(bank), before);
});
const draft: Draft = {
  id: "f3548a21-1da2-42b3-8c55-417bc5eb5583",
  owner: "user-1",
  questions: [question("a")],
  scope: "skeletal",
  answers: { "model:scene/a": "right" },
  confirmed: ["model:scene/a"],
  index: 0,
  startedAt: 1000,
};
test("completion freezes elapsed time and retry payload identity", () => {
  const finished = completedDraft(draft, 45000),
    retry = completedDraft(finished, 90000);
  assert.equal(finished.seconds, 44);
  assert.deepEqual(submissionOf(finished), submissionOf(retry));
  assert.equal(draftScore(finished), 1);
});
test("unanswered or unconfirmed questions cannot be submitted", () => {
  assert.throws(() => completedDraft({ ...draft, confirmed: [] }));
  assert.throws(() => completedDraft({ ...draft, answers: {} }));
  assert.throws(() => submissionOf(draft));
});
test("production refuses cleartext, credentials in URLs, and URL query strings", () => {
  assert.throws(() => normalizeApiUrl("http://example.com", false));
  assert.throws(() => normalizeApiUrl("https://u:p@example.com", false));
  assert.throws(() => normalizeApiUrl("https://example.com?token=1", false));
  assert.equal(
    normalizeApiUrl("https://example.com/", false),
    "https://example.com/api",
  );
  assert.equal(
    normalizeApiUrl("http://10.0.2.2:4000/api/", true),
    "http://10.0.2.2:4000/api",
  );
});
