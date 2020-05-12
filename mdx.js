import * as babel from '@babel/core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import mdx from '@mdx-js/mdx';
import { MDXProvider } from '@mdx-js/react';
import * as module from 'module';
import * as fs from 'fs';
import { mapContentsAsync } from './utils';

const defaultBabelOptions = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: 'cjs'
      }
    ],
    '@babel/preset-react'
  ]
};

export default ({ mdxOptions = {}, babelOptions = defaultBabelOptions, components = {} } = {}) => mapContentsAsync(async (mdxCode, file) => {
  const jsx = await mdx(mdxCode, mdxOptions);
  const { code } = await babel.transformAsync("import { mdx } from '@mdx-js/react';\n" + jsx, babelOptions);

  const require = createRequire(file.path, mdxOptions, babelOptions);
  const rootElement = createRootElement(code, require);

  const elementWithProvider = React.createElement(
    MDXProvider,
    { components },
    React.createElement(rootElement)
  );

  file.extname = '.html';
  return renderToStaticMarkup(elementWithProvider);
});

function createRootElement(code, require) {
  const exports = {};
  new Function('require', 'exports', code)(require, exports);
  return exports['default'];
}

function createRequire(path, mdxOptions, babelOptions) {
  const require = module.createRequire(path);

  require.extensions['.mdx'] = (module, filename) => {
    const mdxCode = fs.readFileSync(filename, 'utf8');
    const jsx = mdx.sync(mdxCode, { mdxOptions });
    const { code } = babel.transformSync("import { mdx } from '@mdx-js/react';\n" + jsx, babelOptions);
    module._compile(code, filename);
  };

  require.extensions['.jsx'] = (module, filename) => {
    const jsx = fs.readFileSync(filename, 'utf8');
    const { code } = babel.transformSync(jsx, babelOptions);
    module._compile(code, filename);
  };

  return require;
}

