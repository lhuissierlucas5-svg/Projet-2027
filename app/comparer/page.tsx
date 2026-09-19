import { connection } from "next/server";
import { supabase } from "../../lib/supabase";
import SiteNav from "../site-nav";

type Issue = {
  slug: string;
  name: string;
  priority_percent: number;
  short_label: string;
  description: string;
  source_name: string;
  source_url: string;
  source_date: string;
  sort_order: number;
  accent: string;
};

type Candidate = {
  id: string;
  display_name: string;
  slug: string;
  party: string | null;
  image_url: string | null;
};

type IssueCard = {
  id: string;
  candidate_id: string;
  issue_slug: string;
  lead_before: string;
  lead_highlight: string;
  lead_after: string;
  measure_title: string;
  summary: string;
  key_value: string | null;
  key_label: string | null;
  source_name: string;
  source_url: string;
  source_date: string;
  coverage_status: "documented" | "partial" | "awaiting";
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: IssueCard["coverage_status"]) {
  if (status === "partial") return "Angle partiel";
  if (status === "awaiting") return "À compléter";
  return "Mesure documentée";
}

export default async function ComparePage() {
  await connection();

  const [issuesQuery, candidatesQuery, cardsQuery] = await Promise.all([
    supabase
      .from("current_priority_issues")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("candidates")
      .select("id,display_name,slug,party,image_url")
      .order("display_name", { ascending: true }),
    supabase
      .from("current_candidate_issue_cards")
      .select("*")
      .eq("verification_status", "verified"),
  ]);

  const issues = (issuesQuery.data ?? []) as Issue[];
  const candidates = (candidatesQuery.data ?? []) as Candidate[];
  const cards = (cardsQuery.data ?? []) as IssueCard[];

  return (
    <main className="page compare-page">
      <a className="skip-link" href="#priorites">Aller au comparateur</a>
      <SiteNav />

      <section className="compare-hero">
        <div className="container compare-hero-grid">
          <div>
            <p className="hero-badge">
              <span aria-hidden="true">✦</span> COMPARER SANS CLASSER
            </p>
            <h1>
              Les sujets qui comptent.
              <br />
              <em>Les mesures, côte à côte.</em>
            </h1>
            <p className="lead">
              Les thèmes ci-dessous viennent d’un sondage Elabe de rentrée 2026.
              Les candidats sont ensuite présentés par ordre alphabétique, sans score ni gagnant.
            </p>
          </div>

          <div className="compare-survey-card">
            <span>PRIORITÉ N°1 MESURÉE</span>
            <strong>{issues[0]?.short_label ?? "48 %"}</strong>
            <h2>{issues[0]?.name ?? "Pouvoir d’achat"}</h2>
            <p>
              Part des répondants citant ce sujet parmi les priorités d’action pour les prochains mois.
            </p>
            {issues[0] && (
              <a href={issues[0].source_url} target="_blank" rel="noopener noreferrer">
                Source · {issues[0].source_name} ↗
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="container compare-topic-nav" id="priorites" aria-label="Priorités des Français">
        {issues.map((issue) => (
          <a href={`#${issue.slug}`} className={`compare-topic-pill accent-${issue.accent}`} key={issue.slug}>
            <strong>{issue.short_label}</strong>
            <span>{issue.name}</span>
          </a>
        ))}
      </div>

      <section className="container compare-intro-strip">
        <strong>Comment lire le comparateur ?</strong>
        <p>
          Une carte résume une mesure ou une orientation documentée. Le lien source permet de retrouver
          le contexte complet. Quand une proposition est encore partielle ou insuffisamment précise,
          la carte le signale explicitement.
        </p>
      </section>

      <section className="container compare-issues">
        {issues.map((issue, issueIndex) => {
          const issueCards = cards.filter((card) => card.issue_slug === issue.slug);

          return (
            <section
              className={`compare-issue-section accent-${issue.accent}`}
              id={issue.slug}
              key={issue.slug}
            >
              <div className="compare-issue-heading">
                <div className="compare-rank" aria-hidden="true">
                  {String(issueIndex + 1).padStart(2, "0")}
                </div>

                <div>
                  <p className="eyebrow">PRIORITÉ MESURÉE</p>
                  <h2>{issue.name}</h2>
                  <p>{issue.description}</p>
                </div>

                <div className="compare-priority-score">
                  <strong>{Number(issue.priority_percent).toLocaleString("fr-FR")} %</strong>
                  <span>des Français</span>
                  <a href={issue.source_url} target="_blank" rel="noopener noreferrer">
                    {issue.source_name} · {formatDate(issue.source_date)} ↗
                  </a>
                </div>
              </div>

              <div className="compare-candidate-grid">
                {candidates.map((candidate) => {
                  const card = issueCards.find((item) => item.candidate_id === candidate.id);

                  if (!card) {
                    return (
                      <article className="compare-candidate-card compare-card-awaiting" key={candidate.id}>
                        <div className="compare-person">
                          {candidate.image_url ? (
                            <img src={candidate.image_url} alt="" width="56" height="56" />
                          ) : (
                            <span>{candidate.display_name.slice(0, 2)}</span>
                          )}
                          <div>
                            <h3>{candidate.display_name}</h3>
                            <p>{candidate.party ?? "Personnalité suivie"}</p>
                          </div>
                        </div>
                        <p className="compare-empty">Pas encore de mesure suffisamment documentée sur ce thème.</p>
                      </article>
                    );
                  }

                  return (
                    <article
                      className={`compare-candidate-card compare-card-${card.coverage_status}`}
                      key={card.id}
                    >
                      <div className="compare-person">
                        {candidate.image_url ? (
                          <img src={candidate.image_url} alt="" width="56" height="56" loading="lazy" />
                        ) : (
                          <span>{candidate.display_name.slice(0, 2)}</span>
                        )}
                        <div>
                          <h3>
                            <a href={`/candidats/${candidate.slug}`}>{candidate.display_name}</a>
                          </h3>
                          <p>{candidate.party ?? "Personnalité suivie"}</p>
                        </div>
                      </div>

                      <span className="compare-status">{statusLabel(card.coverage_status)}</span>

                      <p className="compare-lead">
                        {card.lead_before}
                        <mark>{card.lead_highlight}</mark>
                        {card.lead_after}
                      </p>

                      {card.key_value && (
                        <div className="compare-key-value">
                          <strong>{card.key_value}</strong>
                          <span>{card.key_label}</span>
                        </div>
                      )}

                      <h4>{card.measure_title}</h4>
                      <p className="compare-summary">{card.summary}</p>

                      <div className="compare-card-footer">
                        <time dateTime={card.source_date}>{formatDate(card.source_date)}</time>
                        <a href={card.source_url} target="_blank" rel="noopener noreferrer">
                          {card.source_name} ↗
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>

      <section className="container methodology-note compare-methodology">
        <strong>Une comparaison, pas un classement</strong>
        <p>
          Les pourcentages portent sur les priorités thématiques mesurées dans l’opinion, pas sur la qualité
          des propositions. Les cartes candidats ne reçoivent ni note, ni score, ni ordre préférentiel.
        </p>
      </section>

      <footer className="container footer">
        <a className="brand" href="/">Élections <span>2027</span></a>
        <p>Comparer les propositions, remonter aux sources.</p>
        <a href="#priorites">Retour aux thèmes ↑</a>
      </footer>
    </main>
  );
}
