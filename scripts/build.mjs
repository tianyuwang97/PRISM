import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

const files = ['theme.js', 'theme.css', 'web-connection.js', 'web-connection.css', 'prism-extension.zip', 'index.html', 'style.css', 'rounded.css', 'orbit.css', 'orbit.js', 'app.js', 'account.css', 'account.js', 'assets/ark.svg', 'assets/nunito.ttf', 'assets/nunito-OFL.txt', 'assets/prism-mark-v1.png', 'assets/prism-favicon-v1.png', 'assets/prism-headline-round.woff2', 'assets/chillround-OFL.txt', 'assets/headline-font-NOTICE.txt'];
const types = {zip:'application/zip', html:'text/html; charset=utf-8', css:'text/css; charset=utf-8', js:'text/javascript; charset=utf-8', ttf:'font/ttf', woff2:'font/woff2', txt:'text/plain; charset=utf-8', png:'image/png', svg:'image/svg+xml'};
const assets = {};
for (const file of files) {
  assets['/' + file] = {type:types[file.split('.').pop()], data:readFileSync('dist/' + file).toString('base64')};
}
mkdirSync('dist/server', {recursive:true});
mkdirSync('dist/.openai', {recursive:true});
const source = readFileSync('worker/index.mjs', 'utf8').replace('/* ASSETS */', 'const assets = ' + JSON.stringify(assets) + ';');
writeFileSync('dist/server/index.js', source);
writeFileSync('dist/.openai/hosting.json', readFileSync('.openai/hosting.json'));
console.log('Built PRISM server and browser assets.');
