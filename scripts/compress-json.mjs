import fs from 'fs';
// Node sucks - this is wrong, complicated and stupid
import { createRequire } from "module";
import { parseArgs } from "node:util";

const require = createRequire(import.meta.url);
const JSONCrush = await import(require.resolve("../site/node_modules/jsoncrush"));
const crush = JSONCrush.default.crush;

const LZString = await import(require.resolve("../site/node_modules/lz-string"));
const lzCompress = LZString.default.compressToBase64;

const Brotli = await import(require.resolve("../site/node_modules/brotli-unicode"));
const brotliCompress = Brotli.default.compress;


const defaultMethod = "jsoncrush";

const {
  values: { input, output, type },
} = parseArgs({
  options: {
    input: {
      type: "string",
      short: "i",
    },
    output: {
      type: "string",
      short: "o",
    },
    type: {
      type: "string",
      short: "t",
    },
  },
});

let method = type;
if (type === undefined) {
  method = defaultMethod;
}

if (input !== undefined) {
  console.error(`Reading file ${input}`);
  const fileContents = fs.readFileSync(input).toString()
  let compressed
  if (method == "jsoncrush") {
    console.error(`Crushing JSON`);
    compressed = crush(fileContents);
  } else if (method == "lz-string") {
    console.error(`Compressing JSON`);
    compressed = lzCompress(fileContents);
  } else if (method == "brotli") {
    console.error(`Compressing JSON`);
    compressed = await brotliCompress(Buffer.from(fileContents));
  } else {
    console.error(`unknown compression type ${method}`);
    process.exit(1);
  }
  const out = {'type': method, 'content': compressed}
  if (output !== undefined) {
    console.error(`Writing file ${output}`);
    fs.writeFileSync(output, JSON.stringify(out));
  } else {
    console.log(out)
  }
}
