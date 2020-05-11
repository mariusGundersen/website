import { rollup } from 'rollup';
import { relative } from 'path';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import mdx from 'rollup-plugin-mdx';
import replace from '@rollup/plugin-replace';
import frontMatter from 'front-matter';
import untab from 'untab';

const rootFile = (name) => ({
  name: 'source',
  resolveId: id => id !== name ? null : name,
  load: id => id !== name ? null : untab`
    import React from 'react';
    import ReactDOM from 'react-dom';
    import MDXComponent from './index.mdx';
    const elm = document.querySelector('section.articleBlock');
    ReactDOM.render(React.createElement(MDXComponent), elm);
  `
});

const deFrontMatter = () => ({
  transform(code, id) {
    if (!id.endsWith('.mdx')) return null;

    const content = frontMatter(code);

    return {
      code: content.body,
      map: null
    };
  }
})

let cache;

const rollupJS = ({ mdxOptions = {} } = {}) => {
  return async file => {
    const bundle = await rollup({
      input: file.path,
      cache,
      plugins: [
        rootFile(file.path),
        resolve(),
        deFrontMatter(),
        mdx({
          ...mdxOptions
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
          exclude: /node_modules/,
          sourceMaps: true
        })
      ]
    });

    const { output } = await bundle.generate({
      format: 'iife',
      sourcemap: true,
      sourcemapFile: 'index.map.js',
      sourcemapPathTransform: p => relative(file.dirname, p)
    });

    const result = output[0];

    file.contents = Buffer.from(result.code);
    file.sourceMap = result.map;

    return file;
  };
};

export default rollupJS;