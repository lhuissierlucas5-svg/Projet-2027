"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { sections, optionLabels } from "./config";
import { sourceUrl } from "../../lib/source-url";
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
type Row = Record<string, string | number | boolean | null>;
export default function AdminPanel() {
 const [access,setAccess]=useState<"loading"|"anonymous"|"denied"|"admin">("loading");
 const [email,setEmail]=useState(""); const [password,setPassword]=useState("");
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 const [sectionIndex,setSectionIndex]=useState(0); const section=sections[sectionIndex];
 const [rows,setRows]=useState<Row[]>([]); const [candidates,setCandidates]=useState<Row[]>([]);
 const [selected,setSelected]=useState<Row|null>(null); const [draft,setDraft]=useState<Row>({});
 const [query,setQuery]=useState(""); const [loaded,setLoaded]=useState(false);
 useEffect(()=>{
  let active=true;
  async function check() {
   const {data:{user},error}=await client.auth.getUser();
   if (!active) return;
   if (!user || error) {setAccess("anonymous");return;}
   const {data,error:membershipError}=await client.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
   if (active) {setEmail(user.email??"");setAccess(!membershipError && data ? "admin":"denied");}
  }
  void check();
  const {data:{subscription}}=client.auth.onAuthStateChange(()=>{setTimeout(()=>void check(),0);});
  return ()=>{active=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(access!=="admin")return;
  let active=true;
  setLoaded(false);setRows([]);setSelected(null);setQuery("");setMessage("");
  async function load(){
   let contentQuery=client.from(section.table).select("*").order("updated_at",{ascending:false}).limit(500);
   if(section.table==="campaign_updates")contentQuery=contentQuery.eq("kind","poll");
   const [contents,people]=await Promise.all([contentQuery,client.from("candidates").select("id,display_name")]);
   if(!active)return;
   if(contents.error||people.error)setMessage("Impossible de charger les contenus. Réessaie dans un instant.");
   else {setRows((contents.data??[]) as Row[]);setCandidates((people.data??[]) as Row[]);}
   setLoaded(true);
  }void load();return()=>{active=false;};
 },[access,section.table]);
 async function login(event:React.FormEvent){
  event.preventDefault();setBusy(true);setMessage("");
  const {error}=await client.auth.signInWithPassword({email,password});
  setPassword("");setBusy(false);
  if(error)setMessage("Connexion impossible. Vérifie ton adresse, ton mot de passe et la confirmation de ton compte.");
 }
 async function logout(){await client.auth.signOut();setRows([]);setSelected(null);setPassword("");setAccess("anonymous");}
 function open(row:Row){if(selected && JSON.stringify(draft)!==JSON.stringify(selected) && !window.confirm("Abandonner les modifications non enregistrées ?"))return;setSelected(row);setDraft({...row});setMessage("");}
 async function save(action:"save"|"publish"|"archive"){
  if(!selected)return;
  if(action==="publish" && !window.confirm("As-tu vérifié les informations et lu la source ? Cette action les rend éligibles à l’affichage public."))return;
  if(action==="archive" && !window.confirm("Retirer cet élément du site et le conserver dans les archives ?"))return;
  setBusy(true);setMessage("");
  const payload:Row={...(!selected.id ? section.create as Row : {}),updated_at:new Date().toISOString()};
  for(const field of section.fields){
   const value=draft[field.key];
   payload[field.key]=value===""||value===undefined ? (field.key==="lead_before"||field.key==="lead_after" ? "":null) : value;
  }
  if(payload.source_excerpt && String(payload.source_excerpt).trim().length<3){setBusy(false);setMessage("Le passage doit contenir entre 3 et 300 caractères.");return;}
  if(section.archive){
   if(action==="archive")payload.archived_at=new Date().toISOString();
   else if(action==="publish")payload.archived_at=null;
   else if(!selected.id)payload.archived_at=new Date().toISOString();
  }
  if("verification_status" in selected || section.table==="candidate_positions"){
   payload.verification_status=action==="publish"?"verified":(selected.verification_status??"review");
   if(section.table==="campaign_updates" && action==="publish")payload.verified_at=new Date().toISOString();
  }
  if(section.table==="political_agenda") {
   if(payload.sort_date!==selected.sort_date){payload.starts_at=null;payload.ends_at=null;}
   if(payload.end_date!==selected.end_date)payload.ends_at=null;
  }
  // Never retain a passage verified against a different source URL.
  if(section.table==="candidates" && payload.quote_source_url!==selected.quote_source_url && payload.quote_source_excerpt===selected.quote_source_excerpt)payload.quote_source_excerpt=null;
  if(payload.source_url!==selected.source_url && payload.source_excerpt===selected.source_excerpt)payload.source_excerpt=null;
  let result;
  if(selected.id) result=await client.from(section.table).update(payload).eq("id",selected.id).eq("updated_at",selected.updated_at).select().maybeSingle();
  else result=await client.from(section.table).insert<Row>(payload).select().single();
  setBusy(false);
  if(result.error){setMessage("Enregistrement refusé. Vérifie les champs obligatoires, les dates et tes droits d’accès.");return;}
  if(!result.data){setMessage("Cet élément a changé depuis son ouverture. Recharge la page avant de modifier sa nouvelle version.");return;}
  const saved=result.data as Row;setSelected(saved);setDraft({...saved});setRows(old=>[saved,...old.filter(r=>r.id!==saved.id)]);
  setMessage(action==="archive"?"Élément archivé.":action==="publish"?"Publication enregistrée. Les règles de date restent appliquées.":"Modifications enregistrées.");
 }
 const source=sourceUrl(typeof draft.source_url==="string"?draft.source_url:"",typeof draft.source_excerpt==="string"?draft.source_excerpt:null);
 return <main className="management-page admin-page"><p className="management-eyebrow">Espace privé</p><h1>Administration</h1>
 <p className="management-intro">Modifie les contenus et consulte le <a href="/suivi">suivi des actualisations</a>.</p>
 {access==="loading"&&<p role="status">Vérification de l’accès…</p>}
 {access==="anonymous"&&<form className="management-card admin-login" onSubmit={login}>
  <h2>Se connecter</h2><label>Adresse e-mail<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
  <label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
  <button className="admin-primary" disabled={busy}>{busy?"Connexion…":"Se connecter"}</button>
  <p>L’accès est réservé aux comptes autorisés. Lors de la première configuration, le propriétaire du projet crée ton compte dans Supabase puis t’attribue le rôle administrateur.</p>
 </form>}
 {access==="denied"&&<section className="management-card"><h2>Accès non activé</h2><p>Ton compte est connecté, mais ne dispose pas encore de droits d’administration.</p><button onClick={logout}>Se déconnecter</button></section>}
 {access==="admin"&&<>
  <div className="admin-toolbar"><span>{email}</span><button onClick={logout}>Se déconnecter</button></div>
  <div className="admin-tabs" role="group" aria-label="Type de contenu">{sections.map((s,i)=><button key={s.table} aria-pressed={i===sectionIndex} disabled={busy} onClick={()=>{if(!selected || JSON.stringify(draft)===JSON.stringify(selected)||window.confirm("Abandonner les modifications non enregistrées ?"))setSectionIndex(i);}}>{s.label}</button>)}</div>
  <div className="admin-columns"><section className="management-card admin-list"><h2>{section.label}</h2>
   <label>Rechercher<input type="search" value={query} onChange={e=>setQuery(e.target.value)} /></label>
   {section.create&&<button disabled={busy} onClick={()=>open({...section.create} as Row)}>+ Ajouter un brouillon</button>}
   {!loaded&&<p>Chargement…</p>}{loaded&&!rows.length&&<p>Aucun contenu disponible.</p>}
   {rows.filter(r=>String(r[section.title]).toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))).map(row=><button className="admin-record" disabled={busy} aria-pressed={row.id===selected?.id} key={String(row.id)} onClick={()=>open(row)}><strong>{String(row[section.title])}</strong><small>{candidates.find(c=>c.id===row.candidate_id)?.display_name} {row.archived_at?" · Archivé / brouillon":row.verification_status==="review"?" · À vérifier":""}</small></button>)}
   {rows.length===500&&<p>Les 500 éléments les plus récemment modifiés sont affichés.</p>}
  </section>
  <section className="management-card admin-editor">{!selected?<p>Sélectionne un contenu pour le modifier.</p>:<form onSubmit={e=>{e.preventDefault();void save("save");}}>
   <h2>{selected.id?"Modifier le contenu":"Nouveau brouillon"}</h2>
   <p>Les changements d’un contenu publié sont visibles après enregistrement. Les nouveaux contenus restent en brouillon jusqu’à publication.</p>
   {section.table==="campaign_updates"&&<p>Seuls le texte et les sources sont modifiables ici. Les chiffres et scénarios sont contrôlés ensemble par la veille pour éviter les résultats incomplets.</p>}
   {section.fields.map(field=><label key={field.key}>{field.label}{field.required?" *":""}
    {field.type==="textarea"?<textarea rows={field.key==="summary"?4:3} required={field.required} maxLength={field.key.endsWith("source_excerpt")?300:undefined} value={String(draft[field.key]??"")} onChange={e=>setDraft({...draft,[field.key]:e.target.value})} />:
    field.type==="select"?<select required={field.required} value={String(draft[field.key]??"")} onChange={e=>setDraft({...draft,[field.key]:e.target.value})}><option value="">Choisir…</option>{field.key==="candidate_id"?candidates.map(c=><option key={String(c.id)} value={String(c.id)}>{c.display_name}</option>):field.options?.map(o=><option key={o} value={o}>{optionLabels[o]??o}</option>)}</select>:
    <input type={field.type??"text"} required={field.required} value={String(draft[field.key]??"")} onChange={e=>setDraft({...draft,[field.key]:e.target.value})} />}
   </label>)}
   {source&&<a className="admin-source" href={source} target="_blank" rel="noopener noreferrer">Vérifier le passage dans la source ↗</a>}
   <div className="admin-actions"><button className="admin-primary" disabled={busy} type="submit">{busy?"Enregistrement…":"Enregistrer"}</button>
    {section.archive&&<><button type="button" disabled={busy} onClick={e=>{if(e.currentTarget.form?.reportValidity())void save("publish");}}>Vérifier et publier</button><button type="button" disabled={busy||!selected.id} onClick={()=>void save("archive")}>Archiver</button></>}
   </div></form>}</section></div>
 </>}
 {message&&<p className="admin-message" role="status">{message}</p>}
 </main>;
}
