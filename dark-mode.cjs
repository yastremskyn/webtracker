const fs = require('fs');

const filePaths = ['src/App.tsx', 'src/index.css'];

filePaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace backgrounds step by step so they don't overlap immediately
    // First, map them to temporary tokens
    content = content.replace(/dark:bg-gray-950/g, '__TMP_BG_950__');
    content = content.replace(/dark:bg-gray-900/g, '__TMP_BG_900__');
    content = content.replace(/dark:bg-gray-800/g, '__TMP_BG_800__');
    content = content.replace(/dark:bg-gray-700/g, '__TMP_BG_700__');
    // Map borders
    content = content.replace(/dark:border-gray-800/g, '__TMP_BORDER_800__');
    content = content.replace(/dark:border-gray-700/g, '__TMP_BORDER_700__');

    // Restore to darker version
    content = content.replace(/__TMP_BG_950__/g, 'dark:bg-black');
    content = content.replace(/__TMP_BG_900__/g, 'dark:bg-gray-950');
    content = content.replace(/__TMP_BG_800__/g, 'dark:bg-gray-900');
    content = content.replace(/__TMP_BG_700__/g, 'dark:bg-gray-800');

    content = content.replace(/__TMP_BORDER_800__/g, 'dark:border-gray-900');
    content = content.replace(/__TMP_BORDER_700__/g, 'dark:border-gray-800');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});
