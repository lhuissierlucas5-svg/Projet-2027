export default function Home() {
  return (
    <main className="page">
      <header className="header">
        <div className="container nav">
          <div className="brand">Projet 2027</div>
          <nav>
            <a href="#candidats">Candidats</a>
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
            Projet 2027 rassemble déclarations, propositions, sondages, événements
            et sources pour permettre à chacun de suivre les faits et leur évolution.
          </p>
          <div className="actions">
            <a className="button primary" href="#candidats">Explorer</a>
            <a className="button secondary" href="#propositions">Voir les propositions</a>
          </div>
        </div>
      </section>

      <section className="container grid" id="candidats">
        <article className="card">
          <span className="number">01</span>
          <h2>Candidats</h2>
          <p>Profils, déclarations, positions et documents publics, avec leurs sources.</p>
        </article>
        <article className="card" id="propositions">
          <span className="number">02</span>
          <h2>Propositions</h2>
          <p>Les propositions classées par thème, date et source originale.</p>
        </article>
        <article className="card" id="sondages">
          <span className="number">03</span>
          <h2>Sondages</h2>
          <p>Les résultats et leur méthodologie, conservés pour suivre leur évolution.</p>
        </article>
        <article className="card" id="agenda">
          <span className="number">04</span>
          <h2>Agenda</h2>
          <p>Débats, interviews, meetings et principaux rendez-vous politiques.</p>
        </article>
      </section>

      <footer className="container footer">
        <p>Projet 2027 — première version</p>
        <p>Les sources et dates seront affichées sur chaque contenu.</p>
      </footer>
    </main>
  );
}
