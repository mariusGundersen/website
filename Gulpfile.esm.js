import concat from 'gulp-concat';
import { src, dest, series, parallel, watch } from 'gulp';
import filter from 'gulp-filter';
import flatMap from 'gulp-flatmap';
import frontMatter from 'gulp-front-matter';
import merge from 'merge-stream';
import minify from 'gulp-minify-css';
import sort from 'gulp-sort';
import rehypeWaves from 'rehype-waves';
import rehypeHighlight from 'rehype-highlight';
import rehypePrism from '@mapbox/rehype-prism';
import uglify from 'gulp-uglify';

import layout from './layout';
import linkBlock from './layout/linkBlock';
import mdArticle from './layout/mdArticle';
import mdxArticle from './layout/mdxArticle';
import talkBlock from './layout/talkBlock';

import { byDate, setSlug, setType, srcPipe, template, markdown, setExtension } from './utils.js';
import mdx from './mdx';
import tap from 'gulp-tap';
import rollupMdx from './rollup';

const cwd = './src';

const mdxOptions = {
  rehypePlugins: [
    rehypeWaves,
    rehypePrism
  ]
};

export const articles = () => srcPipe('article/*', { cwd },
  flatMap(pageWithImages('src/article')),
  dest('output', { sourcemaps: '.' }),
  filter('**/index.html'),
  sort(byDate),
  template(linkBlock),
  concat('index.html'),
  setType('wip'),
  template(layout),
  dest('output')
);

export const talks = () => srcPipe('talk/*', { cwd },
  flatMap(pageWithImages('src/talk')),
  dest('output'),
  filter('**/index.html'),
  sort(byDate),
  template(talkBlock),
  concat('index.html'),
  setType('talks'),
  template(layout),
  dest('output/talks/')
);

export const css = () => srcPipe('style/*', { sourcemaps: true, cwd },
  minify(),
  dest('output/style', { sourcemaps: true })
);

export const notFound = () => srcPipe('404.md', { cwd },
  markdown(),
  template(layout),
  dest('output')
);

export const favicon = () => srcPipe('favicon.png', { cwd },
  dest('output')
);

const pageWithImages = base => (_stream, file, name = file.relative) => merge(
  markdownPage(base, name),
  mdxPage(base, name),
  mdxApp(base, name),
  src(`${base}/${name}/@(thumbnail|fullsize)/*`, { base }),
  src(`${base}/${name}/img.png`, { base })
);

const markdownPage = (base, name) => srcPipe(`${base}/${name}/index.md`, { base, allowEmpty: true },
  setSlug(name),
  frontMatter(),
  markdown(),
  template(mdArticle)
);

const mdxPage = (base, name) => srcPipe(`${base}/${name}/index.mdx`, { base, allowEmpty: true },
  setSlug(name),
  frontMatter(),
  mdx({
    mdxOptions
  }),
  template(mdxArticle)
);

const mdxApp = (base, name) => srcPipe(`${base}/${name}/index.mdx`, { base, allowEmpty: true },
  frontMatter(),
  rollupMdx({
    mdxOptions
  }),
  uglify()
)

export const build = parallel(articles, talks, css, notFound, favicon);

export const dev = () => {
  watch('src/article/**', { ignoreInitial: false }, articles);
  watch('src/style/*', { ignoreInitial: false }, css)
};

export default build;