import mdx from '@mdx-js/mdx';
import * as babel from '@babel/core';


const defaultBabelOptions = {
  presets: [
    ['@babel/preset-env', {
      modules: 'cjs'
    }],
    ['@babel/preset-react', {
      useBuiltIns: true
    }]
  ]
};

const input = `
# Test

<h2 style={{color: 'red'}}>
  Test
</h2>
`;


const result = mdx.sync(input, { skipExport: false });

//console.log(result);


//console.log('------------------')
const output = babel.transformSync("import { mdx } from '@mdx-js/react';\n" + result, defaultBabelOptions);

console.log(output.code);

/*
const source = `
  import * as React from 'react';
  import { MDXProvider } from '@mdx-js/react';
  import MDXContent from './index.mdx';

  export default () => (
    <MDXProvider components={components}>
      <MDXContent />
    </MDXProvider>
  );
`;
const output = babel.transformSync(source, defaultBabelOptions);

console.log(output.code);*/

