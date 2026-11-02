// throwaway: find the generic add-record branch
import { readFileSync } from "node:fs";
const lines = readFileSync("src/App.tsx", "utf8").split(/\r?\n/);
const re = /Session only|setRecords|no database storage|Add record|else \{/;
for (let i = 3060; i < 3320; i++) {
  if (re.test(lines[i])) console.log(`${i + 1}: ${lines[i].trim().slice(0, 110)}`);
}
