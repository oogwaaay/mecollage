import fs from 'node:fs'
const bases = ['/combine-images/', '/split-image/', '/batch-compress/']
for (const base of bases) {
  const file = 'ko/' + base.replace(/^\//, '').replace(/\/$/, '') + '.html'
  let html = fs.readFileSync(file, 'utf8')
  html = html.replace(/\s*<meta name="robots" content="noindex, follow" \/>/, '')
  fs.writeFileSync(file, html)
}
let sm = fs.readFileSync('sitemap.xml', 'utf8')
const langs = ['', 'zh/', 'tw/', 'ja/', 'es/']
let added = 0
for (const base of bases) {
  for (const prefix of langs) {
    const loc = 'https://www.mecollage.top/' + prefix + base.replace(/^\//, '')
    const idx = sm.indexOf('<loc>' + loc + '</loc>')
    if (idx < 0) continue
    const endTag = sm.indexOf('</url>', idx)
    const blockStart = sm.lastIndexOf('<url>', idx)
    if (sm.slice(blockStart, endTag).includes('hreflang="ko"')) continue
    sm = sm.slice(0, endTag) + '    <xhtml:link rel="alternate" hreflang="ko" href="https://www.mecollage.top/ko' + base + '" />\n  ' + sm.slice(endTag)
    added += 1
  }
}
fs.writeFileSync('sitemap.xml', sm)
console.log(JSON.stringify({ added }))
