import { supabase } from "../lib/supabase";

type PollUpdate = {
  id: string;
  candidate_id: string;
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  published_at: string;
  verified_at: string;
  institute: string | null;
  sponsor: string | null;
  metric_type: string | null;
  scenario: string | null;
  value_percent: number | null;
  fieldwork_start: string | null;
  fieldwork_end: string | null;
  sample_size: number | null;
  population: string | null;
};

type Candidate = {
  id: string;
  display_name: string;
  slug: string;
  party: string | null;
  image_url: string | null;
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
  highlight_value: string | null;
  highlight_label: string | null;
};

type AgendaItem = {
  id: string;
  slug: string;
  sort_date: string;
  date_label: string;
  title: string;
  category: string;
  status: string;
  location: string | null;
  organizer: string | null;
  summary: string;
  source_name: string;
  source_url: string;
  highlight: boolean;
  image_url: string | null;
  image_credit: string | null;
};

type PrimaryFace = {
  id: string;
  display_name: string;
  image_url: string | null;
};

type Contender = {
  id: string;
  display_name: string;
  party: string | null;
  status: "declared" | "primary" | "potential" | "conditional";
  status_label: string;
  note: string;
  source_name: string;
  source_url: string;
  as_of_date: string;
  sort_order: number;
  image_url: string | null;
  image_credit: string | null;
};

const metrics: Record<string, string> = {
  presidential_vote_intention: "Intention de vote présidentielle",
  primary_vote_intention: "Intention de vote à une primaire",
  favorability: "Opinion favorable",
  desired_participation: "Participation souhaitée",
};

const topicLabels: Record<string, string> = {
  "pouvoir-achat": "Pouvoir d’achat",
  fiscalite: "Impôts & taxes",
  immigration: "Immigration",
  "guerre-defense": "Guerre & défense",
  ecologie: "Écologie",
};

const categoryLabels: Record<string, string> = {
  debate: "Débat",
  primary: "Primaire",
  institutional: "Institutions",
  election: "Élection",
  meeting: "Rendez-vous",
  deadline: "Date limite",
  budget: "Budget",
};

function date(value: string | null) {
  if (!value) return "Non précisé";
  return new Date(value.length === 10 ? `${value}T12:00:00Z` : value)
    .toLocaleDateString("fr-FR", {
      timeZone: "Europe/Paris",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
}

function sourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2);
}

export default async function CampaignFeed() {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const pollFields =
    "id,candidate_id,title,summary,source_name,source_url,published_at,verified_at,institute,sponsor,metric_type,scenario,value_percent,fieldwork_start,fieldwork_end,sample_size,population";

  const [polls, candidatesQuery, positionsQuery, agendaQuery, contendersQuery, primaryCandidatesQuery] =
    await Promise.all([
      supabase
        .from("campaign_updates")
        .select(pollFields)
        .eq("kind", "poll")
        .eq("verification_status", "verified")
        .order("published_at", { ascending: false })
        .limit(18),
      supabase
        .from("candidates")
        .select("id,display_name,slug,party,image_url")
        .order("display_name"),
      supabase
        .from("candidate_positions")
        .select(
          "id,candidate_id,topic,title,summary,position_date,source_name,source_url,highlight_value,highlight_label"
        )
        .eq("verification_status", "verified")
        .order("position_date", { ascending: false }),
      supabase
        .from("political_agenda")
        .select(
          "id,slug,sort_date,date_label,title,category,status,location,organizer,summary,source_name,source_url,highlight,image_url,image_credit"
        )
        .gte("sort_date", today)
        .order("sort_date", { ascending: true })
        .limit(12),
      supabase
        .from("contender_watch")
        .select(
          "id,display_name,party,status,status_label,note,source_name,source_url,as_of_date,sort_order,image_url,image_credit"
        )
        .order("sort_order", { ascending: true }),
      supabase
        .from("selection_candidates")
        .select("id,display_name,image_url")
        .in("display_name", ["Raphaël Glucksmann","Olivier Faure","Jérôme Guedj","Emmanuel Maurel","Ségolène Royal"])
        .order("sort_order", { ascending: true }),
    ]);

  const candidates = (candidatesQuery.data ?? []) as Candidate[];
  const names = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const positions = ((positionsQuery.data ?? []) as Position[])
    .filter((position) => position.highlight_value)
    .slice(0, 6);
  const agenda = (agendaQuery.data ?? []) as AgendaItem[];
  const contenders = (contendersQuery.data ?? []) as Contender[];
  const primaryFaces = (primaryCandidatesQuery.data ?? []) as PrimaryFace[];

  const agendaSymbol: Record<string, string> = {
    budget: "€",
    institutional: "🏛",
    election: "✓",
    deadline: "⏳",
    meeting: "●",
    debate: "✦",
    primary: "🗳",
  };

  const groups = new Map<string, PollUpdate[]>();
  for (const item of (polls.data ?? []) as PollUpdate[]) {
    const key = JSON.stringify([
      item.source_url,
      item.institute,
      item.sponsor,
      item.metric_type,
      item.scenario,
      item.title,
      item.published_at,
      item.fieldwork_start,
      item.fieldwork_end,
      item.sample_size,
      item.population,
    ]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <>
      <section className="container campaign-pulse" aria-label="Repères de campagne">
        <div className="pulse-card pulse-violet">
          <span>ÉLECTION</span>
          <strong>18 AVR.</strong>
          <small>1er tour · présidentielle 2027</small>
        </div>
        <div className="pulse-card pulse-orange">
          <span>AGENDA</span>
          <strong>{agenda.length}</strong>
          <small>échéances à venir suivies</small>
        </div>
        <div className="pulse-card pulse-lime">
          <span>PROPOSITIONS</span>
          <strong>{positions.length}</strong>
          <small>mesures chiffrées mises en avant</small>
        </div>
        <div className="pulse-card pulse-cyan">
          <span>COURSE 2027</span>
          <strong>{contenders.length}</strong>
          <small>candidatures et hypothèses documentées</small>
        </div>
      </section>

      <section className="container campaign-section proposal-showcase" id="propositions">
        <div className="section-heading campaign-heading">
          <div>
            <p className="eyebrow">02 / LE CONCRET</p>
            <h2>Les chiffres qui comptent<span className="accent-dot">.</span></h2>
          </div>
          <p>Des mesures identifiables, datées et sourcées — sans petites phrases.</p>
        </div>

        {positionsQuery.error || candidatesQuery.error ? (
          <p className="status">Les propositions sont momentanément indisponibles.</p>
        ) : (
          <div className="proposal-spotlight-grid">
            {positions.map((position) => {
              const candidate = names.get(position.candidate_id);
              return (
                <article
                  className={`proposal-spotlight-card topic-${position.topic}`}
                  key={position.id}
                >
                  <div className="proposal-person">
                    {candidate?.image_url ? (
                      <img
                        src={candidate.image_url}
                        alt=""
                        width="48"
                        height="48"
                        loading="lazy"
                      />
                    ) : (
                      <span>{initials(candidate?.display_name ?? "?")}</span>
                    )}
                    <div>
                      <a href={candidate ? `/candidats/${candidate.slug}` : "#"}>
                        {candidate?.display_name ?? "Candidat suivi"}
                      </a>
                      <small>{topicLabels[position.topic] ?? position.topic}</small>
                    </div>
                  </div>

                  <div className="proposal-number">
                    <strong>{position.highlight_value}</strong>
                    <span>{position.highlight_label}</span>
                  </div>

                  <h3>{position.title}</h3>
                  <p>{position.summary}</p>

                  <div className="proposal-source">
                    <time dateTime={position.position_date}>
                      {date(position.position_date)}
                    </time>
                    <a
                      href={sourceUrl(position.source_url)}
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
        )}
      </section>

      <section className="container campaign-section agenda-v2" id="agenda">
        <div className="agenda-heading">
          <div>
            <p className="eyebrow">03 / AGENDA POLITIQUE</p>
            <h2>Les prochaines dates<span>.</span></h2>
          </div>
          <p>Débats, primaire, budget et échéances électorales.</p>
        </div>

        {agendaQuery.error ? (
          <p className="status">L’agenda est momentanément indisponible.</p>
        ) : (
          <div className="agenda-list-v2">
            {agenda.slice(0, 9).map((item) => (
              <article
                className={`agenda-card-v2 agenda-${item.category} ${
                  item.highlight ? "agenda-highlight" : ""
                }`}
                key={item.id}
              >
                <div className="agenda-date-box">
                  <span>{categoryLabels[item.category] ?? item.category}</span>
                  <strong>{item.date_label}</strong>
                </div>

                <div className="agenda-visual" aria-hidden="true">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" width="112" height="112" loading="lazy" />
                  ) : item.category === "debate" || item.category === "primary" ? (
                    <div className="agenda-face-stack">
                      {primaryFaces.slice(0, 5).map((person) =>
                        person.image_url ? (
                          <img
                            src={person.image_url}
                            alt=""
                            width="48"
                            height="48"
                            key={person.id}
                            loading="lazy"
                          />
                        ) : null
                      )}
                    </div>
                  ) : (
                    <span className="agenda-symbol">{agendaSymbol[item.category] ?? "•"}</span>
                  )}
                </div>

                <div className="agenda-content-v2">
                  <div className="agenda-status-row">
                    {item.status === "ongoing" && <span className="live-pill">EN COURS</span>}
                    {item.status === "date_tbc" && (
                      <span className="tbc-pill">DATE À PRÉCISER</span>
                    )}
                    {item.organizer && <small>{item.organizer}</small>}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <div className="agenda-meta-v2">
                    {item.location && <span>{item.location}</span>}
                    <a
                      href={sourceUrl(item.source_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.source_name} ↗
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="container campaign-section contender-section" id="candidatures">
        <div className="section-heading campaign-heading">
          <div>
            <p className="eyebrow">04 / LA COURSE S’ÉLARGIT</p>
            <h2>Autres candidatures et hypothèses<span className="accent-dot">.</span></h2>
          </div>
          <p>
            Sélection non exhaustive de candidatures déclarées, participants à une primaire
            et hypothèses documentées. Aucun statut n’est présenté comme une prévision.
          </p>
        </div>

        {contendersQuery.error ? (
          <p className="status">Le radar des candidatures est momentanément indisponible.</p>
        ) : (
          <div className="contender-grid">
            {contenders.map((person, index) => (
              <article className={`contender-card contender-${person.status}`} key={person.id}>
                <div className="contender-top">
                  {person.image_url ? (
                    <img
                      className="contender-photo"
                      src={person.image_url}
                      alt={person.display_name}
                      width="66"
                      height="66"
                      loading="lazy"
                    />
                  ) : (
                    <span className="contender-initials" aria-hidden="true">
                      {initials(person.display_name)}
                    </span>
                  )}
                  <span className="contender-status">{person.status_label}</span>
                </div>
                <h3>{person.display_name}</h3>
                {person.party && <p className="contender-party">{person.party}</p>}
                <p className="contender-note">{person.note}</p>
                <div className="contender-footer">
                  <time dateTime={person.as_of_date}>Mis à jour {date(person.as_of_date)}</time>
                  <a
                    href={sourceUrl(person.source_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Source ↗
                  </a>
                </div>
                <span className="contender-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="container campaign-section poll-section-v2" id="sondages">
        <div className="section-heading campaign-heading">
          <div>
            <p className="eyebrow">05 / LES SONDAGES</p>
            <h2>La campagne en chiffres<span className="accent-dot">.</span></h2>
          </div>
          <p>Une photographie de l’opinion, pas une prévision du résultat.</p>
        </div>

        {polls.error || candidatesQuery.error ? (
          <p className="status" role="status">
            Les sondages sont momentanément indisponibles.
          </p>
        ) : !groups.size ? (
          <div className="empty-state">
            <span aria-hidden="true">▥</span>
            <div>
              <h3>Les chiffres arrivent</h3>
              <p>Aucun sondage vérifié publié pour le moment.</p>
            </div>
          </div>
        ) : (
          [...groups.entries()].map(([key, entries]) => {
            const first = entries[0];
            const sorted = [...entries].sort(
              (a, b) => Number(b.value_percent) - Number(a.value_percent)
            );

            return (
              <article className="poll-panel poll-panel-v2" key={key}>
                <div className="poll-heading">
                  <div>
                    <span className="tag subtle">
                      {metrics[first.metric_type ?? ""] ?? first.metric_type}
                    </span>
                    <h3>{first.title}</h3>
                    <p>{first.scenario}</p>
                  </div>
                  <div className="poll-stamp">
                    <strong>{first.institute}</strong>
                    <span>Publié le {date(first.published_at)}</span>
                  </div>
                </div>

                <ol className="poll-chart poll-chart-v2" aria-label={first.title}>
                  {sorted.map((item) => {
                    const candidate = names.get(item.candidate_id);
                    const score = Number(item.value_percent);

                    return (
                      <li className="chart-row chart-row-v2" key={item.id}>
                        <div className="chart-name chart-name-v2">
                          {candidate?.image_url ? (
                            <img
                              src={candidate.image_url}
                              alt=""
                              width="38"
                              height="38"
                              loading="lazy"
                            />
                          ) : null}
                          <span>
                            {candidate ? (
                              <a href={`/candidats/${candidate.slug}`}>
                                {candidate.display_name}
                              </a>
                            ) : (
                              "Profil indisponible"
                            )}
                          </span>
                        </div>
                        <div className="chart-track" aria-hidden="true">
                          <div
                            className="chart-bar"
                            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                          />
                        </div>
                        <strong className="chart-value">
                          {score.toLocaleString("fr-FR")} <small>%</small>
                        </strong>
                      </li>
                    );
                  })}
                </ol>

                <details className="method-details">
                  <summary>
                    Méthode & source <span aria-hidden="true">＋</span>
                  </summary>
                  <dl className="poll-method">
                    <dt>Commanditaire</dt>
                    <dd>{first.sponsor ?? "Non précisé"}</dd>
                    <dt>Terrain</dt>
                    <dd>
                      Du {date(first.fieldwork_start)} au {date(first.fieldwork_end)}
                    </dd>
                    <dt>Base analysée</dt>
                    <dd>
                      {first.sample_size?.toLocaleString("fr-FR")} personnes ·{" "}
                      {first.population}
                    </dd>
                  </dl>
                  <p>{first.summary}</p>
                  <a
                    className="source-link"
                    href={sourceUrl(first.source_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Consulter {first.source_name} ↗
                  </a>
                  <small>Vérifié le {date(first.verified_at)}</small>
                </details>

                <p className="chart-note">
                  Un sondage mesure une opinion à un instant donné. Il ne prédit pas le résultat
                  de l’élection.
                </p>
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
