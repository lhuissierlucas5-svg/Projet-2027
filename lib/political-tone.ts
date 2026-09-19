/** Visual family cues only; they never express an editorial judgement. */
export function politicalTone(party: string | null | undefined) {
  const value = (party ?? "").toLocaleLowerCase("fr-FR");
  if (/(écolog|vert|eelp|génération\.s)/.test(value)) return "tone-green";
  if (/(social|commun|insoumis|gauche|place publique|pcf|lfi)/.test(value)) return "tone-rose";
  if (/(renaissance|modem|horizons|ensemble|centr)/.test(value)) return "tone-gold";
  if (/(républicain|droite|national|reconquête|udr|rn)/.test(value)) return "tone-blue";
  return "tone-republic";
}
