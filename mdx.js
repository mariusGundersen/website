import * as babel from '@babel/core';
import mdx from '@mdx-js/mdx';
import { MDXProvider } from '@mdx-js/react';
import * as fs from 'fs';
import { createRequire } from 'module';
import { dirname, relative } from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { mapContentsAsync } from './utils';

// a hack to make React stop complaining when rendering to string
React.useLayoutEffect = React.useEffect;

const defaultBabelOptions = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: 'cjs'
      }
    ],
    '@babel/preset-react',
    [
      '@babel/preset-typescript',
      {
        //isTSX: true,

      }
    ]
  ]
};

export default (options = {}) => mapContentsAsync(async (mdxCode, file) => {
  file.extname = '.html';
  return await mdxToHtml(mdxCode, file.path, options);
});

async function mdxToHtml(mdxCode, path, { mdxOptions = {}, babelOptions = defaultBabelOptions, components = {} }) {
  const require = createTranspilingRequire(path, mdxOptions, babelOptions);

  const jsxCode = await mdx(mdxCode, mdxOptions);
  const { code } = await babel.transformAsync("import { mdx } from '@mdx-js/react';\n" + jsxCode, { ...babelOptions, filename: 'index.mdx' });

  const layoutComponent = getDefaultExportFromModule(code, require);

  const elementWithProvider = React.createElement(
    MDXProvider,
    { components },
    React.createElement(layoutComponent));

  return renderToString(elementWithProvider);
}

function getDefaultExportFromModule(code, require) {
  const exports = {};
  new Function('require', 'exports', code)(require, exports);
  return exports['default'];
}

function createTranspilingRequire(path, mdxOptions, babelOptions) {
  const require = createRequire(path);

  for (const key of Object.keys(require.cache).filter(isWithin(dirname(path)))) {
    delete require.cache[key];
  }

  require.extensions['.mdx'] = (module, filename) => {
    const mdxCode = fs.readFileSync(filename, 'utf8');
    const jsxCode = mdx.sync(mdxCode, mdxOptions);
    const { code } = babel.transformSync("import { mdx } from '@mdx-js/react';\n" + jsxCode, { ...babelOptions, filename });
    module._compile(code, filename);
  };

  require.extensions['.jsx'] = require.extensions['.tsx'] = (module, filename) => {
    const jsxCode = fs.readFileSync(filename, 'utf8');
    const { code } = babel.transformSync(jsxCode, { ...babelOptions, filename });
    module._compile(code, filename);
  };

  return require;
}

const isWithin = path => file => !relative(path, file).includes('..');
