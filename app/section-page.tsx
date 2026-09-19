import PollResults from "./poll-results";
import { sourceUrl, sourceLinkTitle } from "../lib/source-url";
import { type PollUpdate, loadCurrentPolls, groupPolls, comparePollGroups, pollStage, stageLabels } from "../lib/polls";
import { connection } from "next/server";
import { supabase } from "../lib/supabase";
import { politicalTone } from "../lib/political-tone";
import SiteNav from "./site-nav";

export type SectionKey = "candidats" | "propositions" | "candidatures" | "sondages" | "agenda";

type Candidate = {
  id: string;
  display_name: string;
  slug: string;
  party: string | null;
  image_url: string | null;
  image_credit: string | null;
};

type Position = {
  id: string;
  candidate_id: string;
  topic: string;
  title: string;
  summary: string;
  position_date: string;
  source_name: string;
  source_url: string;
  source_excerpt: string | null;
  featured: boolean;
  highlight_value: string | null;
  highlight_label: string | null;
};

type Contender = {
  id: string;
  display_name: string;
  party: string | null;
  status: "declared" | "primary" | "potential" | "conditional";
  status_label: string;
  note: string;
  source_name: string;
  source_url: string;
  source_excerpt: string | null;
  as_of_date: string;
  image_url: string | null;
  image_credit: string | null;
};

type AgendaItem = {
  id: string;
  slug: string;
  sort_date: string;
  date_label: string;
  title: string;
  category: string;
  status: string;
  location: string | null;
  organizer: string | null;
  summary: string;
  source_name: string;
  source_url: string;
  source_excerpt: string | null;
  highlight: boolean;
  image_url: string | null;
  image_credit: string | null;
};

type PrimaryFace = {
  id: string;
  display_name: string;
  image_url: string | null;
};


const sectionMeta: Record<SectionKey, { eyebrow: string; title: string; lead: string; accent: string }> = {
  candidats: {
    eyebrow: "LES PERSONNALITÉS SUIVIES",
    title: "Les candidats, en clair.",
    lead: "Portraits, parti et accès direct aux positions concrètes de chaque personnalité suivie.",
    accent: "violet",
  },
  propositions: {
    eyebrow: "LES MESURES",
    title: "Ce qu’ils proposent vraiment.",
    lead: "Des mesures datées, résumées simplement et reliées à leur source d’origine.",
    accent: "coral",
  },
  candidatures: {
    eyebrow: "LA COURSE S’ÉLARGIT",
    title: "Candidats déclarés et hypothèses.",
    lead: "Une sélection non exhaustive, avec un statut clair pour distinguer déclaration, primaire et hypothèse.",
    accent: "mint",
  },
  sondages: {
    eyebrow: "LES CHIFFRES",
    title: "La campagne en données.",
    lead: "Des intentions de vote avec institut, terrain, échantillon et contexte méthodologique.",
    accent: "blue",
  },
  agenda: {
    eyebrow: "LES RENDEZ-VOUS",
    title: "L’agenda politique.",
    lead: "Débats, primaire, budget et échéances : date, visuel, contexte et source en un coup d’œil.",
    accent: "pink",
  },
};

const topicLabels: Record<string, string> = {
  "pouvoir-achat": "Pouvoir d’achat",
  fiscalite: "Impôts & taxes",
  immigration: "Immigration",
  "guerre-defense": "Guerre & défense",
  ecologie: "Écologie",
};

const categoryLabels: Record<string, string> = {
  debate: "Débat",
  primary: "Primaire",
  institutional: "Institutions",
  election: "Élection",
  meeting: "Rendez-vous",
  deadline: "Date limite",
  budget: "Budget",
};

const metrics: Record<string, string> = {
  presidential_vote_intention: "1er tour — intention de vote",
  presidential_second_round_vote_intention: "2e tour — duel hypothétique",
  primary_vote_intention: "Intention de vote à une primaire",
  favorability: "Opinion favorable",
  desired_participation: "Participation souhaitée",
};


function date(value: string | null) {
  if (!value) return "Non précisé";
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2);
}

function PageHero({ section }: { section: SectionKey }) {
  const meta = sectionMeta[section];

  return (
    <section className={`section-page-hero section-page-${meta.accent}`}>
      <div className="container section-page-hero-inner">
        <div>
          <p className="hero-badge">
            <span aria-hidden="true">✦</span> {meta.eyebrow}
          </p>
          <h1>{meta.title}</h1>
          <p>{meta.lead}</p>
        </div>
        <span className="section-page-number" aria-hidden="true">2027</span>
      </div>
    </section>
  );
}

function PageFooter() {
  return (
    <footer className="container footer">
      <a className="brand" href="/">Élections <span>2027</span></a>
      <p>Des faits datés, des sources à consulter.</p>
      <a href="#page-content">Retour en haut ↑</a>
    </footer>
  );
}

async function CandidatesContent() {
  const [candidatesQuery, positionsQuery] = await Promise.all([
    supabase
      .from("candidates")
      .select("id,display_name,slug,party,image_url,image_credit")
      .order("display_name"),
    supabase
      .from("current_candidate_positions")
      .select("id,candidate_id,topic,title,summary,position_date,source_name,source_url,source_excerpt,featured,highlight_value,highlight_label")
      .eq("verification_status", "verified")
      .eq("featured", true)
      .order("position_date", { ascending: false }),
  ]);

  const candidates = (candidatesQuery.data ?? []) as Candidate[];
  const positions = (positionsQuery.data ?? []) as Position[];
  const latest = new Map<string, Position>();

  for (const item of positions.filter((position) => position.highlight_value)) {
    if (!latest.has(item.candidate_id)) latest.set(item.candidate_id, item);
  }
  for (const item of positions) {
    if (!latest.has(item.candidate_id)) latest.set(item.candidate_id, item);
  }

  return (
    <section className="container section-page-content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PROFILS</p>
          <h2>{candidates.length} personnalités suivies<span className="accent-dot">.</span></h2>
        </div>
        <a className="button secondary" href="/comparer">Comparer leurs mesures →</a>
      </div>

      <div className="candidate-grid">
        {candidates.map((candidate) => {
          const position = latest.get(candidate.id);
          return (
            <article className={`candidate-card ${politicalTone(candidate.party)}`} key={candidate.id}>
              <a className="portrait-link" href={`/candidats/${candidate.slug}`}>
                <div className="portrait-backdrop" aria-hidden="true">2027</div>
                {candidate.image_url ? (
                  <img
                    src={candidate.image_url}
                    alt={candidate.display_name}
                    className={`candidate-photo candidate-photo-${candidate.slug}`}
                    width="360"
                    height="300"
                  />
                ) : (
                  <div className="candidate-photo placeholder">{candidate.display_name.charAt(0)}</div>
                )}
                <span className="portrait-arrow" aria-hidden="true">↗</span>
              </a>
              <div className="candidate-content">
                <p className="party-label">{candidate.party ?? "Personnalité suivie"}</p>
                <h3><a href={`/candidats/${candidate.slug}`}>{candidate.display_name}</a></h3>
                {position && (
                  <div className={`candidate-position-preview topic-${position.topic}`}>
                    <div className="position-preview-meta">
                      <span>{topicLabels[position.topic] ?? position.topic}</span>
                      <time>{date(position.position_date)}</time>
                    </div>
                    {position.highlight_value && (
                      <div className="candidate-key-number">
                        <strong>{position.highlight_value}</strong>
                        <span>{position.highlight_label}</span>
                      </div>
                    )}
                    <h4>{position.title}</h4>
                  </div>
                )}
                <a className="profile-link candidate-button" href={`/candidats/${candidate.slug}`}>
                  Ouvrir la fiche <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

async function ProposalsContent() {
  const [positionsQuery, candidatesQuery] = await Promise.all([
    supabase
      .from("current_candidate_positions")
      .select("id,candidate_id,topic,title,summary,position_date,source_name,source_url,source_excerpt,featured,highlight_value,highlight_label")
      .eq("verification_status", "verified")
      .order("position_date", { ascending: false }),
    supabase
      .from("candidates")
      .select("id,display_name,slug,party,image_url,image_credit"),
  ]);

  const positions = (positionsQuery.data ?? []) as Position[];
  const candidates = (candidatesQuery.data ?? []) as Candidate[];
  const names = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const topics = ["pouvoir-achat", "fiscalite", "immigration", "guerre-defense", "ecologie"];

  return (
    <section className="container section-page-content">
      <div className="page-topic-rail" aria-label="Thèmes">
        {topics.map((topic) => (
          <a href={`#${topic}`} key={topic}>{topicLabels[topic]}</a>
        ))}
      </div>

      <div className="proposal-topic-sections">
        {topics.map((topic) => {
          const items = positions.filter((position) => position.topic === topic);
          return (
            <section className={`proposal-topic-block topic-${topic}`} id={topic} key={topic}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">THÈME</p>
                  <h2>{topicLabels[topic]}</h2>
                </div>
                <span className="section-chip">{items.length} positions</span>
              </div>
              <div className="proposal-spotlight-grid">
                {items.map((position) => {
                  const candidate = names.get(position.candidate_id);
                  return (
                    <article className={`proposal-spotlight-card topic-${topic}`} key={position.id}>
                      <div className="proposal-person">
                        {candidate?.image_url ? (
                          <img src={candidate.image_url} alt="" width="48" height="48" />
                        ) : (
                          <span>{initials(candidate?.display_name ?? "?")}</span>
                        )}
                        <div>
                          <a href={candidate ? `/candidats/${candidate.slug}` : "#"}>
                            {candidate?.display_name ?? "Candidat suivi"}
                          </a>
                          <small>{topicLabels[topic]}</small>
                        </div>
                      </div>
                      {position.highlight_value && (
                        <div className="proposal-number">
                          <strong>{position.highlight_value}</strong>
                          <span>{position.highlight_label}</span>
                        </div>
                      )}
                      <h3>{position.title}</h3>
                      <p>{position.summary}</p>
                      <div className="proposal-source">
                        <time>{date(position.position_date)}</time>
                        <a href={sourceUrl(position.source_url, position.source_excerpt)} title={sourceLinkTitle(position.source_excerpt)} target="_blank" rel="noopener noreferrer">
                          {position.source_name} ↗
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

async function ContendersContent() {
  const query = await supabase
    .from("current_contender_watch")
    .select("id,display_name,party,status,status_label,note,source_name,source_url,source_excerpt,as_of_date,image_url,image_credit")
    .order("sort_order", { ascending: true });

  const contenders = (query.data ?? []) as Contender[];

  return (
    <section className="container section-page-content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">STATUTS DOCUMENTÉS</p>
          <h2>{contenders.length} profils à suivre<span className="accent-dot">.</span></h2>
        </div>
        <p>Les statuts décrivent la situation publique connue ; ils ne constituent pas une prévision.</p>
      </div>

      <div className="contender-grid">
        {contenders.map((person, index) => (
          <article className={`contender-card contender-${person.status} ${politicalTone(person.party)}`} key={person.id}>
            <div className="contender-top">
              {person.image_url ? (
                <img className="contender-photo" src={person.image_url} alt={person.display_name} width="66" height="66" />
              ) : (
                <span className="contender-initials">{initials(person.display_name)}</span>
              )}
              <span className="contender-status">{person.status_label}</span>
            </div>
            <h3>{person.display_name}</h3>
            {person.party && <p className="contender-party">{person.party}</p>}
            <p className="contender-note">{person.note}</p>
            <div className="contender-footer">
              <time>Mis à jour {date(person.as_of_date)}</time>
              <a href={sourceUrl(person.source_url, person.source_excerpt)} title={sourceLinkTitle(person.source_excerpt)} target="_blank" rel="noopener noreferrer">Source ↗</a>
            </div>
            <span className="contender-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

async function AgendaContent() {

  const [agendaQuery, primaryQuery] = await Promise.all([
    supabase
      .from("current_political_agenda")
      .select("id,slug,sort_date,date_label,title,category,status,location,organizer,summary,source_name,source_url,source_excerpt,highlight,image_url,image_credit")

      .order("sort_date", { ascending: true }),
    supabase
      .from("selection_candidates")
      .select("id,display_name,image_url")
      .in("display_name", ["Raphaël Glucksmann", "Olivier Faure", "Jérôme Guedj", "Emmanuel Maurel", "Ségolène Royal"])
      .order("sort_order", { ascending: true }),
  ]);

  const agenda = (agendaQuery.data ?? []) as AgendaItem[];
  const faces = (primaryQuery.data ?? []) as PrimaryFace[];

  const symbols: Record<string, string> = {
    budget: "€",
    institutional: "◆",
    election: "✓",
    deadline: "◷",
    meeting: "●",
    debate: "✦",
    primary: "◎",
  };

  return (
    <section className="container section-page-content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PROCHAINES DATES</p>
          <h2>{agenda.length} rendez-vous suivis<span className="accent-dot">.</span></h2>
        </div>
        <p>Une carte = une date, un événement, un contexte court et une source.</p>
      </div>

      <div className="agenda-list-v2 agenda-page-list">
        {agenda.map((item) => (
          <article className={`agenda-card-v2 agenda-${item.category} ${item.highlight ? "agenda-highlight" : ""}`} key={item.id}>
            <div className="agenda-date-box">
              <span>{categoryLabels[item.category] ?? item.category}</span>
              <strong>{item.date_label}</strong>
            </div>

            <div className="agenda-visual" aria-hidden="true">
              {item.image_url ? (
                <img src={item.image_url} alt="" width="112" height="112" />
              ) : item.category === "debate" || item.category === "primary" ? (
                <div className="agenda-face-stack">
                  {faces.slice(0, 5).map((person) =>
                    person.image_url ? <img src={person.image_url} alt="" width="48" height="48" key={person.id} /> : null
                  )}
                </div>
              ) : (
                <span className="agenda-symbol">{symbols[item.category] ?? "•"}</span>
              )}
            </div>

            <div className="agenda-content-v2">
              <div className="agenda-status-row">
                {item.status === "ongoing" && <span className="live-pill">EN COURS</span>}
                {item.status === "date_tbc" && <span className="tbc-pill">DATE À PRÉCISER</span>}
                {item.organizer && <small>{item.organizer}</small>}
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <div className="agenda-meta-v2">
                {item.location && <span>{item.location}</span>}
                <a href={sourceUrl(item.source_url, item.source_excerpt)} title={sourceLinkTitle(item.source_excerpt)} target="_blank" rel="noopener noreferrer">
                  {item.source_name} ↗
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

async function PollsContent() {
  const [pollsQuery, candidatesQuery] = await Promise.all([
    loadCurrentPolls(),
    supabase
      .from("candidates")
      .select("id,display_name,slug,party,image_url,image_credit"),
  ]);

  if (pollsQuery.error) return <p className="container status" role="status">Les sondages sont momentanément indisponibles.</p>;
  const polls = (pollsQuery.data ?? []) as PollUpdate[];
  const candidates = (candidatesQuery.data ?? []) as Candidate[];
  const names = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const groups = groupPolls(polls);

  return (
    <section className="container section-page-content">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SONDAGES VÉRIFIÉS</p>
          <h2>{groups.size} scénarios affichés<span className="accent-dot">.</span></h2>
        </div>
        <p>Un sondage décrit un état de l’opinion à un instant donné ; il ne prédit pas le résultat final.</p>
      </div>

      <div className="poll-page-stack">
        {[...groups.entries()].sort(comparePollGroups).map(([key, entries]) => {
          const first = entries[0];
          const sorted = [...entries].sort((a, b) => Number(b.value_percent) - Number(a.value_percent));

          return (
            <article className="poll-panel poll-panel-v2" key={key}>
              <div className="poll-heading">
                <div>
                  <span className="tag subtle">{metrics[first.metric_type ?? ""] ?? first.metric_type}</span>
                  <p className="eyebrow">{stageLabels[pollStage(first.metric_type)]}</p><h3>{first.title}</h3>
                  <p>{first.scenario}</p>
                </div>
                <div className="poll-stamp">
                  <strong>{first.institute}</strong>
                  <span>Publié le {date(first.published_at)}</span>
                </div>
              </div>

              <PollResults entries={sorted} candidates={candidates} title={first.title} />

              <details className="method-details">
                <summary>Méthode & source <span aria-hidden="true">＋</span></summary>
                <dl className="poll-method">
                  <dt>Commanditaire</dt><dd>{first.sponsor ?? "Non précisé"}</dd>
                  <dt>Terrain</dt><dd>Du {date(first.fieldwork_start)} au {date(first.fieldwork_end)}</dd>
                  <dt>Base</dt><dd>{first.sample_size?.toLocaleString("fr-FR")} personnes · {first.population}</dd>
                </dl>
                <a className="source-link" href={sourceUrl(first.source_url, first.source_excerpt)} title={sourceLinkTitle(first.source_excerpt)} target="_blank" rel="noopener noreferrer">
                  Consulter {first.source_name} ↗
                </a>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default async function SectionPage({ section }: { section: SectionKey }) {
  await connection();

  return (
    <main className={`page standalone-section-page standalone-${section}`} id="page-content">
      <SiteNav />
      <PageHero section={section} />

      {section === "candidats" && <CandidatesContent />}
      {section === "propositions" && <ProposalsContent />}
      {section === "candidatures" && <ContendersContent />}
      {section === "sondages" && <PollsContent />}
      {section === "agenda" && <AgendaContent />}

      <PageFooter />
    </main>
  );
}
