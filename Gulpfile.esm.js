import rehypePrism from '@mapbox/rehype-prism';
import express from 'express';
import { dest, parallel, series, src as gulpSrc, watch } from 'gulp';
import concat from 'gulp-concat';
import filter from 'gulp-filter';
import flatMap from 'gulp-flatmap';
import frontMatter from 'gulp-front-matter';
import minify from 'gulp-minify-css';
import plumber from 'gulp-plumber';
import sort from 'gulp-sort';
import uglify from 'gulp-uglify-es';
import merge from 'merge-stream';
import * as path from 'path';
import rehypeKatex from 'rehype-katex';
import rehypeWaves from 'rehype-waves';
import remarkMath from 'remark-math';
import layout from './layout';
import linkBlock from './layout/linkBlock';
import mdArticle from './layout/mdArticle';
import mdxArticle from './layout/mdxArticle';
import talkBlock from './layout/talkBlock';
import mdx from './mdx';
import rollupMdx from './rollup';
import { byDate, markdown, setSlug, setType, template } from './utils.js';

const src = (...args) => gulpSrc(...args).pipe(plumber());

const cwd = './src';

const mdxOptions = {
  remarkPlugins: [
    remarkMath
  ],
  rehypePlugins: [
    [rehypeKatex, { output: 'html', trust: true }],
    rehypeWaves,
    rehypePrism,
  ]
};

export const articles = () => src('article/*', { cwd })
  .pipe(flatMap(pageWithImages('src/article')))
  .pipe(dest('output', { sourcemaps: '.' }))
  .pipe(filter('**/index.html'))
  .pipe(sort(byDate))
  .pipe(template(linkBlock))
  .pipe(concat('index.html'))
  .pipe(setType('wip'))
  .pipe(template(layout))
  .pipe(dest('output'));

export const talks = () => src('talk/*', { cwd })
  .pipe(flatMap(pageWithImages('src/talk')))
  .pipe(dest('output'))
  .pipe(filter('**/index.html'))
  .pipe(sort(byDate))
  .pipe(template(talkBlock))
  .pipe(concat('index.html'))
  .pipe(setType('talks'))
  .pipe(template(layout))
  .pipe(dest('output/talks/'));

export const css = () => src('style/*', { sourcemaps: true, cwd })
  .pipe(minify())
  .pipe(dest('output/style', { sourcemaps: true }));

export const notFound = () => src('404.md', { cwd })
  .pipe(markdown())
  .pipe(template(layout))
  .pipe(dest('output'));

export const favicon = () => src('favicon.png', { cwd })
  .pipe(dest('output'));

const pageWithImages = base => (_stream, file, name = file.relative) => merge(
  markdownPage(base, name),
  mdxPage(base, name),
  mdxApp(base, name),
  src(`${base}/${name}/@(thumbnail|fullsize)/*`, { base }),
  src(`${base}/${name}/img.png`, { base })
);

const markdownPage = (base, name) => src(`${base}/${name}/index.md`, { base, allowEmpty: true })
  .pipe(setSlug(name))
  .pipe(frontMatter())
  .pipe(markdown())
  .pipe(template(mdArticle));

const mdxPage = (base, name) => src(`${base}/${name}/index.mdx`, { base, allowEmpty: true })
  .pipe(setSlug(name))
  .pipe(frontMatter())
  .pipe(mdx({
    mdxOptions
  }))
  .pipe(template(mdxArticle));

const mdxApp = (base, name) => src(`${base}/${name}/index.mdx`, { base, allowEmpty: true })
  .pipe(frontMatter())
  .pipe(rollupMdx({
    mdxOptions
  }))
  .pipe(uglify());

export const build = parallel(articles, talks, css, notFound, favicon);

export const dev = series(build, () => {
  watch('src/article/**', { ignoreInitial: true })
    .on('change', file => {
      const folder = file
        .split(path.sep)
        .filter((_, i) => i > 0 && i < 3)
        .join('/');

      console.log('Changed:', folder, file);
      console.time('change');
      src(folder, { cwd })
        .pipe(flatMap(pageWithImages('src/article')))
        .pipe(dest('output', { sourcemaps: '.' }))
        .on('end', e => console.timeEnd('change'))
        .on('error', e => console.error(e));
    })
    .on('error', e => console.error(e));
  watch('src/style/*', { ignoreInitial: false }, css);

  express()
    .use(express.static('output', {
      etag: false,
      lastModified: false,
      maxAge: '1s'
    }))
    .use((_, res) => res.sendFile(__dirname + '/output/404.html'))
    .listen(3000);
});

export default build;