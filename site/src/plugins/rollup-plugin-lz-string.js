import { createFilter } from '@rollup/pluginutils';
import LZString from 'lz-string';

// Make sure that this is called in the Vite plugin `pre` phase

export default function json(options = {}) {
  const filter = createFilter(options.include, options.exclude);

  return {
    name: 'lzstring',

     
    transform(code, id) {
      if (id.slice(-5) !== '.json' || !filter(id)) return null;

      try {
        this.warn(`Crushing JSON ${id}`);
        const start = Date.now();
        let crushed = LZString.compress(code);
        const end = Date.now();
        this.info(`Compressed Json is ${crushed.length} bytes long (down from ${code.length}) ${((crushed.length / code.length) * 100).toFixed(2)}%, execution time ${end - start} ms`);
        return {
          code: JSON.stringify({"type": "lzstring", "content": crushed}),
          map: { mappings: '' }
        };
      } catch (err) {
        const message = 'Could not parse JSON file';
        this.error({ message, id, cause: err });
        return null;
      }
    }
  };
}
