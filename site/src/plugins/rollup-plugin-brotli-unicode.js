import { createFilter } from "@rollup/pluginutils";
import { compress } from "brotli-unicode";

// Make sure that this is called in the Vite plugin `pre` phase

export default function json(options = {}) {
  const filter = createFilter(options.include, options.exclude);

  return {
    name: "jsoncrush",

    async transform(code, id) {
      if (id.slice(-5) !== ".json" || !filter(id)) return null;

      try {
        this.warn(`Compressing JSON ${id}`);
        const start = Date.now();
        let compressed = await compress(Buffer.from(code));
        const end = Date.now();
        this.info(
          `Compressd JSON is ${compressed.length} bytes long (down from ${code.length}) ${((compressed.length / code.length) * 100).toFixed(2)}%, execution time ${end - start} ms`
        );
        return {
          code: JSON.stringify({ type: "brotli", content: compressed }),
          map: { mappings: "" }
        };
      } catch (err) {
        const message = "Could not parse JSON file";
        this.error({ message, id, cause: err });
        return null;
      }
    }
  };
}
