export type Field = {key:string; label:string; type?:"textarea"|"date"|"number"|"url"|"select"; options?:string[]; required?:boolean};
export type Section = {table:string; label:string; title:string; fields:Field[]; create?:Record<string,unknown>; archive?:boolean};
const source:Field[] = [{key:"source_name",label:"Nom de la source",required:true},{key:"source_url",label:"Lien de la source",type:"url",required:true},{key:"source_excerpt",label:"Passage exact de l’article (300 caractères maximum)",type:"textarea"}];
export const sections:Section[] = [
 {table:"homepage_content",label:"Accueil",title:"title",fields:[
  {key:"eyebrow",label:"Surtitre",required:true},{key:"title",label:"Titre principal",required:true},{key:"subtitle",label:"Introduction",type:"textarea",required:true},
  {key:"primary_label",label:"Bouton candidats",required:true},{key:"secondary_label",label:"Bouton comparateur",required:true},{key:"banner",label:"Phrase de réassurance",type:"textarea",required:true},
  {key:"figures_title",label:"Titre des repères",required:true},{key:"profiles_label",label:"Libellé du nombre de profils",required:true},{key:"positions_label",label:"Libellé du nombre de propositions",required:true},{key:"events_label",label:"Libellé du nombre de rendez-vous",required:true},
  {key:"candidates_title",label:"Titre de la section candidats",required:true},{key:"primaries_title",label:"Titre de la section désignations",required:true},{key:"primaries_description",label:"Introduction de la section désignations",type:"textarea",required:true},
  {key:"methodology",label:"Méthode et périmètre",type:"textarea",required:true}
 ]},
 {table:"daily_information_queue",label:"Veille quotidienne",title:"title",fields:[
  {key:"status",label:"Traitement",type:"select",options:["review","processed","dismissed"],required:true},
  {key:"review_note",label:"Note de revue",type:"textarea"}
 ]},
 {table:"political_agenda",label:"Agenda",title:"title",archive:true,create:{category:"meeting",status:"upcoming"},fields:[
  {key:"slug",label:"Identifiant du rendez-vous",required:true},{key:"title",label:"Titre",required:true},{key:"summary",label:"Résumé",type:"textarea",required:true},
  {key:"sort_date",label:"Premier jour",type:"date",required:true},{key:"end_date",label:"Dernier jour (si plusieurs jours)",type:"date"},{key:"date_label",label:"Date affichée",required:true},
  {key:"status",label:"Statut",type:"select",options:["upcoming","ongoing","date_tbc","completed","cancelled"]},
  {key:"category",label:"Catégorie",type:"select",options:["debate","primary","institutional","election","meeting","deadline","budget"]},
  {key:"location",label:"Lieu"},{key:"organizer",label:"Organisateur"},...source]},
 {table:"candidate_positions",label:"Propositions",title:"title",archive:true,create:{verification_status:"review",topic:"pouvoir-achat"},fields:[
  {key:"candidate_id",label:"Candidat",type:"select",required:true},{key:"topic",label:"Thème",type:"select",options:["pouvoir-achat","fiscalite","immigration","guerre-defense","ecologie"]},
  {key:"title",label:"Titre",required:true},{key:"summary",label:"Résumé",type:"textarea",required:true},{key:"position_date",label:"Date de la proposition",type:"date",required:true},...source]},
 {table:"contender_watch",label:"Candidatures",title:"display_name",archive:true,fields:[
  {key:"display_name",label:"Nom",required:true},{key:"party",label:"Parti"},{key:"status",label:"Statut",type:"select",options:["declared","primary","potential","conditional"]},
  {key:"status_label",label:"Libellé du statut",required:true},{key:"note",label:"Résumé",type:"textarea",required:true},{key:"as_of_date",label:"Date du statut",type:"date",required:true},{key:"image_url",label:"URL de la photo",type:"url"},{key:"image_credit",label:"Crédit photo"},...source]},
 {table:"candidates",label:"Fiches candidats",title:"display_name",fields:[
  {key:"display_name",label:"Nom affiché",required:true},{key:"party",label:"Parti"},{key:"image_url",label:"URL de la photo",type:"url"},{key:"image_credit",label:"Crédit photo"},
  {key:"latest_quote",label:"Citation",type:"textarea"},{key:"quote_date",label:"Date de la citation",type:"date"},{key:"quote_source_name",label:"Source de la citation"},{key:"quote_source_url",label:"Lien de la citation",type:"url"},{key:"quote_source_excerpt",label:"Passage exact de la citation",type:"textarea"}]},
 {table:"candidate_issue_cards",label:"Comparateur",title:"measure_title",archive:true,fields:[
  {key:"candidate_id",label:"Candidat",type:"select",required:true},{key:"measure_title",label:"Mesure",required:true},{key:"summary",label:"Résumé",type:"textarea",required:true},
  {key:"lead_before",label:"Introduction"},{key:"lead_highlight",label:"Texte mis en valeur",required:true},{key:"lead_after",label:"Suite de la phrase"},
  {key:"key_value",label:"Chiffre clé"},{key:"key_label",label:"Légende du chiffre"},{key:"source_date",label:"Date de la source",type:"date",required:true},...source]},
 {table:"campaign_updates",label:"Sondages",title:"title",archive:true,fields:[
  {key:"title",label:"Titre",required:true},{key:"summary",label:"Résumé",type:"textarea",required:true},...source]},
];
export const optionLabels:Record<string,string> = {
 upcoming:"À venir",ongoing:"En cours",date_tbc:"Date à confirmer",completed:"Terminé",cancelled:"Annulé",meeting:"Réunion / meeting",debate:"Débat",primary:"Primaire",institutional:"Institutionnel",election:"Élection",deadline:"Échéance",budget:"Budget",
 "pouvoir-achat":"Pouvoir d’achat",fiscalite:"Fiscalité",immigration:"Immigration","guerre-defense":"Défense",ecologie:"Écologie",declared:"Déclarée",potential:"Potentielle",conditional:"Conditionnelle",review:"À examiner",processed:"Examinée",dismissed:"Écartée"
};
