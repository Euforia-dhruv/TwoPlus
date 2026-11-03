const c = require('fs').readFileSync('src/App.tsx', 'utf8').split('\n');
const pats = /hasDbStorage|dbModules|isSaved|needsMigration|hasMigration0004|addBlocked|migrationModules|no database storage|Customer support/;
c.forEach((l, i) => { if (pats.test(l)) console.log((i + 1) + ': ' + l.trim().slice(0, 130)); });
