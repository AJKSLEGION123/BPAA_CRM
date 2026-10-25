// Types and the one function every number in the demo goes through: the state of a deal at a moment.
import { ABANDONED_DAYS, STAGES, URGENT_DAYS, type ManagerId, type SourceId } from "./config";
import { daysBetween } from "./time";

export type LeadStatus = "deal" | "work" | "junk";
export type Lead = {
  id: string;
  ts: number;
  source: SourceId;
  client: string;
  phone: string; // always masked: +7 7•• ••• •• 34
  need: string;
  manager: ManagerId;
  status: LeadStatus;
  dealId?: string;
  repeats: { ts: number; source: SourceId }[]; // later messages from the same number, merged into this lead
  failureId?: string;
  deliveredTs?: number; // set when a failure delayed the lead
};

export type DealEventKind = "created" | "stage" | "action" | "won" | "lost";
export type DealEvent = { ts: number; kind: DealEventKind; stage: number };

export type Deal = {
  id: string;
  client: string;
  need: string;
  amount: number;
  manager: ManagerId;
  source: SourceId;
  origin: "oct" | "carry" | "abandoned";
  leadId?: string;
  events: DealEvent[]; // sorted by ts; events[0] is "created" at stage 0
};

export type Failure = {
  id: string;
  start: number;
  end: number;
  source: SourceId;
  what: string;
  notifyTs: number;
  doneTs: number;
  leadIds: string[];
};

/** One of the 6 leads behind the «Пришла новая заявка» button. */
export type PreparedLead = {
  n: number;
  kind: "normal" | "duplicate" | "failure";
  source: SourceId;
  client: string;
  phone: string;
  need: string;
  manager: ManagerId;
  dupOf?: string; // lead id the duplicate is merged into
};

export type DemoData = { leads: Lead[]; deals: Deal[]; failures: Failure[]; prepared: PreparedLead[] };

export type DealState = {
  status: "open" | "won" | "lost";
  stage: number;
  last: number; // ts of the last event at or before the moment
  daysIdle: number;
  overNorm: boolean;
  urgent: boolean;
  abandoned: boolean;
};

/** State of a deal at `ts`, or null if it did not exist yet. Visitor overrides add extra events. */
export function stateAt(deal: Deal, ts: number, extra: DealEvent[] = []): DealState | null {
  if (deal.events[0].ts > ts) return null;
  let stage = 0;
  let last = deal.events[0].ts;
  let status: DealState["status"] = "open";
  const all = extra.length ? [...deal.events, ...extra].sort((a, b) => a.ts - b.ts) : deal.events;
  for (const e of all) {
    if (e.ts > ts) break;
    last = e.ts;
    if (e.kind === "stage" || e.kind === "created") stage = e.stage;
    if (e.kind === "won") status = "won";
    if (e.kind === "lost") status = "lost";
  }
  const daysIdle = daysBetween(last, ts);
  const open = status === "open";
  const abandoned = open && daysIdle > ABANDONED_DAYS;
  const overNorm = open && !abandoned && daysIdle > STAGES[stage].norm;
  return { status, stage, last, daysIdle, overNorm, urgent: overNorm && daysIdle >= URGENT_DAYS, abandoned };
}
