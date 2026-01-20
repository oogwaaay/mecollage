const fs = require('fs');
const path = require('path');

const i18nDir = path.join(__dirname, 'i18n');
const sourceLang = 'en';
const targetLangs = ['es', 'ja', 'zh-tw', 'zh']; // Added zh to the list

const sourcePath = path.join(i18nDir, `${sourceLang}.json`);
const sourceData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

targetLangs.forEach(lang => {
  const targetPath = path.join(i18nDir, `${lang}.json`);
  let targetData = {};
  
  if (fs.existsSync(targetPath)) {
    try {
      targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch (e) {
      console.error(`Error parsing ${lang}.json:`, e);
      return;
    }
  }

  let addedCount = 0;
  // Preserve key order of source (en.json) for the new file content
  const newTargetData = {};
  
  // First, add all keys from source
  Object.keys(sourceData).forEach(key => {
    if (targetData.hasOwnProperty(key)) {
      newTargetData[key] = targetData[key];
    } else {
      newTargetData[key] = sourceData[key]; // Use English value as fallback
      addedCount++;
    }
  });

  // Then add any extra keys that were in target but not in source (just in case)
  Object.keys(targetData).forEach(key => {
    if (!sourceData.hasOwnProperty(key)) {
      newTargetData[key] = targetData[key];
    }
  });

  if (addedCount > 0) {
    console.log(`Adding ${addedCount} missing keys to ${lang}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(newTargetData, null, 2), 'utf8');
  } else {
    console.log(`${lang}.json is already in sync.`);
  }
});
