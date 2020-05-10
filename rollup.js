import rollup from '@rollup/stream';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import sourcemaps from 'gulp-sourcemaps';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import mdx from 'rollup-plugin-mdx';
import replace from '@rollup/plugin-replace';
import frontMatter from 'front-matter';

const rootFile = (name) => ({
  name: 'source',
  resolveId: id => id !== name ? null : name,
  load: id => id !== name ? null : `
    import React from 'react';
    import ReactDOM from 'react-dom';
    import MDXComponent from './index.mdx';
    console.log('hello');
    const elm = document.querySelector('section.articleBlock');
    console.log(elm);
    ReactDOM.render(React.createElement(MDXComponent), elm);
    console.log('rendered');
  `
});

const deFrontMatter = () => ({
  transform(code, id) {
    if (!id.endsWith('.mdx')) return null;

    const content = frontMatter(code);

    return content.body;
  }
})

let cache;

const rollupJS = (options = {}, outputName) => {
  return (stream, file) => {
    return rollup({
      ...options.rollupOptions,
      input: outputName,
      output: {
        format: 'cjs'
      },
      cache,
      plugins: [
        rootFile(outputName),
        resolve(),
        deFrontMatter(),
        mdx({
          ...options.mdxOptions
        }),
        replace({
          'process.env.NODE_ENV': "'production'"
        }),
        cjs({
          namedExports: {
            'react': [
              'forwardRef',
              'useState',
              'useEffect'
            ]
          }
        }),
        babel({
          exclude: /node_modules/
        })
      ]
    })
      .on('bundle', result => cache = result)
      // point to the entry file.
      .pipe(source(outputName))
      // we need to buffer the output, since many gulp plugins don't support streams.
      .pipe(buffer())
    //.pipe(sourcemaps.init({ loadMaps: true }));
  };
};

export default rollupJS;