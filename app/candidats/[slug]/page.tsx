import { connection } from "next/server";
import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Candidate = {
  id: string;
  display_name: string;
  slug: string;
  party: string | null;
  image_url: string | null;
  image_credit: string | null;
};

type Statement = {
  id: string;
  quote_text: string;
  statement_date: string;
  context: string | null;
  source: {
    name: string;
    url: string;
  } | null;
};

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

  const { data: statements } = await supabase
    .from("statements")
    .select(
      "id, quote_text, statement_date, context, source:sources(name, url)"
    )
    .eq("candidate_id", candidate.id)
    .eq("verification_status", "verified")
    .order("statement_date", { ascending: false });

  return (
    <main className="page">
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">Projet 2027</a>
          <nav>
            <a href="/#candidats">Candidats</a>
            <a href="/#propositions">Propositions</a>
            <a href="/#sondages">Sondages</a>
            <a href="/#agenda">Agenda</a>
          </nav>
        </div>
      </header>

      <section className="container candidate-profile">
        <a className="back-link" href="/#candidats">← Retour aux candidats</a>

        <div className="candidate-profile-head">
          {candidate.image_url ? (
            <img
              src={candidate.image_url}
              alt={candidate.display_name}
              className="candidate-profile-photo"
            />
          ) : (
            <div className="candidate-profile-photo placeholder">
              {candidate.display_name.charAt(0)}
            </div>
          )}

          <div>
            <p className="eyebrow">FICHE CANDIDAT</p>
            <h1 className="profile-title">{candidate.display_name}</h1>
            <p className="profile-party">{candidate.party ?? "Candidature"}</p>
            {candidate.image_credit && (
              <p className="image-credit">{candidate.image_credit}</p>
            )}
          </div>
        </div>
      </section>

      <section className="container statements-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DÉCLARATIONS</p>
            <h2>Historique sourcé</h2>
          </div>
          <p>
            Les déclarations sont conservées avec leur date et leur source afin de
            pouvoir suivre leur évolution dans le temps.
          </p>
        </div>

        {!statements?.length ? (
          <p className="status">Aucune déclaration vérifiée publiée pour le moment.</p>
        ) : (
          <div className="statement-list">
            {(statements as unknown as Statement[]).map((statement) => (
              <article className="statement-card" key={statement.id}>
                <p className="statement-date">
                  {new Date(statement.statement_date).toLocaleDateString("fr-FR")}
                </p>
                <blockquote>« {statement.quote_text} »</blockquote>
                {statement.context && <p>{statement.context}</p>}
                {statement.source && (
                  <a
                    href={statement.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="source-link"
                  >
                    Source : {statement.source.name}
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="container footer">
        <p>Projet 2027 — données politiques sourcées</p>
        <p>Chaque information doit pouvoir remonter à sa source.</p>
      </footer>
    </main>
  );
}
