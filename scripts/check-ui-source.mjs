import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const postcss = require('postcss');
let count = 0;
function inspect(directory) {
 for (const entry of readdirSync(directory, {withFileTypes:true})) {
  const path = join(directory,entry.name);
  if(entry.isDirectory()) {inspect(path);continue;}
  if(!/\.(css|tsx?|jsx?)$/.test(path))continue;
  const text = readFileSync(path,'utf8');
  if(/\d+ tokens truncated|Warning: truncated output/.test(text))throw new Error(`Source tronquée : ${path}`);
  if(path.endsWith('.css')) {postcss.parse(text,{from:path});count++;}
 }
}
inspect('app');inspect('lib');
const css=postcss.parse(readFileSync('app/globals.css','utf8'));
for(const selector of ['.contender-grid','.candidate-hero-grid-v2','.agenda-card-v2','.site-nav-shell']) {
 if(!css.nodes.some(node=>node.type==='rule'&&node.selector===selector))throw new Error(`Règle de structure absente ou mal imbriquée : ${selector}`);
}
console.log(`${count} feuilles CSS valides ; structures de page présentes ; aucune source tronquée.`);
