import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

type Candidate = {
  id: string;
  display_name: string;
  party: string | null;
};

type Discovery = {
  dedup_key: string;
  candidate_id: string | null;
  query_label: string;
  title: string;
  source_name: string;
  source_url: string;
  published_at: string | null;
};

type AuditTarget = {
  source_table: string;
  row_id: string;
  source_url: string;
};

const PROJECT_SITE = "https://election-2027-candidats.vercel.app";
const MAX_ITEMS_PER_QUERY = 8;
const DISCOVERY_WINDOW_MS = 72 * 60 * 60 * 1000;
const MAX_AUDITS_PER_RUN = 72;
const AUDIT_CONCURRENCY = 8;

function getAdminKey() {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // Fall back to the legacy server-only key below.
    }
  }

  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacy) throw new Error("Server database credential is unavailable.");
  return legacy;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(x?[0-9a-f]+);/gi, (_match, code: string) => {
      const base = code.toLowerCase().startsWith("x") ? 16 : 10;
      const raw = base === 16 ? code.slice(1) : code;
      const point = Number.parseInt(raw, base);
      return Number.isFinite(point) ? String.fromCodePoint(point) : "";
    })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function normalizeTitle(title: string, sourceName: string) {
  const suffix = sourceName ? ` - ${sourceName}` : "";
  const cleaned = suffix && title.endsWith(suffix) ? title.slice(0, -suffix.length) : title;
  return cleaned.trim().slice(0, 320);
}

async function fetchNewsQuery(
  candidateId: string | null,
  queryLabel: string,
  query: string,
): Promise<Discovery[]> {
  const endpoint = new URL("https://news.google.com/rss/search");
  endpoint.searchParams.set("q", `${query} when:3d`);
  endpoint.searchParams.set("hl", "fr");
  endpoint.searchParams.set("gl", "FR");
  endpoint.searchParams.set("ceid", "FR:fr");

  const response = await fetch(endpoint, {
    redirect: "follow",
    signal: AbortSignal.timeout(9000),
    headers: {
      "User-Agent": `Election2027DailyWatch/1.0 (+${PROJECT_SITE}/suivi)`,
      "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`News feed returned HTTP ${response.status}`);
  }

  const xml = await response.text();
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
    .slice(0, MAX_ITEMS_PER_QUERY * 2)
    .map((match) => match[1]);

  const cutoff = Date.now() - DISCOVERY_WINDOW_MS;
  const discoveries: Discovery[] = [];

  for (const item of items) {
    if (discoveries.length >= MAX_ITEMS_PER_QUERY) break;

    const rawTitle = tag(item, "title");
    const sourceName = tag(item, "source") || "Source référencée par Google Actualités";
    const sourceUrl = tag(item, "link");
    const pubDate = tag(item, "pubDate");
    const timestamp = Date.parse(pubDate);

    if (!rawTitle || !sourceUrl.startsWith("https://")) continue;
    if (Number.isFinite(timestamp) && timestamp < cutoff) continue;

    const title = normalizeTitle(rawTitle, sourceName);
    if (title.length < 3) continue;

    discoveries.push({
      dedup_key: await sha256(`${candidateId ?? "general"}|${sourceUrl}|${title}`),
      candidate_id: candidateId,
      query_label: queryLabel.slice(0, 180),
      title,
      source_name: sourceName.slice(0, 160),
      source_url: sourceUrl,
      published_at: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    });
  }

  return discoveries;
}

async function mapLimit<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>,
) {
  const results: R[] = [];
  let cursor = 0;

  async function runner() {
    while (cursor < values.length) {
      const current = cursor++;
      results[current] = await worker(values[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, Math.max(values.length, 1)) }, () => runner()),
  );

  return results;
}

async function sourceHealth(target: AuditTarget) {
  let status = 0;
  try {
    let response = await fetch(target.source_url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(6500),
      headers: {
        "User-Agent": `Election2027SourceAudit/1.0 (+${PROJECT_SITE}/suivi)`,
        "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.6",
      },
    });

    if (response.status === 405) {
      response = await fetch(target.source_url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(6500),
        headers: {
          "User-Agent": `Election2027SourceAudit/1.0 (+${PROJECT_SITE}/suivi)`,
          "Range": "bytes=0-512",
          "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.6",
        },
      });
    }

    status = response.status;
    const reachable = status >= 200 && status < 400;
    return {
      ...target,
      quality_status: reachable ? "acceptable" : "review",
      note: reachable
        ? `Contrôle automatique : lien accessible (HTTP ${status}).`
        : `Contrôle automatique : réponse HTTP ${status}, vérification humaine conseillée.`,
    };
  } catch {
    return {
      ...target,
      quality_status: "review",
      note: "Contrôle automatique : source non joignable lors de ce passage ; vérification humaine conseillée.",
    };
  }
}

Deno.serve(async (req: Request) => {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) return Response.json({ ok: false }, { status: 500 });

  const supabase = createClient(url, getAdminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  const providedHash = await sha256(providedSecret);
  const { data: authRow, error: authError } = await supabase
    .from("automation_secret_hashes")
    .select("secret_hash")
    .eq("name", "daily_information_watch")
    .maybeSingle();

  if (
    authError ||
    !authRow?.secret_hash ||
    !constantTimeEqual(providedHash, String(authRow.secret_hash))
  ) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { data: run, error: runError } = await supabase
    .from("content_sync_runs")
    .insert({ summary: "Veille quotidienne en cours." })
    .select("id")
    .single();

  if (runError || !run?.id) {
    return Response.json({ ok: false, message: "Unable to start sync log." }, { status: 500 });
  }

  let added = 0;
  let archived = 0;
  let sourcesChecked = 0;
  let partialFailures = 0;

  async function finish(status: "success" | "partial" | "failed", summary: string) {
    await supabase
      .from("content_sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        status,
        added,
        corrected: 0,
        archived,
        sources_checked: sourcesChecked,
        summary: summary.slice(0, 600),
      })
      .eq("id", run.id);
  }

  try {
    const { data: candidateRows, error: candidateError } = await supabase
      .from("candidates")
      .select("id,display_name,party")
      .order("display_name", { ascending: true });

    if (candidateError) throw candidateError;

    const candidates = (candidateRows ?? []) as Candidate[];
    const queryJobs = [
      ...candidates.map((candidate) => ({
        candidateId: candidate.id,
        label: candidate.display_name,
        query: `"${candidate.display_name}" présidentielle 2027`,
      })),
      {
        candidateId: null,
        label: "Campagne présidentielle 2027",
        query: '"présidentielle 2027" France',
      },
    ];

    const discoveryGroups = await mapLimit(queryJobs, 4, async (job) => {
      try {
        return await fetchNewsQuery(job.candidateId, job.label, job.query);
      } catch {
        partialFailures += 1;
        return [];
      }
    });

    const discoveries = discoveryGroups.flat();
    if (discoveries.length) {
      const { data: inserted, error: insertError } = await supabase
        .from("daily_information_queue")
        .upsert(discoveries, {
          onConflict: "dedup_key",
          ignoreDuplicates: true,
        })
        .select("id");

      if (insertError) {
        partialFailures += 1;
      } else {
        added = inserted?.length ?? 0;
      }
    }

    const auditConfigs = [
      { table: "candidates", rowKey: "id", urlKey: "quote_source_url" },
      { table: "candidate_positions", rowKey: "id", urlKey: "source_url" },
      { table: "candidate_issue_cards", rowKey: "id", urlKey: "source_url" },
      { table: "campaign_updates", rowKey: "id", urlKey: "source_url" },
      { table: "political_agenda", rowKey: "id", urlKey: "source_url" },
      { table: "contender_watch", rowKey: "id", urlKey: "source_url" },
      { table: "priority_issues", rowKey: "slug", urlKey: "source_url" },
      { table: "selection_process_watch", rowKey: "id", urlKey: "source_url" },
    ] as const;

    const auditTargets: AuditTarget[] = [];
    for (const config of auditConfigs) {
      const { data, error } = await supabase
        .from(config.table)
        .select(`${config.rowKey},${config.urlKey}`)
        .not(config.urlKey, "is", null);

      if (error) {
        partialFailures += 1;
        continue;
      }

      for (const row of data ?? []) {
        const rowId = String((row as Record<string, unknown>)[config.rowKey] ?? "");
        const sourceUrl = String((row as Record<string, unknown>)[config.urlKey] ?? "");
        if (rowId && sourceUrl.startsWith("https://")) {
          auditTargets.push({
            source_table: config.table,
            row_id: rowId,
            source_url: sourceUrl,
          });
        }
      }
    }

    const uniqueTargets = Array.from(
      new Map(
        auditTargets.map((item) => [
          `${item.source_table}|${item.row_id}|${item.source_url}`,
          item,
        ]),
      ).values(),
    );

    const selectedTargets: AuditTarget[] = [];
    if (uniqueTargets.length) {
      const dailySeed = Math.floor(Date.now() / 86_400_000);
      const start = (dailySeed * 31) % uniqueTargets.length;
      const count = Math.min(MAX_AUDITS_PER_RUN, uniqueTargets.length);
      for (let offset = 0; offset < count; offset += 1) {
        selectedTargets.push(uniqueTargets[(start + offset) % uniqueTargets.length]);
      }
    }

    const auditResults = await mapLimit(
      selectedTargets,
      AUDIT_CONCURRENCY,
      sourceHealth,
    );
    sourcesChecked = auditResults.length;

    if (auditResults.length) {
      const { error: auditInsertError } = await supabase
        .from("source_audit_log")
        .upsert(
          auditResults.map(({ source_table, row_id, quality_status, note }) => ({
            source_table,
            row_id,
            quality_status,
            note,
            checked_at: new Date().toISOString(),
          })),
          {
            onConflict: "source_table,row_id",
            ignoreDuplicates: false,
          },
        );

      if (auditInsertError) partialFailures += 1;
    }

    const expirableTables = [
      "campaign_updates",
      "candidate_positions",
      "political_agenda",
      "contender_watch",
      "candidate_issue_cards",
    ];

    const now = new Date().toISOString();
    for (const table of expirableTables) {
      const { data, error } = await supabase
        .from(table)
        .update({ archived_at: now })
        .lt("expires_at", now)
        .is("archived_at", null)
        .select("id");

      if (error) {
        partialFailures += 1;
      } else {
        archived += data?.length ?? 0;
      }
    }

    const status = partialFailures ? "partial" : "success";
    const summary =
      `Veille quotidienne : ${added} nouvelle(s) référence(s) à examiner, ` +
      `${sourcesChecked} source(s) contrôlée(s), ${archived} élément(s) expiré(s) archivé(s). ` +
      (partialFailures
        ? `${partialFailures} étape(s) partielle(s) à surveiller. `
        : "") +
      "Aucun contenu politique n’a été publié automatiquement.";

    await finish(status, summary);

    return Response.json({
      ok: true,
      status,
      added,
      sources_checked: sourcesChecked,
      archived,
      partial_failures: partialFailures,
    });
  } catch {
    await finish(
      "failed",
      "La veille quotidienne a échoué avant son terme. Aucun contenu politique n’a été publié automatiquement.",
    );
    return Response.json({ ok: false, message: "Daily watch failed." }, { status: 500 });
  }
});
