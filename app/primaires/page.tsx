import { connection } from "next/server";
import { supabase } from "../../lib/supabase";

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
  candidature_status: string;
  result_percent: number | null;
  result_note: string | null;
  sort_order: number;
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
  note: string | null;
  published_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
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

function pollValue(poll: PollIndicator) {
  if (poll.value_min !== null && poll.value_max !== null) {
    if (poll.value_min === poll.value_max) return `${poll.value_min.toLocaleString("fr-FR")}%`;
    return `${poll.value_min.toLocaleString("fr-FR")}–${poll.value_max.toLocaleString("fr-FR")}%`;
  }
  if (poll.value_percent !== null) return `${poll.value_percent.toLocaleString("fr-FR")}%`;
  return "—";
}

export default async function PrimairesPage() {
  await connection();
  const [processesQuery, candidatesQuery, pollsQuery] = await Promise.all([
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

  return (
    <main className="page">
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">Élections 2027</a>
          <nav>
            <a href="/#candidats">Candidats</a>
            <a href="/primaires">Primaires</a>
            <a href="/#propositions">Propositions</a>
            <a href="/#sondages">Sondages</a>
            <a href="/#agenda">Agenda</a>
          </nav>
        </div>
      </header>

      <section className="container primary-page-hero">
        <p className="eyebrow">PRIMAIRES · DÉSIGNATIONS · SOURCES</p>
        <h1 className="profile-title">Qui sera désigné ?</h1>
        <p className="lead">
          Les candidats, les dates clés et les résultats officiels.
        </p>
      </section>

      <section className="container methodology-note">
        <strong>Lecture des sondages.</strong>
        <p>
          Un indicateur national mesure la présidentielle, pas les chances de gagner une primaire.
        </p>
      </section>

      <section className="container process-list">
        {processes.map((process) => {
          const processCandidates = candidates.filter(
            (candidate) => candidate.process_id === process.id
          );

          return (
            <article className="process-card" key={process.id}>
              <div className="process-heading">
                <div>
                  <div className="process-badges">
                    <span className="tag">{processTypeLabel(process.process_type)}</span>
                    <span className="tag subtle">{statusLabel(process.status)}</span>
                  </div>
                  <h2>{process.name}</h2>
                  <p className="process-organizers">{process.organizers.join(" · ")}</p>
                </div>

                <a
                  className="button secondary"
                  href={process.official_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source officielle
                </a>
              </div>

              {process.summary && <p className="process-summary">{process.summary}</p>}

              <div className="process-dates">
                {process.first_round_date && (
                  <span>Début / 1er tour : {formatDate(process.first_round_date)}</span>
                )}
                {process.second_round_date && (
                  <span>2d tour : {formatDate(process.second_round_date)}</span>
                )}
                {process.result_date && (
                  <span>Résultat : {formatDate(process.result_date)}</span>
                )}
              </div>

              <div className="primary-candidate-grid">
                {processCandidates.map((candidate) => {
                  const poll = polls.find(
                    (item) =>
                      item.process_id === process.id &&
                      item.candidate_name === candidate.display_name
                  );

                  return (
                    <div className="primary-candidate-card" key={candidate.id}>
                      <div className="candidate-initial">
                        {candidate.display_name
                          .split(" ")
                          .map((part) => part.charAt(0))
                          .join("")
                          .slice(0, 2)}
                      </div>

                      <div className="primary-candidate-main">
                        <p className="candidate-party">{candidate.party}</p>
                        <h3>{candidate.display_name}</h3>

                        {candidate.positioning_label && (
                          <p className="position-label">{candidate.positioning_label}</p>
                        )}

                        {candidate.positioning_summary && (
                          <details className="method-details"><summary>Son positionnement <span aria-hidden="true">＋</span></summary><p className="position-summary">{candidate.positioning_summary}</p></details>
                        )}

                        <div className="candidate-data-box">
                          {candidate.result_percent !== null ? (
                            <>
                              <span className="data-label">Résultat officiel</span>
                              <strong>
                                {candidate.result_percent.toLocaleString("fr-FR")}%
                              </strong>
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
                              <span className="data-label">
                                Indicateur national — présidentielle
                              </span>
                              <strong>{pollValue(poll)}</strong>
                              <small>
                                {poll.institute}
                                {poll.fieldwork_start && poll.fieldwork_end
                                  ? ` · terrain du ${formatDate(poll.fieldwork_start)} au ${formatDate(
                                      poll.fieldwork_end
                                    )}`
                                  : ""}
                                {poll.sample_size
                                  ? ` · ${poll.sample_size.toLocaleString("fr-FR")} personnes`
                                  : ""}
                              </small>
                              {poll.note && <small>{poll.note}</small>}
                              <a
                                href={poll.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="source-link"
                              >
                                Voir le sondage
                              </a>
                            </>
                          ) : (
                            <>
                              <span className="data-label">Sondage comparable</span>
                              <strong>Non disponible</strong>
                              <small>
                                Pas de donnée comparable publiée ici.
                              </small>
                            </>
                          )}
                        </div>

                        {candidate.positioning_source_url && (
                          <a
                            href={candidate.positioning_source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="source-link"
                          >
                            Source du positionnement
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <section className="container methodology-note secondary-note">
        <strong>Ce qui n’apparaît pas comme « officiel ».</strong>
        <p>
          Une primaire seulement proposée dans les médias ou réclamée par une
          personnalité n’est ajoutée à cette liste qu’une fois ses organisateurs, ses
          règles ou son calendrier formellement actés.
        </p>
      </section>

      <footer className="container footer">
        <p>Élections 2027 — primaires et désignations sourcées</p>
        <p>Pas de probabilité fabriquée : données publiées, dates et méthode.</p>
      </footer>
    </main>
  );
}
