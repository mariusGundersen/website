import * as babel from '@babel/core'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import mdx from '@mdx-js/mdx'
import { MDXProvider } from '@mdx-js/react'
import { createRequire } from 'module';
import * as fs from 'fs';

const defaultBabelConfig = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: 'cjs'
      }
    ]
  ]
};

export default function ({ mdxOptions = {}, babelConfig = defaultBabelConfig, components = {} } = {}) {
  return async (mdxCode, { path }) => {
    const require = createRequire(path);
    require.extensions['.mdx'] = function (module, filename) {
      const mdxCode = fs.readFileSync(filename, 'utf8');
      const jsx = mdx.sync(mdxCode, { mdxOptions });
      const { code } = babel.transformSync("import { mdx } from '@mdx-js/react';\n" + jsx, babelConfig);
      module._compile(code, filename);
    };
    require.extensions['.jsx'] = function (module, filename) {
      const jsx = fs.readFileSync(filename, 'utf8');
      const { code } = babel.transformSync(jsx, babelConfig);
      module._compile(code, filename);
    };

    const jsx = await mdx(mdxCode, { ...mdxOptions, skipExport: true });
    const { code } = await babel.transformAsync("import { mdx } from '@mdx-js/react';\n" + jsx, babelConfig);

    const MDXContent = new Function('require', code + ';\nreturn MDXContent;')(require);

    const element = React.createElement(MDXContent);

    const elementWithProvider = React.createElement(
      MDXProvider,
      { components },
      element
    );

    return renderToStaticMarkup(elementWithProvider);
  };
}