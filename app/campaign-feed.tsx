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
  // Never combine different surveys, populations, indicators or scenarios.
  const groups = new Map<string, Update[]>();
  for (const item of (polls.data ?? []) as Update[]) {
    const key = JSON.stringify([item.source_url, item.institute, item.sponsor, item.metric_type,
      item.scenario, item.title, item.published_at, item.fieldwork_start, item.fieldwork_end,
      item.sample_size, item.population]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return <>
    <section className="container campaign-section" id="sondages">
      <div className="section-heading"><div><p className="eyebrow">02 / LES SONDAGES</p><h2>La campagne en chiffres<span className="accent-dot">.</span></h2></div><p>Une enquête. Un scénario. Une photographie de l’opinion.</p></div>
      {polls.error || candidates.error ? <p className="status" role="status">Les sondages sont momentanément indisponibles.</p> : !groups.size ? <div className="empty-state"><span aria-hidden="true">▥</span><div><h3>Les chiffres arrivent</h3><p>Aucun sondage vérifié publié pour le moment.</p></div></div> : [...groups.entries()].map(([key, entries]) => {
        const first = entries[0];
        const sorted = [...entries].sort((a,b) => Number(b.value_percent) - Number(a.value_percent));
        return <article className="poll-panel" key={key}>
          <div className="poll-heading"><div><span className="tag subtle">{metrics[first.metric_type ?? ""] ?? first.metric_type}</span><h3>{first.title}</h3><p>{first.scenario}</p></div><div className="poll-stamp"><strong>{first.institute}</strong><span>Publié le {date(first.published_at)}</span></div></div>
          <div className="chart-caption"><span>Candidats suivis présents dans cette enquête</span><span>Échelle : 0–100 %</span></div>
          <ol className="poll-chart" aria-label={`${first.title}, ${first.scenario}`}>
            {sorted.map(item => {
              const candidate = names.get(item.candidate_id);
              const score = Number(item.value_percent);
              return <li className="chart-row" key={item.id}>
                <div className="chart-name">{candidate ? <a href={`/candidats/${candidate.slug}`}>{candidate.display_name}</a> : "Profil indisponible"}</div>
                <div className="chart-track" aria-hidden="true"><div className="chart-bar" style={{width: `${Math.max(0, Math.min(100,score))}%`}} /></div>
                <strong className="chart-value">{score.toLocaleString("fr-FR")} <small>%</small></strong>
              </li>;
            })}
          </ol>
          <details className="method-details"><summary>Méthode & source <span aria-hidden="true">＋</span></summary><dl className="poll-method"><dt>Commanditaire</dt><dd>{first.sponsor ?? "Non précisé"}</dd><dt>Terrain</dt><dd>Du {date(first.fieldwork_start)} au {date(first.fieldwork_end)}</dd><dt>Base analysée</dt><dd>{first.sample_size?.toLocaleString("fr-FR")} personnes · {first.population}</dd></dl><p>{first.summary}</p><a className="source-link" href={sourceUrl(first.source_url)} target="_blank" rel="noopener noreferrer">Consulter {first.source_name} ↗</a><small>Vérifié le {date(first.verified_at)}</small></details>
          <p className="chart-note">Un sondage n’est pas une prévision. Seuls les résultats d’un même scénario sont comparés ici.</p>
        </article>;
      })}
    </section>
    <div className="container editorial-columns">
      {[{ id: "propositions", label: "03 / LES IDÉES", title: "Ce qu’ils proposent", result: proposals, icon: "✦", empty: "Les propositions vérifiées apparaîtront ici.", emptyTitle: "Bientôt, les idées en clair" },
        { id: "agenda", label: "04 / LES RENDEZ-VOUS", title: "À voir, à écouter", result: appearances, icon: "◷", empty: "Aucun prochain passage média confirmé.", emptyTitle: "L’agenda se prépare" }].map(section => <section className="campaign-section" id={section.id} key={section.id}>
        <div className="section-heading"><div><p className="eyebrow">{section.label}</p><h2>{section.title}<span className="accent-dot">.</span></h2></div></div>
        {section.result.error || candidates.error ? <p className="status" role="status">Cette rubrique est momentanément indisponible.</p> : !section.result.data?.length ? <div className={`empty-state ${section.id === "agenda" ? "empty-mint" : "empty-peach"}`}><span aria-hidden="true">{section.icon}</span><div><h3>{section.emptyTitle}</h3><p>{section.empty}</p></div></div> : <div className="campaign-list">{(section.result.data as Update[]).map(item => {
          const candidate = names.get(item.candidate_id);
          return <article className="card campaign-card" key={item.id}>
            {candidate && <a className="profile-link" href={`/candidats/${candidate.slug}`}>{candidate.display_name}</a>}
            {item.topic && <span className="tag subtle">{item.topic}</span>}
            <h3>{item.title}</h3>
            {section.id === "agenda" && <p className="event-date"><strong>{date(item.event_date)}</strong> · {item.event_at ? new Date(item.event_at).toLocaleTimeString("fr-FR",{timeZone:"Europe/Paris",hour:"2-digit",minute:"2-digit"}) : "Horaire à confirmer"}<br />{item.media_name} · heure de Paris</p>}
            <details className="method-details"><summary>En savoir plus <span aria-hidden="true">＋</span></summary><p>{item.summary}</p><a className="source-link" href={sourceUrl(item.source_url)} target="_blank" rel="noopener noreferrer">{item.source_name} ↗</a><small>Publié le {date(item.published_at)} · Vérifié le {date(item.verified_at)}</small></details>
          </article>;
        })}</div>}
      </section>)}
    </div>
  </>;
}
