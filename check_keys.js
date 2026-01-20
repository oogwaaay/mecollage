const fs = require('fs');
const path = require('path');

const langs = ['zh', 'zh-tw', 'ja', 'es'];
const baseLang = 'en';
const i18nDir = path.join(__dirname, 'i18n');

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(flattenKeys(obj[key], prefix + key + '.'));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

try {
  const enContent = fs.readFileSync(path.join(i18nDir, `${baseLang}.json`), 'utf8');
  const enJson = JSON.parse(enContent);
  const enKeys = flattenKeys(enJson);
  
  console.log(`Base language (${baseLang}) has ${enKeys.length} keys.`);

  langs.forEach(lang => {
    try {
      const content = fs.readFileSync(path.join(i18nDir, `${lang}.json`), 'utf8');
      const json = JSON.parse(content);
      const keys = flattenKeys(json);
      const keySet = new Set(keys);
      
      const missing = enKeys.filter(k => !keySet.has(k));
      
      if (missing.length > 0) {
        console.log(`\nMissing keys in ${lang}.json (${missing.length}):`);
        missing.forEach(k => console.log(`  - ${k}`));
      } else {
        console.log(`\n${lang}.json is complete.`);
      }
    } catch (e) {
      console.error(`Error processing ${lang}.json: ${e.message}`);
    }
  });

} catch (e) {
  console.error(`Error processing base language: ${e.message}`);
}
