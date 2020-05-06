import concat from 'gulp-concat';
import { src, dest, series, parallel, watch } from 'gulp';
import filter from 'gulp-filter';
import flatMap from 'gulp-flatmap';
import frontMatter from 'gulp-front-matter';
import merge from 'merge-stream';
import minify from 'gulp-minify-css';
import sort from 'gulp-sort';
import layout from './layout';
import linkBlock from './layout/linkBlock';
import articleBlock from './layout/articleBlock';
import talkBlock from './layout/talkBlock';

import { byDate, setSlug, setType, srcPipe, template, markdown } from './utils.js';

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
  markdownPage(base, name),
  src(`${base}/${name}/@(thumbnail|fullsize)/*`, { base }),
  src(`${base}/${name}/img.png`, { base })
);

const markdownPage = (base, name) => srcPipe(`${base}/${name}/index.md`, { base },
  setSlug(name),
  frontMatter(),
  markdown(),
  template(articleBlock),
  template(layout)
);

export const build = parallel(articles, talks, css, notFound, favicon);

export const dev = series(build, () => {
  watch('article/**', articles);
  watch('style/*', css)
});

export default build;