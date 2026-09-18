import CampaignFeed from "./campaign-feed";
import { connection } from "next/server";
import { supabase } from "../lib/supabase";

type Candidate = {
  id: string; display_name: string; slug: string; party: string | null;
  image_url: string | null; image_credit: string | null; latest_quote: string | null;
  quote_date: string | null; quote_source_name: string | null; quote_source_url: string | null;
};

function date(value: string | null) {
  return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }) : null;
}

export default async function Home() {
  await connection();
  const [candidatesQuery, primaryQuery] = await Promise.all([
    supabase.from("candidates").select("id,display_name,slug,party,image_url,image_credit,latest_quote,quote_date,quote_source_name,quote_source_url").order("display_name"),
    supabase.from("selection_processes").select("name,first_round_date,second_round_date,status").eq("slug", "choisir-2027").maybeSingle(),
  ]);
  const candidates = (candidatesQuery.data ?? []) as Candidate[];
  const primary = primaryQuery.data;
  const status: Record<string, string> = { upcoming: "À venir", ongoing: "En cours", completed: "Terminée", cancelled: "Annulée" };
  return <main className="page">
    <a className="skip-link" href="#candidats">Aller au contenu</a>
    <header className="header"><div className="container nav">
      <a className="brand" href="/">Élections <span>2027</span><span className="brand-dot" aria-hidden="true" /></a>
      <nav aria-label="Navigation principale">
        <a href="#candidats">Candidats</a><a href="/primaires">Primaires</a><a href="#propositions">Propositions</a><a href="#sondages">Sondages</a><a href="#agenda" className="nav-agenda">Agenda ↗</a>
      </nav>
    </div></header>
    <section className="hero"><div className="container hero-layout">
      <div className="hero-copy">
        <p className="hero-badge"><span aria-hidden="true">✦</span> LE REPÈRE DE LA PRÉSIDENTIELLE</p>
        <h1>2027.<br />Les idées.<br /><em>Votre regard.</em></h1>
        <p className="lead">Candidats, propositions, sondages.<br />L’essentiel pour vous faire votre opinion.</p>
        <div className="actions"><a className="button primary" href="#candidats">Découvrir les candidats <span aria-hidden="true">↗</span></a><a className="button secondary" href="#sondages">Voir les sondages <span aria-hidden="true">→</span></a></div>
        <p className="hero-footnote">Des faits datés. Des sources à consulter.</p>
      </div>
      <div className="hero-visual" aria-label="Explorer la campagne">
        <div className="orbit orbit-one" aria-hidden="true" /><div className="orbit orbit-two" aria-hidden="true" />
        <div className="election-tile"><span>PRÉSIDENTIELLE</span><strong>20<br />27<span className="tile-star" aria-hidden="true">✳</span></strong><small>Comprendre. Comparer. Choisir.</small></div>
        <a href="#sondages" className="visual-note note-polls"><span className="note-icon" aria-hidden="true">▥</span><span><strong>Prendre le pouls</strong><small>Les chiffres, avec leur contexte</small></span><span aria-hidden="true">↗</span></a>
        <a href="#candidats" className="visual-note note-people"><span className="avatar-stack" aria-hidden="true">{candidates.slice(0,3).map(c => <span key={c.id}>{c.image_url ? <img src={c.image_url} alt="" width="40" height="40" /> : c.display_name.charAt(0)}</span>)}</span><span><strong>{candidatesQuery.error ? "Les candidats" : `${candidates.length} profils à explorer`}</strong><small>Idées & déclarations</small></span></a>
        <span className="visual-spark" aria-hidden="true">✳</span>
      </div>
    </div></section>
    <div className="container quick-paths" aria-label="Explorer par rubrique">
      <a href="#propositions"><span className="path-icon peach" aria-hidden="true">✦</span><span><strong>Les idées</strong><small>Ce qu’ils proposent</small></span><span aria-hidden="true">↗</span></a>
      <a href="#sondages"><span className="path-icon lavender" aria-hidden="true">▥</span><span><strong>Les chiffres</strong><small>Ce que disent les sondages</small></span><span aria-hidden="true">↗</span></a>
      <a href="#agenda"><span className="path-icon mint" aria-hidden="true">◷</span><span><strong>Les rendez-vous</strong><small>Où les écouter</small></span><span aria-hidden="true">↗</span></a>
    </div>
    <section className="container candidates-section" id="candidats">
      <div className="section-heading"><div><p className="eyebrow">01 / LES PERSONNALITÉS SUIVIES</p><h2>Les visages de 2027<span className="accent-dot">.</span></h2></div><span className="section-chip">{candidates.length} profils</span></div>
      {candidatesQuery.error ? <p className="status" role="status">Les profils sont momentanément indisponibles.</p> : <div className="candidate-grid">{candidates.map(c => <article className="candidate-card" key={c.id}>
        <a className="portrait-link" href={`/candidats/${c.slug}`} aria-label={`Voir la fiche de ${c.display_name}`}>
          <div className="portrait-backdrop" aria-hidden="true">2027</div>
          {c.image_url ? <img src={c.image_url} alt={c.display_name} className="candidate-photo" loading="lazy" width="360" height="280" /> : <div className="candidate-photo placeholder">{c.display_name.charAt(0)}</div>}
          <span className="portrait-arrow" aria-hidden="true">↗</span>
        </a>
        <div className="candidate-content"><p className="party-label">{c.party ?? "Personnalité suivie"}</p><h3><a href={`/candidats/${c.slug}`}>{c.display_name}</a></h3>
          {c.latest_quote && <details className="candidate-quote"><summary>Dernière déclaration <span>{date(c.quote_date)}</span></summary><blockquote>« {c.latest_quote} »</blockquote>{c.quote_source_url && <a className="source-link" href={c.quote_source_url} target="_blank" rel="noopener noreferrer">Source : {c.quote_source_name ?? "Consulter"} ↗</a>}</details>}
          <a className="profile-link candidate-button" href={`/candidats/${c.slug}`}>Explorer le profil <span aria-hidden="true">→</span></a>
          {c.image_credit && <p className="image-credit">Photo : {c.image_credit}</p>}
        </div>
      </article>)}</div>}
    </section>
    <section className="container primaries-preview" id="primaires"><article className="primary-feature-card">
      <div className="primary-symbol" aria-hidden="true">↗</div><div><p className="eyebrow">LE CHEMIN VERS 2027</p><h2>Qui sera désigné ?</h2><p>Les primaires, les candidats et les dates clés.</p>{primary && <div className="process-dates"><span>{status[primary.status] ?? primary.status}</span>{primary.first_round_date && <span>1er tour · {date(primary.first_round_date)}</span>}{primary.second_round_date && <span>2d tour · {date(primary.second_round_date)}</span>}</div>}{primary && <small className="primary-name">{primary.name}</small>}</div><a className="button primary" href="/primaires">Suivre les primaires ↗</a>
    </article></section>
    <CampaignFeed />
    <footer className="container footer"><a className="brand" href="/">Élections <span>2027</span></a><p>Votre opinion commence par l’information.</p><a href="#candidats">Retour aux candidats ↑</a></footer>
  </main>;
}
