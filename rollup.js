import rollup from 'rollup-stream';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import sourcemaps from 'gulp-sourcemaps';

const rollupJS = (options = {}, outputName) => {
  return (stream, file) => {
    return rollup({
      ...options,
      input: 'x',
      format: 'iife',
      plugins: [
        {
          name: 'source',
          resolveId(id) {
            if (id === 'x') return 'x';
            return null;
          },
          load(id) {
            console.log(id);
            if (id !== 'x') return undefined;

            return `
console.log('hello');
            `;
          }
        }
      ]
    })
      // point to the entry file.
      .pipe(source(outputName))
      // we need to buffer the output, since many gulp plugins don't support streams.
      .pipe(buffer())
    //.pipe(sourcemaps.init({ loadMaps: true }));
  };
};

export default rollupJS;