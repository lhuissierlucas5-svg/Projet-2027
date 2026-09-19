import { sourceUrl, sourceLinkTitle } from "../../lib/source-url";
import { connection } from "next/server";
import { supabase } from "../../lib/supabase";
import SiteNav from "../site-nav";

type Process = {
  id: string;
  slug: string;
  name: string;
  process_type: "primary" | "internal_selection" | "consultation";
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  organizers: string[];
  first_round_date: string | null;
  second_round_date: string | null;
  result_date: string | null;
  official_url: string;
  source_excerpt: string | null;
  summary: string | null;
};

type SelectionCandidate = {
  id: string;
  process_id: string;
  display_name: string;
  party: string | null;
  positioning_label: string | null;
  positioning_summary: string | null;
  positioning_source_url: string | null;
  source_excerpt: string | null;
  candidature_status: "confirmed" | "withdrawn" | "winner" | "eliminated";
  result_percent: number | null;
  result_note: string | null;
  sort_order: number;
  image_url: string | null;
  image_credit: string | null;
};

type ProcessWatch = {
  id: string;
  slug: string;
  title: string;
  status_label: string;
  scope_label: string;
  summary: string;
  proponents: string[];
  opponents_or_reservations: string[];
  source_name: string;
  source_url: string;
  source_excerpt: string | null;
  as_of_date: string;
};

type PollIndicator = {
  id: string;
  process_id: string;
  candidate_name: string;
  institute: string;
  sponsor: string | null;
  metric_type: string;
  value_percent: number | null;
  value_min: number | null;
  value_max: number | null;
  fieldwork_start: string | null;
  fieldwork_end: string | null;
  sample_size: number | null;
  population: string | null;
  source_url: string;
  source_excerpt: string | null;
  note: string | null;
  published_at: string | null;
};

function formatDate(value: string | null, short = false) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", short
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "long", year: "numeric" });
}

function statusLabel(status: Process["status"]) {
  if (status === "completed") return "Terminée";
  if (status === "ongoing") return "En cours";
  if (status === "upcoming") return "À venir";
  return "Annulée";
}

function processTypeLabel(type: Process["process_type"]) {
  if (type === "primary") return "Primaire officielle";
  if (type === "internal_selection") return "Désignation interne";
  return "Consultation";
}

function candidatureLabel(status: SelectionCandidate["candidature_status"]) {
  if (status === "winner") return "Désigné";
  if (status === "eliminated") return "Non désigné";
  if (status === "withdrawn") return "Retiré";
  return "En lice";
}

function processTheme(slug: string) {
  if (slug === "choisir-2027") return "process-lilac";
  if (slug === "ecologistes-2025") return "process-mint";
  if (slug === "lr-2026") return "process-blue";
  return "process-neutral";
}

function processShortName(process: Process) {
  if (process.slug === "choisir-2027") return "Choisir 2027";
  if (process.slug === "ecologistes-2025") return "Les Écologistes";
  if (process.slug === "lr-2026") return "Les Républicains";
  return process.name;
}

function pollValue(poll: PollIndicator) {
  if (poll.value_min !== null && poll.value_max !== null) {
    if (poll.value_min === poll.value_max) {
      return `${poll.value_min.toLocaleString("fr-FR")}%`;
    }
    return `${poll.value_min.toLocaleString("fr-FR")}–${poll.value_max.toLocaleString("fr-FR")}%`;
  }
  if (poll.value_percent !== null) {
    return `${poll.value_percent.toLocaleString("fr-FR")}%`;
  }
  return "—";
}

export default async function PrimairesPage() {
  await connection();

  const [processesQuery, candidatesQuery, pollsQuery, processWatchQuery] = await Promise.all([
    supabase
      .from("selection_processes")
      .select("*")
      .order("first_round_date", { ascending: false }),
    supabase
      .from("selection_candidates")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("selection_poll_indicators")
      .select("*")
      .order("published_at", { ascending: false }),
    supabase
      .from("selection_process_watch")
      .select("*")
      .order("as_of_date", { ascending: false }),
  ]);

  const processes = ((processesQuery.data ?? []) as Process[]).sort((a, b) => {
    const rank = { ongoing: 0, upcoming: 0, completed: 1, cancelled: 2 };
    const statusDifference = rank[a.status] - rank[b.status];
    if (statusDifference !== 0) return statusDifference;

    const dateA = a.first_round_date ?? a.result_date ?? "1900-01-01";
    const dateB = b.first_round_date ?? b.result_date ?? "1900-01-01";
    return dateB.localeCompare(dateA);
  });

  const candidates = (candidatesQuery.data ?? []) as SelectionCandidate[];
  const polls = (pollsQuery.data ?? []) as PollIndicator[];
  const processWatch = (processWatchQuery.data ?? []) as ProcessWatch[];
  const nextProcess = processes.find(
    (process) => process.status === "ongoing" || process.status === "upcoming"
  );

  return (
    <main className="page primary-page">
      <a className="skip-link" href="#processus">Aller aux processus</a>

      <SiteNav />

      <section className="primary-hero">
        <div className="container primary-hero-grid">
          <div>
            <p className="hero-badge">
              <span aria-hidden="true">✦</span> PRIMAIRES & DÉSIGNATIONS
            </p>
            <h1>Comment les candidats sont-ils désignés ?</h1>
            <p className="lead">
              Les processus officiels, les personnes en lice, les dates et les
              résultats — avec les sources pour vérifier.
            </p>
          </div>

          <div className="primary-overview" aria-label="Vue d’ensemble">
            <div>
              <strong>{processes.length}</strong>
              <span>processus suivis</span>
            </div>
            <div>
              <strong>{candidates.length}</strong>
              <span>candidatures recensées</span>
            </div>
            <div className="overview-next">
              <span>Prochaine échéance</span>
              <strong>
                {nextProcess?.first_round_date
                  ? formatDate(nextProcess.first_round_date, true)
                  : "À confirmer"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div className="container primary-jump-nav" aria-label="Accès rapide aux processus">
        {processes.map((process) => (
          <a href={`#${process.slug}`} key={process.id}>
            <span className={`jump-dot ${processTheme(process.slug)}`} aria-hidden="true" />
            <span>
              <strong>{processShortName(process)}</strong>
              <small>{statusLabel(process.status)}</small>
            </span>
          </a>
        ))}
      </div>

      <section className="container poll-explainer">
        <span className="explainer-icon" aria-hidden="true">i</span>
        <div>
          <strong>Bien lire les chiffres</strong>
          <p>
            Un sondage présidentiel national n’est pas une probabilité de gagner une primaire.
            Quand aucun sondage du corps électoral de la primaire n’est disponible, la page le dit explicitement.
          </p>
        </div>
      </section>

      <section className="container process-list primary-process-list" id="processus">
        {processes.map((process, processIndex) => {
          const processCandidates = candidates.filter(
            (candidate) => candidate.process_id === process.id
          );
          const theme = processTheme(process.slug);

          return (
            <article
              className={`process-card primary-process-card ${theme}`}
              key={process.id}
              id={process.slug}
            >
              <div className="process-accent" aria-hidden="true" />

              <div className="process-heading primary-process-heading">
                <div className="process-index" aria-hidden="true">
                  {String(processIndex + 1).padStart(2, "0")}
                </div>

                <div className="process-title-block">
                  <div className="process-badges">
                    <span className="tag process-tag">
                      {processTypeLabel(process.process_type)}
                    </span>
                    <span className="tag subtle">
                      {statusLabel(process.status)}
                    </span>
                  </div>
                  <h2>{process.name}</h2>
                  <p className="process-organizers">{process.organizers.join(" · ")}</p>
                </div>

                <a
                  className="button secondary process-source-button"
                  href={sourceUrl(process.official_url, process.source_excerpt)} title={sourceLinkTitle(process.source_excerpt)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source officielle ↗
                </a>
              </div>

              <div className="process-info-grid">
                <div className="process-timeline" aria-label="Dates clés">
                  {process.first_round_date && (
                    <div>
                      <span>1er tour</span>
                      <strong>{formatDate(process.first_round_date, true)}</strong>
                    </div>
                  )}
                  {process.second_round_date && (
                    <div>
                      <span>2d tour</span>
                      <strong>{formatDate(process.second_round_date, true)}</strong>
                    </div>
                  )}
                  {process.result_date && (
                    <div>
                      <span>Résultat</span>
                      <strong>{formatDate(process.result_date, true)}</strong>
                    </div>
                  )}
                </div>

                {process.summary && (
                  <details className="process-rules">
                    <summary>
                      Comment fonctionne ce processus ?
                      <span aria-hidden="true">＋</span>
                    </summary>
                    <p>{process.summary}</p>
                  </details>
                )}
              </div>

              <div className="primary-candidate-grid primary-candidate-grid-v2">
                {processCandidates.map((candidate) => {
                  const poll = polls.find(
                    (item) =>
                      item.process_id === process.id &&
                      item.candidate_name === candidate.display_name
                  );

                  return (
                    <article className="primary-candidate-card primary-candidate-card-v2" key={candidate.id}>
                      <div className="primary-candidate-head">
                        <div className="primary-avatar-wrap">
                          {candidate.image_url ? (
                            <img
                              src={candidate.image_url}
                              alt={candidate.display_name}
                              className="primary-avatar"
                              loading="lazy"
                              width="76"
                              height="76"
                            />
                          ) : (
                            <div className="primary-avatar primary-avatar-fallback" aria-hidden="true">
                              {candidate.display_name
                                .split(" ")
                                .map((part) => part.charAt(0))
                                .join("")
                                .slice(0, 2)}
                            </div>
                          )}
                          <span className="avatar-status" aria-hidden="true" />
                        </div>

                        <div className="primary-candidate-identity">
                          <p className="candidate-party">{candidate.party ?? "Candidature"}</p>
                          <h3>{candidate.display_name}</h3>
                          <span className={`candidate-status candidate-status-${candidate.candidature_status}`}>
                            {candidatureLabel(candidate.candidature_status)}
                          </span>
                        </div>
                      </div>

                      {candidate.positioning_label && (
                        <p className="position-label position-pill">
                          {candidate.positioning_label}
                        </p>
                      )}

                      <div className="candidate-data-box candidate-data-box-v2">
                        {candidate.result_percent !== null ? (
                          <>
                            <span className="data-label">Résultat officiel</span>
                            <strong>{candidate.result_percent.toLocaleString("fr-FR")}%</strong>
                            {candidate.result_note && <small>{candidate.result_note}</small>}
                          </>
                        ) : candidate.candidature_status === "winner" && candidate.result_note ? (
                          <>
                            <span className="data-label">Désignation officielle</span>
                            <strong>Candidat désigné</strong>
                            <small>{candidate.result_note}</small>
                          </>
                        ) : poll ? (
                          <>
                            <span className="data-label">Indicateur national — présidentielle</span>
                            <strong>{pollValue(poll)}</strong>
                            <span className="metric-warning">≠ sondage de primaire</span>
                            <small>
                              {poll.institute}
                              {poll.fieldwork_start && poll.fieldwork_end
                                ? ` · ${formatDate(poll.fieldwork_start, true)}–${formatDate(
                                    poll.fieldwork_end,
                                    true
                                  )}`
                                : ""}
                              {poll.sample_size
                                ? ` · ${poll.sample_size.toLocaleString("fr-FR")} personnes`
                                : ""}
                            </small>
                            <a
                              href={sourceUrl(poll.source_url, poll.source_excerpt)} title={sourceLinkTitle(poll.source_excerpt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-link"
                            >
                              Méthode & source ↗
                            </a>
                          </>
                        ) : (
                          <>
                            <span className="data-label">Sondage comparable</span>
                            <strong className="data-empty">Non disponible</strong>
                            <small>Aucune donnée comparable publiée ici.</small>
                          </>
                        )}
                      </div>

                      {candidate.positioning_summary && (
                        <details className="method-details position-details">
                          <summary>
                            Voir le positionnement
                            <span aria-hidden="true">＋</span>
                          </summary>
                          <p>{candidate.positioning_summary}</p>
                          {candidate.positioning_source_url && (
                            <a
                              href={sourceUrl(candidate.positioning_source_url, candidate.source_excerpt)} title={sourceLinkTitle(candidate.source_excerpt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-link"
                            >
                              Source du positionnement ↗
                            </a>
                          )}
                        </details>
                      )}

                      {candidate.image_credit && (
                        <p className="primary-photo-credit">Photo : {candidate.image_credit}</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      {processWatch.length > 0 && (
        <section className="container process-watch-section" aria-labelledby="process-watch-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">À SURVEILLER</p>
              <h2 id="process-watch-title">Processus envisagés, pas encore officiels<span className="accent-dot">.</span></h2>
            </div>
            <p>
              Cette zone suit les discussions publiques sans présenter une hypothèse comme une primaire actée.
            </p>
          </div>

          <div className="process-watch-grid">
            {processWatch.map((watch) => (
              <article className="process-watch-card" key={watch.id}>
                <div className="process-watch-topline">
                  <span className="tag process-watch-tag">{watch.status_label}</span>
                  <span className="tag subtle">{watch.scope_label}</span>
                </div>

                <h3>{watch.title}</h3>
                <p>{watch.summary}</p>

                <div className="process-watch-columns">
                  {watch.proponents.length > 0 && (
                    <div>
                      <span>Partisans / promoteurs</span>
                      <strong>{watch.proponents.join(" · ")}</strong>
                    </div>
                  )}
                  {watch.opponents_or_reservations.length > 0 && (
                    <div>
                      <span>Réserves documentées</span>
                      <strong>{watch.opponents_or_reservations.join(" · ")}</strong>
                    </div>
                  )}
                </div>

                <div className="process-watch-footer">
                  <time dateTime={watch.as_of_date}>État au {formatDate(watch.as_of_date)}</time>
                  <a
                    href={sourceUrl(watch.source_url, watch.source_excerpt)} title={sourceLinkTitle(watch.source_excerpt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    {watch.source_name} ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="container methodology-note secondary-note primary-footnote">
        <strong>Notre règle d’affichage</strong>
        <p>
          Un processus n’est présenté comme officiel que lorsque ses organisateurs,
          ses règles ou son calendrier sont formellement actés. Les données de sondage
          restent associées à leur institut, leur période de terrain et leur population.
        </p>
      </section>

      <footer className="container footer">
        <a className="brand" href="/">Élections <span>2027</span></a>
        <p>Des processus politiques expliqués simplement, avec leurs sources.</p>
        <a href="#processus">Retour en haut ↑</a>
      </footer>
    </main>
  );
}
