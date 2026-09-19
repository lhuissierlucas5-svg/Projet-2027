import { supabase } from "./supabase";
export type PollUpdate = {
  id: string;
  candidate_id: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_at: string;
  verified_at: string;
  institute: string | null;
  sponsor: string | null;
  metric_type: string | null;
  scenario: string | null;
  value_percent: number | null;
  fieldwork_start: string | null;
  fieldwork_end: string | null;
  sample_size: number | null;
  population: string | null;
};


export function pollStage(metric: string | null) {
 return metric === "presidential_vote_intention" ? 0 : metric === "presidential_second_round_vote_intention" ? 1 : 2;
}
export const stageLabels = ["Premier tour", "Deuxième tour", "Autres thématiques"];
export function comparePollGroups([, a]: [string, PollUpdate[]], [, b]: [string, PollUpdate[]]) {
 return pollStage(a[0].metric_type) - pollStage(b[0].metric_type) || b[0].published_at.localeCompare(a[0].published_at) || (a[0].scenario ?? "").localeCompare(b[0].scenario ?? "", "fr");
}
export function groupPolls(items: PollUpdate[]) {
 const groups = new Map<string, PollUpdate[]>();
 for (const item of items) {
  const key = JSON.stringify([item.source_url,item.institute,item.sponsor,item.metric_type,item.scenario,item.title,item.published_at,item.fieldwork_start,item.fieldwork_end,item.sample_size,item.population]);
  groups.set(key, [...(groups.get(key) ?? []), item]);
 }
 return groups;
}
export async function loadCurrentPolls() {
 const data: PollUpdate[] = [];
 for (let offset = 0; ; offset += 500) {
  const result = await supabase.from("current_campaign_updates").select("*").eq("kind", "poll").order("published_at", { ascending: false }).order("id").range(offset, offset + 499);
  if (result.error) return { data: [] as PollUpdate[], error: result.error };
  const rows = result.data as PollUpdate[];
  data.push(...rows);
  if (rows.length < 500) return { data, error: null };
 }
}
