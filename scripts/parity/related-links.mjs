import fs from 'node:fs'
const locales = [
  { prefix: '', badge: 'Related tools', pages: { combine: ['/combine-images/', 'combine images'], split: ['/split-image/', 'split image'], batch: ['/batch-compress/', 'batch compress'], freeform: ['/freeform-collage/', 'freeform collage'] } },
  { prefix: 'zh/', badge: '相关工具', pages: { combine: ['/zh/combine-images/', '在线图片拼接'], split: ['/zh/split-image/', '图片分割'], batch: ['/zh/batch-compress/', '批量压缩'], freeform: ['/zh/freeform-collage/', '自由摆放拼图'] } },
  { prefix: 'tw/', badge: '相關工具', pages: { combine: ['/tw/combine-images/', '線上圖片拼接'], split: ['/tw/split-image/', '圖片分割'], batch: ['/tw/batch-compress/', '批次壓縮'], freeform: ['/tw/freeform-collage/', '自由擺放拼圖'] } },
  { prefix: 'ja/', badge: '関連ツール', pages: { combine: ['/ja/combine-images/', '画像を結合'], split: ['/ja/split-image/', '画像を分割'], batch: ['/ja/batch-compress/', '一括圧縮'], freeform: ['/ja/freeform-collage/', '自由配置コラージュ'] } },
  { prefix: 'es/', badge: 'Herramientas relacionadas', pages: { combine: ['/es/combine-images/', 'combinar imágenes'], split: ['/es/split-image/', 'dividir imagen'], batch: ['/es/batch-compress/', 'compresión por lotes'], freeform: ['/es/freeform-collage/', 'collage libre'] } },
]
const changed = []
for (const loc of locales) {
  for (const self of Object.keys(loc.pages)) {
    const fileNames = { combine: 'combine-images', split: 'split-image', batch: 'batch-compress', freeform: 'freeform-collage' };
    const file = loc.prefix + fileNames[self] + '.html'
    if (!fs.existsSync(file)) throw new Error('missing ' + file)
    let html = fs.readFileSync(file, 'utf8')
    if (html.includes('data-related-tools')) continue
    const links = Object.keys(loc.pages).filter((k) => k !== self).map((k) => '<a href="' + loc.pages[k][0] + '">' + loc.pages[k][1] + '</a>').join(' · ')
    const block = '        <p class="links" data-related-tools="1">' + loc.badge + '：' + links + '</p>'
    const re = /<p class="links">[\s\S]*?<\/p>/g
    let m
    let last = null
    while ((m = re.exec(html))) last = m
    if (!last) throw new Error('no links block in ' + file)
    const insertAt = last.index + last[0].length
    html = html.slice(0, insertAt) + '\n' + block + html.slice(insertAt)
    fs.writeFileSync(file, html)
    changed.push(file)
  }
}
console.log(JSON.stringify({ changed: changed.length, files: changed }))
