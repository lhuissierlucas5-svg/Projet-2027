import type { HomeContent, HomeCounts } from '../lib/home-content';

export default function HomeIntro({ content, counts, preview = false }: { content: HomeContent; counts: HomeCounts; preview?: boolean }) {
  const Heading = preview ? 'h3' : 'h1';
  return <>
    <section className="editorial-hero" aria-label="La présidentielle française">
      <div className="container editorial-hero-grid">
        <div className="editorial-copy">
          <p className="editorial-eyebrow"><span className="republic-flag" role="img" aria-label="Drapeau français" />{content.eyebrow}</p>
          <Heading className="editorial-title">{content.title}</Heading>
          <p className="editorial-lead">{content.subtitle}</p>
          <div className="actions editorial-actions">
            <a className="button primary" href="/candidats" tabIndex={preview ? -1 : undefined}>{content.primary_label}<span aria-hidden="true"> →</span></a>
            <a className="button secondary" href="/comparer" tabIndex={preview ? -1 : undefined}>{content.secondary_label}<span aria-hidden="true"> →</span></a>
          </div>
          <p className="editorial-disclaimer">Un site d’information politique. Sans affiliation à un candidat ni à un parti. Site non officiel.</p>
        </div>
        <aside className="election-tile editorial-reference" aria-label={content.figures_title}>
          <p className="reference-year">2027</p>
          <h2>{content.figures_title}</h2>
          <dl className="editorial-figures">
            {(['profiles', 'positions', 'events'] as const).map(key => <div key={key}>
              <dt>{content[`${key}_label`]}</dt>
              <dd>{counts[key] === null ? <span aria-label="Indisponible">—</span> : counts[key].toLocaleString('fr-FR')}</dd>
            </div>)}
          </dl>
          <p className="figures-note">Comptages du site, actualisés automatiquement. Aucun de ces chiffres n’est un résultat de sondage.</p>
        </aside>
      </div>
    </section>
    <div className="editorial-banner"><p className="container">{content.banner}</p></div>
  </>;
}
