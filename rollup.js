import { rollup } from 'rollup';
import { relative } from 'path';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';
import mdx from 'rollup-plugin-mdx';
import replace from '@rollup/plugin-replace';
import untab from 'untab';
import { mapContentsAsync } from './utils';

const defaultBabelOptions = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: 3,
        modules: false
      }
    ],
    '@babel/preset-react'
  ]
};

const bootstrap = (mdxFile = './index.mdx', element = 'section.articleBlock') => untab`
  import React from 'react';
  import ReactDOM from 'react-dom';
  import MDXComponent from '${mdxFile}';
  const elm = document.querySelector('${element}');
  ReactDOM.hydrate(React.createElement(MDXComponent), elm);
`;

const module = (name, content) => ({
  name: `resolve-${name}`,
  resolveId: id => id !== name ? null : name,
  load: id => id !== name ? null : content
});

let cache;

const rollupMdx = ({ mdxOptions = {}, babelOptions = defaultBabelOptions } = {}) => mapContentsAsync(async (content, file) => {

  const mdxModule = module(file.path, content);

  const bootstrapContent = bootstrap(`./${file.basename}`);

  file.extname = '.js';

  const jsModule = module(file.path, bootstrapContent);

  const bundle = await rollup({
    input: file.path,
    cache,
    plugins: [
      mdxModule,
      jsModule,
      resolve(),
      mdx({
        ...mdxOptions,
        babelOptions
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
        ...babelOptions,
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

  file.sourceMap = result.map;

  return result.code;
});

export default rollupMdx;