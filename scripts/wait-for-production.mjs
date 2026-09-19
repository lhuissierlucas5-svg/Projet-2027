const expected=process.env.EXPECTED_SHA;
if(!expected) throw new Error('EXPECTED_SHA manquant');
let ready=false;
for(let attempt=0;attempt<24;attempt++){
 try{
  const response=await fetch('https://election-2027-candidats.vercel.app/api/health',{signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(response.ok && (await response.json()).commit===expected){ready=true;break;}
 }catch{/* Retry while Vercel assigns the production alias. */}
 await new Promise(resolve=>setTimeout(resolve,10000));
}
if(!ready)throw new Error('La version attendue ne répond pas en production. Vérifier le déploiement Vercel.');
console.log('Version de production confirmée.');
