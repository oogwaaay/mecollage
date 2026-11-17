import fs from 'node:fs'
const bases = ['/combine-images/', '/split-image/', '/batch-compress/']
const langs = ['', 'zh/', 'tw/', 'ja/', 'es/']
let changed = 0
for (const base of bases) {
  for (const prefix of langs) {
    const file = prefix + base.replace(/^\//, '').replace(/\/$/, '') + '.html'
    let html = fs.readFileSync(file, 'utf8')
    if (html.includes('href="/ko' + base + '"')) continue
    const re = /(<a class="language-link"[^>]*hreflang="es"[^>]*>[^<]*<\/a>)/
    if (!re.test(html)) throw new Error('no es language link in ' + file)
    const link = '\n  <a class="language-link" data-language-nav="true" href="/ko' + base + '" hreflang="ko" style="color:inherit;opacity:.8;text-decoration:none;">한국어</a>'
    html = html.replace(re, '$1' + link)
    fs.writeFileSync(file, html)
    changed += 1
  }
}
console.log(JSON.stringify({ changed }))
