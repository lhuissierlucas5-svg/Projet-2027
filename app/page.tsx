import CampaignFeed from "./campaign-feed";
import { connection } from "next/server";
import { supabase } from "../lib/supabase";

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
};

function date(value: string | null) {
  return value
    ? new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Europe/Paris",
      })
    : null;
}

function topicLabel(topic: string) {
  const labels: Record<string, string> = {
    "pouvoir-achat": "Pouvoir d’achat",
    fiscalite: "Impôts & taxes",
    immigration: "Immigration",
    "guerre-defense": "Guerre & défense",
    ecologie: "Écologie",
  };
  return labels[topic] ?? topic;
}

export default async function Home() {
  await connection();

  const [candidatesQuery, primaryQuery, positionsQuery] = await Promise.all([
    supabase
      .from("candidates")
      .select("id,display_name,slug,party,image_url,image_credit")
      .order("display_name"),
    supabase
      .from("selection_processes")
      .select("name,first_round_date,second_round_date,status")
      .eq("slug", "choisir-2027")
      .maybeSingle(),
    supabase
      .from("candidate_positions")
      .select("id,candidate_id,topic,title,summary,position_date,source_name,source_url")
      .eq("verification_status", "verified")
      .eq("featured", true)
      .order("position_date", { ascending: false }),
  ]);

  const candidates = (candidatesQuery.data ?? []) as Candidate[];
  const positions = (positionsQuery.data ?? []) as Position[];
  const primary = primaryQuery.data;
  const status: Record<string, string> = {
    upcoming: "À venir",
    ongoing: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
  };

  const latestPosition = new Map<string, Position>();
  for (const position of positions) {
    if (!latestPosition.has(position.candidate_id)) {
      latestPosition.set(position.candidate_id, position);
    }
  }

  return (
    <main className="page">
      <a className="skip-link" href="#candidats">Aller au contenu</a>

      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            Élections <span>2027</span>
            <span className="brand-dot" aria-hidden="true" />
          </a>
          <nav aria-label="Navigation principale">
            <a href="#candidats">Candidats</a>
            <a href="/primaires">Primaires</a>
            <a href="#propositions">Propositions</a>
            <a href="#sondages">Sondages</a>
            <a href="#agenda" className="nav-agenda">Agenda ↗</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <p className="hero-badge">
              <span aria-hidden="true">✦</span> LE REPÈRE DE LA PRÉSIDENTIELLE
            </p>
            <h1>2027.<br />Les idées.<br /><em>Votre regard.</em></h1>
            <p className="lead">
              Candidats, propositions, sondages.<br />
              L’essentiel pour vous faire votre opinion.
            </p>
            <div className="actions">
              <a className="button primary" href="#candidats">
                Découvrir les candidats <span aria-hidden="true">↗</span>
              </a>
              <a className="button secondary" href="#sondages">
                Voir les sondages <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className="hero-footnote">Des faits datés. Des sources à consulter.</p>
          </div>

          <div className="hero-visual" aria-label="Explorer la campagne">
            <div className="orbit orbit-one" aria-hidden="true" />
            <div className="orbit orbit-two" aria-hidden="true" />
            <div className="election-tile">
              <span>PRÉSIDENTIELLE</span>
              <strong>
                20<br />27<span className="tile-star" aria-hidden="true">✳</span>
              </strong>
              <small>Comprendre. Comparer. Choisir.</small>
            </div>
            <a href="#sondages" className="visual-note note-polls">
              <span className="note-icon" aria-hidden="true">▥</span>
              <span><strong>Prendre le pouls</strong><small>Les chiffres, avec leur contexte</small></span>
              <span aria-hidden="true">↗</span>
            </a>
            <a href="#candidats" className="visual-note note-people">
              <span className="avatar-stack" aria-hidden="true">
                {candidates.slice(0, 3).map((candidate) => (
                  <span key={candidate.id}>
                    {candidate.image_url ? (
                      <img src={candidate.image_url} alt="" width="40" height="40" />
                    ) : (
                      candidate.display_name.charAt(0)
                    )}
                  </span>
                ))}
              </span>
              <span>
                <strong>
                  {candidatesQuery.error ? "Les candidats" : `${candidates.length} profils à explorer`}
                </strong>
                <small>Mesures & positions concrètes</small>
              </span>
            </a>
            <span className="visual-spark" aria-hidden="true">✳</span>
          </div>
        </div>
      </section>

      <div className="container quick-paths" aria-label="Explorer par rubrique">
        <a href="#propositions">
          <span className="path-icon peach" aria-hidden="true">✦</span>
          <span><strong>Les idées</strong><small>Ce qu’ils proposent</small></span>
          <span aria-hidden="true">↗</span>
        </a>
        <a href="#sondages">
          <span className="path-icon lavender" aria-hidden="true">▥</span>
          <span><strong>Les chiffres</strong><small>Ce que disent les sondages</small></span>
          <span aria-hidden="true">↗</span>
        </a>
        <a href="#agenda">
          <span className="path-icon mint" aria-hidden="true">◷</span>
          <span><strong>Les rendez-vous</strong><small>Où les écouter</small></span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <section className="container candidates-section" id="candidats">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / LES PERSONNALITÉS SUIVIES</p>
            <h2>Les visages de 2027<span className="accent-dot">.</span></h2>
          </div>
          <span className="section-chip">{candidates.length} profils</span>
        </div>

        {candidatesQuery.error ? (
          <p className="status" role="status">Les profils sont momentanément indisponibles.</p>
        ) : (
          <div className="candidate-grid">
            {candidates.map((candidate) => {
              const position = latestPosition.get(candidate.id);

              return (
                <article className="candidate-card" key={candidate.id}>
                  <a
                    className="portrait-link"
                    href={`/candidats/${candidate.slug}`}
                    aria-label={`Voir la fiche de ${candidate.display_name}`}
                  >
                    <div className="portrait-backdrop" aria-hidden="true">2027</div>
                    {candidate.image_url ? (
                      <img
                        src={candidate.image_url}
                        alt={candidate.display_name}
                        className="candidate-photo"
                        loading="lazy"
                        width="360"
                        height="280"
                      />
                    ) : (
                      <div className="candidate-photo placeholder">
                        {candidate.display_name.charAt(0)}
                      </div>
                    )}
                    <span className="portrait-arrow" aria-hidden="true">↗</span>
                  </a>

                  <div className="candidate-content">
                    <p className="party-label">{candidate.party ?? "Personnalité suivie"}</p>
                    <h3>
                      <a href={`/candidats/${candidate.slug}`}>{candidate.display_name}</a>
                    </h3>

                    {position && (
                      <div className={`candidate-position-preview topic-${position.topic}`}>
                        <div className="position-preview-meta">
                          <span>{topicLabel(position.topic)}</span>
                          <time dateTime={position.position_date}>{date(position.position_date)}</time>
                        </div>
                        <strong>{position.title}</strong>
                        <p>{position.summary}</p>
                        <a
                          href={position.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link"
                        >
                          Source : {position.source_name} ↗
                        </a>
                      </div>
                    )}

                    <a
                      className="profile-link candidate-button"
                      href={`/candidats/${candidate.slug}`}
                    >
                      Voir ses positions <span aria-hidden="true">→</span>
                    </a>

                    {candidate.image_credit && (
                      <p className="image-credit">Photo : {candidate.image_credit}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="container primaries-preview" id="primaires">
        <article className="primary-feature-card">
          <div className="primary-symbol" aria-hidden="true">↗</div>
          <div>
            <p className="eyebrow">LE CHEMIN VERS 2027</p>
            <h2>Qui sera désigné ?</h2>
            <p>Les primaires, les candidats et les dates clés.</p>
            {primary && (
              <div className="process-dates">
                <span>{status[primary.status] ?? primary.status}</span>
                {primary.first_round_date && <span>1er tour · {date(primary.first_round_date)}</span>}
                {primary.second_round_date && <span>2d tour · {date(primary.second_round_date)}</span>}
              </div>
            )}
            {primary && <small className="primary-name">{primary.name}</small>}
          </div>
          <a className="button primary" href="/primaires">Suivre les primaires ↗</a>
        </article>
      </section>

      <CampaignFeed />

      <footer className="container footer">
        <a className="brand" href="/">Élections <span>2027</span></a>
        <p>Votre opinion commence par l’information.</p>
        <a href="#candidats">Retour aux candidats ↑</a>
      </footer>
    </main>
  );
}
