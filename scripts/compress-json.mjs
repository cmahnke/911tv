import fs from 'fs';
// Node sucks - this is wrong, complicated and stupid
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const JSONCrush = await import(require.resolve("../site/node_modules/jsoncrush"));
const crush = JSONCrush.default.crush

const infile = process.argv[2]
const outfile = process.argv[3]
if (infile !== undefined) {
  console.error(`Reading file ${infile}`);
  const fileContents = fs.readFileSync(infile).toString()
  console.error(`Crushing JSON`);
  const crushed = crush(fileContents);
  const out = {'type': 'jsoncrush', 'content': crushed}
  if (outfile !== undefined) {
    console.error(`Writing file ${oufile}`);
    fs.writeFile(outfile, out, 'utf8');
  } else {
    console.log(out)
  }
}
