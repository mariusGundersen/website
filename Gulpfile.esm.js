import concat from 'gulp-concat';
import { src, dest, series, parallel, watch } from 'gulp';
import filter from 'gulp-filter';
import flatMap from 'gulp-flatmap';
import frontMatter from 'gulp-front-matter';
import merge from 'merge-stream';
import minify from 'gulp-minify-css';
import sort from 'gulp-sort';
import rehypeHighlight from 'rehype-highlight';

import layout from './layout';
import linkBlock from './layout/linkBlock';
import articleBlock from './layout/articleBlock';
import talkBlock from './layout/talkBlock';

import { byDate, setSlug, setType, srcPipe, template, markdown, mapAsync, mapContentsAsync, setExtension } from './utils.js';
import mdx from './mdx';
import tap from 'gulp-tap';

const cwd = './src';

export const articles = () => srcPipe('article/*', { cwd },
  flatMap(pageWithImages('src/article')),
  dest('./output/'),
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
  merge(
    markdownPage(base, name),
    mdxPage(base, name),
  ).pipe(template(articleBlock)),
  src(`${base}/${name}/@(thumbnail|fullsize)/*`, { base }),
  src(`${base}/${name}/img.png`, { base })
);

const markdownPage = (base, name) => srcPipe(`${base}/${name}/index.md`, { base, allowEmpty: true },
  setSlug(name),
  frontMatter(),
  markdown()
);

const mdxPage = (base, name) => srcPipe(`${base}/${name}/index.mdx`, { base, allowEmpty: true },
  setSlug(name),
  frontMatter(),
  mapContentsAsync(mdx({
    mdxOptions: {
      rehypePlugins: [rehypeHighlight]
    }
  })),
  setExtension('html')
);

export const build = parallel(articles, talks, css, notFound, favicon);

export const dev = series(build, () => {
  watch('src/article/**', articles);
  watch('src/style/*', css)
});

export default build;