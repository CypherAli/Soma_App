export interface Structure {
  id: string;
  meshName: string;
  label: string;
  english: string;
  latin: string;
  note: string;
}
export interface AnatomyModel {
  id: string;
  title: string;
  english: string;
  description: string;
  system: string;
  modelPath: string;
  viewerPath: string;
  structures: Structure[];
  attribution: string;
}
export interface Question {
  itemKey: string;
  source: "model";
  scope: string;
  modelId: string;
  meshName: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  citation: string;
  version: string;
}
export interface Catalogue {
  schemaVersion: number;
  version: string;
  models: AnatomyModel[];
  questions: Question[];
}
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  plan?: string;
}
export interface Credential {
  token: string;
  expiresAt: string;
  userId: string;
  apiUrl: string;
}
export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}
export interface Attempt {
  id: string;
  score: number;
  total: number;
  scope: string;
  seconds: number;
  createdAt: string;
  source: string;
}
export interface History {
  attempts: Attempt[];
  totals: { score: number; total: number; accuracy: number | null };
  streak: number;
  dueCount: number;
  trackedCount: number;
  byScope: { scope: string; accuracy: number | null; total: number }[];
}
export interface PlanInput {
  goal: string;
  horizonDays: number;
  daysPerWeek: number;
  minutesPerDay: number;
  systemKey: string;
  focusSystems: string[];
}
export interface PlanBlock {
  index: number;
  granularity: "day" | "week" | "month";
  from: string;
  to: string;
  systemKey: string;
  kind: string;
  current: boolean;
  sessions: number;
}
export interface StudyPath {
  path: (PlanInput & { startedAt: string }) | null;
  plan: {
    dayIndex: number;
    daysLeft: number;
    totalSessions: number;
    blocks: PlanBlock[];
  } | null;
  session: {
    dueKeys: string[];
    newCount: number;
    size: number;
    systemKey: string;
  } | null;
}
export interface Draft {
  id: string;
  owner: string;
  questions: Question[];
  answers: Record<string, string>;
  confirmed: string[];
  index: number;
  scope: string;
  startedAt: number;
  completedAt?: number;
  seconds?: number;
  receipt?: Attempt;
}
export interface PrivateData {
  saved: string[];
  draft: Draft | null;
}
export type Appearance = "system" | "light" | "dark";
export interface Preferences {
  apiUrl: string;
  appearance: Appearance;
}
export const SYSTEM_NAMES: Record<string, string> = {
  all: "Tất cả hệ cơ quan",
  skeletal: "Hệ xương",
  muscular: "Hệ cơ",
  cardiovascular: "Hệ tim mạch",
  nervous: "Hệ thần kinh",
  visceral: "Nội tạng",
  joints: "Khớp",
  lymphoid: "Hệ bạch huyết",
};
