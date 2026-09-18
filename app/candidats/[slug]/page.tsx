import { connection } from "next/server";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import SiteNav from "../../site-nav";

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
  topic: "pouvoir-achat" | "fiscalite" | "immigration" | "guerre-defense" | "ecologie";
  title: string;
  summary: string;
  position_date: string;
  source_name: string;
  source_url: string;
  featured: boolean;
};

const TOPICS: Array<{
  id: Position["topic"];
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: "pouvoir-achat",
    label: "Pouvoir d’achat",
    icon: "€",
    description: "Salaires, carburant, coût de la vie et revenus.",
  },
  {
    id: "fiscalite",
    label: "Impôts & taxes",
    icon: "%",
    description: "Fiscalité des ménages, entreprises et patrimoine.",
  },
  {
    id: "immigration",
    label: "Immigration",
    icon: "↔",
    description: "Entrées, séjour, intégration et règles migratoires.",
  },
  {
    id: "guerre-defense",
    label: "Guerre & défense",
    icon: "◎",
    description: "Ukraine, défense européenne et politique internationale.",
  },
  {
    id: "ecologie",
    label: "Écologie",
    icon: "✦",
    description: "Climat, énergie, adaptation et environnement.",
  },
];

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, display_name, slug, party, image_url, image_credit")
    .eq("slug", slug)
    .single();

  if (!candidate) {
    notFound();
  }

  const { data: positionsQuery } = await supabase
    .from("candidate_positions")
    .select("id, topic, title, summary, position_date, source_name, source_url, featured")
    .eq("candidate_id", candidate.id)
    .eq("verification_status", "verified")
    .order("position_date", { ascending: false });

  const positions = (positionsQuery ?? []) as Position[];
  const featured = positions.filter((position) => position.featured).slice(0, 3);
  const activeTopics = TOPICS.filter((topic) =>
    positions.some((position) => position.topic === topic.id)
  );

  return (
    <main className="page candidate-page-v2">
      <a className="skip-link" href="#positions">Aller aux positions</a>

      <SiteNav />

      <section className="candidate-hero-v2">
        <div className="container">
          <a className="back-link candidate-back" href="/candidats">
            ← Tous les candidats
          </a>

          <div className="candidate-hero-grid-v2">
            <div className="candidate-portrait-v2">
              {candidate.image_url ? (
                <img
                  src={candidate.image_url}
                  alt={candidate.display_name}
                  width="420"
                  height="520"
                />
              ) : (
                <div className="candidate-portrait-fallback">
                  {candidate.display_name.charAt(0)}
                </div>
              )}
              <div className="candidate-portrait-year" aria-hidden="true">2027</div>
            </div>

            <div className="candidate-hero-copy-v2">
              <p className="hero-badge">
                <span aria-hidden="true">✦</span> FICHE CANDIDAT
              </p>
              <h1>{candidate.display_name}</h1>
              <p className="candidate-party-v2">{candidate.party ?? "Personnalité suivie"}</p>
              <p className="candidate-intro">
                Les positions concrètes actuellement documentées sur les sujets qui structurent
                la campagne. Chaque résumé est daté et relié à sa source.
              </p>

              <div className="candidate-topic-nav" aria-label="Sujets couverts">
                {activeTopics.map((topic) => (
                  <a href={`#${topic.id}`} className={`topic-chip topic-${topic.id}`} key={topic.id}>
                    <span aria-hidden="true">{topic.icon}</span>
                    {topic.label}
                  </a>
                ))}
              </div>

              {candidate.image_credit && (
                <p className="image-credit candidate-hero-credit">
                  Photo : {candidate.image_credit}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container candidate-highlights">
          <div className="section-heading candidate-section-heading">
            <div>
              <p className="eyebrow">À RETENIR</p>
              <h2>Ses positions récentes</h2>
            </div>
            <p>Un aperçu des sujets les plus récemment documentés sur cette fiche.</p>
          </div>

          <div className="candidate-highlight-grid">
            {featured.map((position) => {
              const topic = TOPICS.find((item) => item.id === position.topic);

              return (
                <article
                  className={`candidate-highlight-card topic-${position.topic}`}
                  key={position.id}
                >
                  <div className="highlight-top">
                    <span className="highlight-icon" aria-hidden="true">{topic?.icon ?? "•"}</span>
                    <span>{topic?.label ?? position.topic}</span>
                  </div>
                  <h3>{position.title}</h3>
                  <p>{position.summary}</p>
                  <div className="position-source-row">
                    <time dateTime={position.position_date}>{formatDate(position.position_date)}</time>
                    <a
                      href={position.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {position.source_name} ↗
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="container candidate-positions-section" id="positions">
        <div className="section-heading candidate-section-heading">
          <div>
            <p className="eyebrow">POSITIONS & PROPOSITIONS</p>
            <h2>Le concret, thème par thème</h2>
          </div>
          <p>
            Les formulations ci-dessous résument des positions publiques ; la source
            originale permet de vérifier le contexte complet.
          </p>
        </div>

        {activeTopics.length === 0 ? (
          <p className="status">Aucune position vérifiée publiée pour le moment.</p>
        ) : (
          <div className="candidate-topic-sections">
            {activeTopics.map((topic) => {
              const topicPositions = positions.filter(
                (position) => position.topic === topic.id
              );

              return (
                <section className={`candidate-topic-section topic-${topic.id}`} id={topic.id} key={topic.id}>
                  <div className="candidate-topic-heading">
                    <span className="topic-heading-icon" aria-hidden="true">{topic.icon}</span>
                    <div>
                      <h3>{topic.label}</h3>
                      <p>{topic.description}</p>
                    </div>
                    <span className="topic-count">{topicPositions.length}</span>
                  </div>

                  <div className="position-timeline">
                    {topicPositions.map((position) => (
                      <article className="position-timeline-card" key={position.id}>
                        <div className="timeline-marker" aria-hidden="true" />
                        <div className="position-timeline-content">
                          <time dateTime={position.position_date}>
                            {formatDate(position.position_date)}
                          </time>
                          <h4>{position.title}</h4>
                          <p>{position.summary}</p>
                          <a
                            href={position.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="source-link"
                          >
                            Voir la source · {position.source_name} ↗
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>

      <section className="container methodology-note candidate-methodology">
        <strong>Comment lire cette fiche</strong>
        <p>
          Le site privilégie les mesures, objectifs chiffrés et positions de fond plutôt
          que les petites phrases. Les résumés sont des paraphrases factuelles des sources,
          pas des évaluations ni des recommandations.
        </p>
      </section>

      <footer className="container footer">
        <a className="brand" href="/">Élections <span>2027</span></a>
        <p>Chaque position doit pouvoir remonter à sa source.</p>
        <a href="#positions">Retour aux positions ↑</a>
      </footer>
    </main>
  );
}
