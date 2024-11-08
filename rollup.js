import babelPlugin from '@rollup/plugin-babel';
import cjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import resolvePlugin from '@rollup/plugin-node-resolve';
import replacePlugin from '@rollup/plugin-replace';
import { relative } from 'path';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { rollup } from 'rollup';
import mdxPlugin from 'rollup-plugin-mdx';
import nodePlugin from 'rollup-plugin-node-builtins';
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
  document.addEventListener('DOMContentLoaded', e => {
    const elm = document.querySelector('${element}');
    ReactDOM.hydrate(React.createElement(MDXComponent), elm);
  });
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
      resolvePlugin(),
      mdxPlugin({
        ...mdxOptions,
        babelOptions
      }),
      replacePlugin({
        'process.env.NODE_ENV': "'production'"
      }),
      cjsPlugin({
        namedExports: {
          'react': Object.keys(React).filter(x => x != 'default'),
          'react-dom': Object.keys(ReactDOM).filter(x => x != 'default')
        }
      }),
      babelPlugin({
        ...babelOptions,
        babelHelpers: 'bundled',
        exclude: /node_modules/,
        sourceMaps: true
      }),
      jsonPlugin(),
      nodePlugin()
    ]
  });

  cache = bundle.cache;

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