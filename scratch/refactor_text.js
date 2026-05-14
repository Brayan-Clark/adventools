const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walk(path.join(dir, file), fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk(path.join(__dirname, '../app')).concat(walk(path.join(__dirname, '../components')));
let modifiedCount = 0;

for (const file of files) {
  if (file.includes('AppText.tsx')) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Skip if already imported AppText
  if (content.includes('@/components/ui/AppText')) continue;
  
  // Find "import { ..., Text, ... } from 'react-native';"
  // We use a regex that matches Text and captures surrounding spaces/commas
  const rnImportRegex = /import\s+{([^}]*)}\s+from\s+['"]react-native['"];/g;
  
  let modified = false;
  content = content.replace(rnImportRegex, (match, imports) => {
    // Check if Text is in the imports
    const importTokens = imports.split(',').map(s => s.trim()).filter(s => s);
    if (importTokens.includes('Text')) {
      modified = true;
      const newTokens = importTokens.filter(t => t !== 'Text');
      if (newTokens.length === 0) {
        return ''; // remove import completely if Text was the only one
      }
      return `import { ${newTokens.join(', ')} } from 'react-native';`;
    }
    return match;
  });
  
  if (modified) {
    // Add the import for AppText
    // Find the last import statement
    const importLines = content.match(/^import .*;$/gm) || [];
    const lastImport = importLines[importLines.length - 1];
    const newImport = `import { AppText as Text } from '@/components/ui/AppText';\n`;
    
    if (lastImport) {
        content = content.replace(lastImport, lastImport + '\n' + newImport);
    } else {
        content = newImport + content;
    }
    
    fs.writeFileSync(file, content);
    modifiedCount++;
    console.log('Modified:', file);
  }
}

console.log(`Refactored ${modifiedCount} files.`);
