import { createFilter } from "@rollup/pluginutils";
import JSONCrush from "jsoncrush";

// Make sure that this is called in the Vite plugin `pre` phase

export default function json(options = {}) {
  const filter = createFilter(options.include, options.exclude);

  return {
    name: "jsoncrush",

    transform(code, id) {
      if (id.slice(-5) !== ".json" || !filter(id)) return null;

      try {
        this.warn(`Crushing JSON ${id}`);
        const start = Date.now();
        let crushed = JSONCrush.crush(code);
        const end = Date.now();
        this.info(
          `Crushed Json is ${crushed.length} bytes long (down from ${code.length}) ${((crushed.length / code.length) * 100).toFixed(2)}%, execution time ${end - start} ms`,
        );
        return {
          code: JSON.stringify({ type: "jsoncrush", content: crushed }),
          map: { mappings: "" },
        };
      } catch (err) {
        const message = "Could not parse JSON file";
        this.error({ message, id, cause: err });
        return null;
      }
    },
  };
}
