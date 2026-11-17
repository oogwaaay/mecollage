import fs from 'node:fs'
const root = process.cwd()
const bases = ['/combine-images/', '/split-image/', '/batch-compress/']
const langs = [['', 'en'], ['zh/', 'zh-CN'], ['tw/', 'zh-TW'], ['ja/', 'ja'], ['es/', 'es']]
const ORIGIN = 'https://www.mecollage.top'
const fileOf = (prefix, base) => prefix + base.replace(/^\//, '').replace(/\/$/, '') + '.html'
const koHref = (base) => ORIGIN + '/ko' + base
let changed = 0
for (const base of bases) {
  for (const [prefix] of langs) {
    const file = fileOf(prefix, base)
    if (!fs.existsSync(file)) throw new Error('missing ' + file)
    let html = fs.readFileSync(file, 'utf8')
    if (html.includes('hreflang="ko"')) continue
    const re = /(\n\s*<link rel="alternate" hreflang="es" href="[^"]*" \/>)/
    if (!re.test(html)) throw new Error('no es hreflang in ' + file)
    html = html.replace(re, '$1\n    <link rel="alternate" hreflang="ko" href="' + koHref(base) + '" />')
    fs.writeFileSync(file, html)
    changed += 1
  }
  const koFile = 'ko/' + base.replace(/^\//, '').replace(/\/$/, '') + '.html'
  let html = fs.readFileSync(koFile, 'utf8')
  html = html.replace(/\s*<meta name="robots" content="noindex, follow">/, '')
  html = html.replace(/\s*<p class="pilot-note">[\s\S]*?<\/p>/, '')
  const canonicalRe = /(<link rel="canonical" href="[^"]*" \/>)/
  const alts = [
    ['en', ORIGIN + base],
    ['zh-CN', ORIGIN + '/zh' + base],
    ['zh-TW', ORIGIN + '/tw' + base],
    ['ja', ORIGIN + '/ja' + base],
    ['es', ORIGIN + '/es' + base],
    ['ko', koHref(base)],
    ['x-default', ORIGIN + base],
  ].map(([code, href]) => '    <link rel="alternate" hreflang="' + code + '" href="' + href + '" />').join('\n')
  html = html.replace(canonicalRe, '$1\n' + alts)
  const faq = base === '/combine-images/' ? [
    ['두 장의 사진을 한 장으로 만들려면?', '사진 두 장을 캔버스에 추가하고 선택한 뒤 가로 또는 세로 배치를 고르면 됩니다. 미리보기에 최종 크기가 표시됩니다.'],
    ['사진이 업로드되나요?', '아니요. 사진은 브라우저 안에서 열리고 배치되고 저장됩니다. MeCollage 서버로 전송되지 않습니다.'],
    ['한 번에 몇 장까지 합칠 수 있나요?', '한 콜라주에 최대 20장입니다. 더 길게 만들려면 나눠서 합친 뒤 다시 합치세요.'],
    ['어떤 형식으로 저장할 수 있나요?', 'PNG, JPG, WebP로 내보낼 수 있습니다.'],
    ['무료인가요?', '무료이며 회원가입과 워터마크가 없습니다.'],
  ] : []
  const graph = [
    { '@type': 'WebPage', '@id': koHref(base) + '#webpage', url: koHref(base), name: (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '', inLanguage: 'ko' },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: ORIGIN + '/ko/' },
      { '@type': 'ListItem', position: 2, name: base === '/combine-images/' ? '사진 합치기' : base === '/split-image/' ? '이미지 분할' : '이미지 일괄 압축', item: koHref(base) },
    ] },
  ]
  if (faq.length) graph.push({ '@type': 'FAQPage', '@id': koHref(base) + '#faq', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })
  html = html.replace('</head>', '    <script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) + '</script>\n</head>')
  fs.writeFileSync(koFile, html)
  changed += 1
}
let sm = fs.readFileSync('sitemap.xml', 'utf8')
for (const base of bases) {
  for (const [prefix] of langs) {
    const loc = ORIGIN + '/' + prefix + base.replace(/^\//, '')
    const idx = sm.indexOf('<loc>' + loc + '</loc>')
    if (idx < 0) throw new Error('sitemap missing ' + loc)
    const start = sm.lastIndexOf('<url>', idx)
    let end = sm.indexOf('</url>', idx)
    let block = sm.slice(start, end)
    if (!block.includes('hreflang="ko"')) {
      block = block.replace(/\n  <\/url>/, '\n    <xhtml:link rel="alternate" hreflang="ko" href="' + koHref(base) + '" />\n  </url>')
      sm = sm.slice(0, start) + block + sm.slice(end)
    }
  }
  const koLoc = koHref(base)
  if (!sm.includes('<loc>' + koLoc + '</loc>')) {
    const links = [
      ['en', ORIGIN + base], ['zh-CN', ORIGIN + '/zh' + base], ['zh-TW', ORIGIN + '/tw' + base],
      ['ja', ORIGIN + '/ja' + base], ['es', ORIGIN + '/es' + base], ['ko', koLoc], ['x-default', ORIGIN + base],
    ].map(([code, href]) => '    <xhtml:link rel="alternate" hreflang="' + code + '" href="' + href + '" />').join('\n')
    const entry = '  <url>\n    <loc>' + koLoc + '</loc>\n    <lastmod>2026-11-17</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n' + links + '\n  </url>\n'
    sm = sm.replace('</urlset>', entry + '</urlset>')
  }
}
fs.writeFileSync('sitemap.xml', sm)
console.log(JSON.stringify({ changed }))
