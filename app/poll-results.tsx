import { politicalTone } from '../lib/political-tone';

type Result = { id: string; candidate_id: string; value_percent: number | null };
type Person = { id: string; display_name: string; slug: string; party: string | null; image_url: string | null };

/** Shared, accessible numeric table and bar chart; the scale always stays 0–100. */
export default function PollResults({ entries, candidates, title }: { entries: Result[]; candidates: Person[]; title: string }) {
  const people = new Map(candidates.map(person => [person.id, person]));
  return <div className="poll-results-wrap">
    <table className="poll-results">
      <caption>{title} — résultats des profils suivis</caption>
      <thead><tr><th scope="col">Personnalité</th><th scope="col">Part des réponses</th></tr></thead>
      <tbody>{entries.map(entry => {
        const person = people.get(entry.candidate_id);
        const score = Number(entry.value_percent);
        return <tr key={entry.id} className={politicalTone(person?.party)}>
          <th scope="row"><div className="poll-person">
            {person?.image_url && <img src={person.image_url} alt="" width="56" height="56" loading="lazy" />}
            <span>{person ? <a href={`/candidats/${person.slug}`}>{person.display_name}</a> : 'Profil indisponible'}<small>{person?.party}</small></span>
          </div></th>
          <td><div className="poll-result"><div className="poll-track" aria-hidden="true"><span style={{width:`${Math.max(0,Math.min(100,score))}%`}} /></div><strong>{score.toLocaleString('fr-FR')} <small>%</small></strong></div></td>
        </tr>;
      })}</tbody>
    </table>
    <p className="poll-reading-note">Échelle fixe de 0 à 100 %. Seuls les profils suivis sur ce site sont affichés ; leur total ne représente pas nécessairement l’ensemble des réponses.</p>
  </div>;
}
