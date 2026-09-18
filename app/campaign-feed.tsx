import { supabase } from "../lib/supabase";

type Update = {
  id: string;
  candidate_id: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_at: string;
  verified_at: string;
  topic: string | null;
  event_date: string | null;
  event_at: string | null;
  media_name: string | null;
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

const metrics: Record<string, string> = {
  presidential_vote_intention: "Intention de vote présidentielle",
  primary_vote_intention: "Intention de vote à une primaire",
  favorability: "Opinion favorable",
  desired_participation: "Participation souhaitée",
};

function date(value: string | null) {
  if (!value) return "Non précisé";
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
    .toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
}

function sourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch { return undefined; }
}

export default async function CampaignFeed() {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const fields = "id,candidate_id,title,summary,source_name,source_url,published_at,verified_at,topic,event_date,event_at,media_name,institute,sponsor,metric_type,scenario,value_percent,fieldwork_start,fieldwork_end,sample_size,population";
  const [proposals, polls, appearances, candidates] = await Promise.all([
    supabase.from("campaign_updates").select(fields).eq("kind", "proposal")
      .eq("verification_status", "verified").order("published_at", { ascending: false }).limit(12),
    supabase.from("campaign_updates").select(fields).eq("kind", "poll")
      .eq("verification_status", "verified").order("published_at", { ascending: false }).limit(12),
    supabase.from("campaign_updates").select(fields).eq("kind", "appearance")
      .eq("verification_status", "verified").eq("event_status", "scheduled")
      .gte("event_date", today).or(`event_at.is.null,event_at.gte.${now.toISOString()}`)
      .order("event_date").order("event_at", { nullsFirst: false }).limit(12),
    supabase.from("candidates").select("id,display_name,slug"),
  ]);
  const names = new Map((candidates.data ?? []).map(c => [c.id, c]));
  const sections = [
    { id: "propositions", label: "03 · PROPOSITIONS", title: "Les propositions récentes", kind: "proposal", result: proposals,
      description: "Des résumés factuels, classés par thème et reliés à leur source.", empty: "Aucune proposition vérifiée publiée pour le moment." },
    { id: "sondages", label: "04 · SONDAGES", title: "Les derniers sondages", kind: "poll", result: polls,
      description: "Chaque résultat correspond à une enquête et à un scénario précis. Les indicateurs de nature différente ne sont pas directement comparables.", empty: "Aucun sondage vérifié publié dans cette rubrique pour le moment." },
    { id: "agenda", label: "05 · AGENDA", title: "Les prochains rendez-vous médias", kind: "appearance", result: appearances,
      description: "Uniquement les passages annoncés et sourcés. Horaires de Paris, susceptibles de modification.", empty: "Aucun prochain passage média confirmé dans les sources consultées." },
  ];
  return <>
    {sections.map(section => <section className="container campaign-section" id={section.id} key={section.id}>
      <div className="section-heading"><div><p className="eyebrow">{section.label}</p><h2>{section.title}</h2></div><p>{section.description}</p></div>
      {section.result.error || candidates.error ? <p className="status" role="status">Impossible de charger cette rubrique pour le moment.</p>
        : !section.result.data?.length ? <p className="status">{section.empty}</p>
        : <div className="campaign-grid">{(section.result.data as Update[]).map(item => {
          const candidate = names.get(item.candidate_id);
          return <article className="card campaign-card" key={item.id}>
            {candidate && <a className="profile-link" href={`/candidats/${candidate.slug}`}>{candidate.display_name}</a>}
            {item.topic && section.kind === "proposal" && <p className="eyebrow">{item.topic}</p>}
            <h3>{item.title}</h3>
            {section.kind === "poll" && <>
              <p className="poll-value">{Number(item.value_percent).toLocaleString("fr-FR")} %</p>
              <p><strong>{metrics[item.metric_type ?? ""] ?? item.metric_type}</strong></p>
              <p>{item.scenario}</p>
              <dl className="poll-method">
                <dt>Institut</dt><dd>{item.institute}</dd>
                <dt>Commanditaire</dt><dd>{item.sponsor ?? "Non précisé"}</dd>
                <dt>Terrain</dt><dd>Du {date(item.fieldwork_start)} au {date(item.fieldwork_end)}</dd>
                <dt>Échantillon</dt><dd>{item.sample_size?.toLocaleString("fr-FR")} personnes · {item.population}</dd>
              </dl>
            </>}
            {section.kind === "appearance" && <p><strong>{item.media_name}</strong><br />{date(item.event_date)} · {item.event_at ? new Date(item.event_at).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }) : "Horaire non annoncé"}</p>}
            <p>{item.summary}</p>
            <div className="campaign-source">
              <a href={sourceUrl(item.source_url)} target="_blank" rel="noopener noreferrer">Source : {item.source_name}</a>
              <small>Publié le {date(item.published_at)} · Vérifié le {date(item.verified_at)}</small>
            </div>
          </article>;
        })}</div>}
    </section>)}
  </>;
}
