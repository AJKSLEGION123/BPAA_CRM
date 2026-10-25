"use client";
// The visitor's own marks, kept in this browser only: localStorage key bpaa-demo:v1:<login>.
// Read after mount (null on the server), every access in try/catch; without storage it still works in memory.
import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { DEMO_NOW } from "./demo/config";
import type { DealEvent } from "./demo/model";
import type { Overrides } from "./demo/selectors";

export type DemoStore = {
  marks: Record<string, { kind: "stage" | "action"; stage: number }[]>; // deal id → visitor's events at DEMO_NOW
  contacted: string[]; // lead ids
  simulated: number; // how many of the 6 prepared leads have arrived
  tourDone: boolean;
  seen: string[]; // hints and «Что здесь показано» blocks already shown
};

const EMPTY: DemoStore = { marks: {}, contacted: [], simulated: 0, tourDone: false, seen: [] };
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
let last: { key: string; raw: string | null; value: DemoStore } | null = null;

function rawFor(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function read(key: string): DemoStore {
  const raw = rawFor(key);
  if (last && last.key === key && last.raw === raw) return last.value;
  let value = EMPTY;
  try {
    if (raw) value = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    value = EMPTY;
  }
  last = { key, raw, value };
  return value;
}

function write(key: string, value: DemoStore | null) {
  const raw = value ? JSON.stringify(value) : null;
  if (raw) memory.set(key, raw);
  else memory.delete(key);
  try {
    if (raw) window.localStorage.setItem(key, raw);
    else window.localStorage.removeItem(key);
  } catch {
    // private window or blocked storage: the in-memory copy keeps the demo working until reload
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export const LoginContext = createContext("demo");

export function useDemoStore() {
  const key = `bpaa-demo:v1:${useContext(LoginContext)}`;
  const state = useSyncExternalStore(subscribe, () => read(key), () => null);
  const update = useCallback((fn: (s: DemoStore) => DemoStore) => write(key, fn(read(key))), [key]);
  const reset = useCallback(() => write(key, null), [key]);
  return { state, update, reset };
}

export function toOverrides(store: DemoStore | null): Overrides {
  const out: Overrides = {};
  if (!store) return out;
  for (const [id, marks] of Object.entries(store.marks)) {
    out[id] = marks.map((m): DealEvent => ({ ts: DEMO_NOW, kind: m.kind, stage: m.stage }));
  }
  return out;
}
