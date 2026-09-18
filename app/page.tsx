import { supabase } from "../lib/supabase";

type Candidate = {
  id: string;
  display_name: string;
  slug: string;
  party: string | null;
  image_url: string | null;
  image_credit: string | null;
  latest_quote: string | null;
  quote_date: string | null;
  quote_source_name: string | null;
  quote_source_url: string | null;
};

type PrimaryPreview = {
  name: string;
  first_round_date: string | null;
  second_round_date: string | null;
  summary: string | null;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
}

export default async function Home() {
  const [candidatesQuery, primaryQuery] = await Promise.all([
    supabase
      .from("candidates")
      .select(
        "id, display_name, slug, party, image_url, image_credit, latest_quote, quote_date, quote_source_name, quote_source_url"
      )
      .order("display_name"),
    supabase
      .from("selection_processes")
      .select("name, first_round_date, second_round_date, summary")
      .eq("slug", "choisir-2027")
      .maybeSingle(),
  ]);

  const candidates = candidatesQuery.data;
  const error = candidatesQuery.error;
  const primary = primaryQuery.data as PrimaryPreview | null;

  return (
    <main className="page">
      <header className="header">
        <div className="container nav">
          <div className="brand">Projet 2027</div>
          <nav>
            <a href="#candidats">Candidats</a>
            <a href="/primaires">Primaires</a>
            <a href="#propositions">Propositions</a>
            <a href="#sondages">Sondages</a>
            <a href="#agenda">Agenda</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <p className="eyebrow">POLITIQUE FRANÇAISE · SOURCES · HISTORIQUE</p>
          <h1>Comprendre la politique française, dans le temps.</h1>
          <p className="lead">
            Déclarations, propositions, primaires, sondages et événements, avec
            leurs dates et leurs sources.
          </p>
          <div className="actions">
            <a className="button primary" href="#candidats">Explorer les candidats</a>
            <a className="button secondary" href="/primaires">Suivre les primaires</a>
          </div>
        </div>
      </section>

      <section className="container candidates-section" id="candidats">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 · CANDIDATS</p>
            <h2>Les visages de la campagne</h2>
          </div>
          <p>
            Une phrase récente, datée et reliée à sa source — pas une citation
            sortie de son contexte.
          </p>
        </div>

        {error ? (
          <p className="status">Impossible de charger les candidats pour le moment.</p>
        ) : (
          <div className="candidate-grid">
            {(candidates as Candidate[] | null)?.map((candidate) => (
              <article className="candidate-card" key={candidate.id}>
                <div className="candidate-top">
                  {candidate.image_url ? (
                    <img
                      src={candidate.image_url}
                      alt={candidate.display_name}
                      className="candidate-photo"
                    />
                  ) : (
                    <div className="candidate-photo placeholder">
                      {candidate.display_name.charAt(0)}
                    </div>
                  )}
                  <div className="candidate-name">
                    <h3>
                      <a href={`/candidats/${candidate.slug}`}>
                        {candidate.display_name}
                      </a>
                    </h3>
                    <p>{candidate.party ?? "Candidature"}</p>
                  </div>
                </div>

                {candidate.latest_quote && (
                  <div className="quote-bubble">
                    <span>«</span>
                    <p>{candidate.latest_quote}</p>
                  </div>
                )}

                <div className="candidate-meta">
                  {candidate.quote_date && (
                    <span>{new Date(candidate.quote_date).toLocaleDateString("fr-FR")}</span>
                  )}
                  {candidate.quote_source_url && candidate.quote_source_name && (
                    <a href={candidate.quote_source_url} target="_blank" rel="noreferrer">
                      Source : {candidate.quote_source_name}
                    </a>
                  )}
                </div>

                <div className="candidate-actions">
                  <a className="profile-link" href={`/candidats/${candidate.slug}`}>
                    Voir la fiche et l’historique →
                  </a>
                </div>

                {candidate.image_credit && (
                  <p className="image-credit">{candidate.image_credit}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="container primaries-preview" id="primaires">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 · PRIMAIRES</p>
            <h2>Qui désigne qui ?</h2>
          </div>
          <p>
            Primaires et désignations officiellement annoncées, candidats,
            positionnements documentés et sondages avec leur méthode.
          </p>
        </div>

        <article className="primary-feature-card">
          <div>
            <div className="process-badges">
              <span className="tag">Primaire officielle</span>
              <span className="tag subtle">À venir</span>
            </div>
            <h3>{primary?.name ?? "Choisir 2027"}</h3>
            <p>
              {primary?.summary ??
                "Primaire de la gauche socialiste et démocratique organisée à l’automne 2026."}
            </p>
            <div className="process-dates">
              {primary?.first_round_date && (
                <span>1er tour : {formatDate(primary.first_round_date)}</span>
              )}
              {primary?.second_round_date && (
                <span>2d tour : {formatDate(primary.second_round_date)}</span>
              )}
            </div>
          </div>
          <div className="preview-action">
            <a className="button primary" href="/primaires">
              Voir les candidats et les données →
            </a>
            <small>
              Les intentions de vote nationales sont distinguées des sondages de primaire.
            </small>
          </div>
        </article>
      </section>

      <section className="container grid" id="propositions">
        <article className="card">
          <span className="number">03</span>
          <h2>Propositions</h2>
          <p>Les propositions classées par thème, date et source originale.</p>
        </article>
        <article className="card" id="sondages">
          <span className="number">04</span>
          <h2>Sondages</h2>
          <p>Les résultats et leur méthodologie, conservés pour suivre leur évolution.</p>
        </article>
        <article className="card" id="agenda">
          <span className="number">05</span>
          <h2>Agenda</h2>
          <p>Débats, interviews, meetings et principaux rendez-vous politiques.</p>
        </article>
      </section>

      <footer className="container footer">
        <p>Projet 2027 — première version</p>
        <p>Chaque information doit pouvoir remonter à sa source.</p>
      </footer>
    </main>
  );
}
