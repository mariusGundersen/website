import concat from 'gulp-concat';
import { src, dest, series, watch } from 'gulp';
import filter from 'gulp-filter';
import forEach from 'gulp-foreach';
import frontMatter from 'gulp-front-matter';
import markdown from 'gulp-markdown';
import marked from 'marked';
import merge from 'merge-stream';
import minify from 'gulp-minify-css';
import moment from 'moment';
import sort from 'gulp-sort';
import sourcemaps from 'gulp-sourcemaps';
import through from 'through2';
import wrap from 'gulp-wrap-layout';

const content = () => src('article/*')
  .pipe(forEach(function (stream, file) {
    const name = file.relative;
    console.log(name);
    const article = buildArticle(name);
    const images = src('article/' + name + '/@(thumbnail|fullsize)/*', { base: 'article', allowEmpty: true });
    const img = src('article/' + name + '/img.png', { base: 'article', allowEmpty: true });
    return merge(article, images, img);
  }))
  .pipe(dest('output'))
  .pipe(filter('**/index.html'))
  .pipe(sort((a, b) => a.frontMatter.date < b.frontMatter.date ? 1 : -1))
  .pipe(wrap({ src: 'linkBlock.ejs' }, {
    date: (date, format) => moment(date).format(format)
  }))
  .pipe(concat('index.html'))
  .pipe(through.obj(function (file, _, done) {
    file.frontMatter.type = 'wip';
    this.push(file);
    done();
  }))
  .pipe(wrap({ src: 'wrapper.ejs' }))
  .pipe(dest('output'))

const talks = () => src('talk/*')
  .pipe(forEach(function (stream, file) {
    const name = file.relative;
    console.log(name);
    const talk = buildTalk(name);
    const img = src('talk/' + name + '/img.png', { base: 'talk' });
    return merge(talk, img);
  }))
  .pipe(dest('output'))
  .pipe(filter('**/index.html'))
  .pipe(sort((a, b) => a.frontMatter.date < b.frontMatter.date ? 1 : -1))
  .pipe(wrap({ src: 'talkBlock.ejs' }, {
    date: (date, format) => moment(date).format(format)
  }))
  .pipe(concat('index.html'))
  .pipe(through.obj(function (file, _, done) {
    file.frontMatter.type = 'talks';
    this.push(file);
    done();
  }))
  .pipe(wrap({ src: 'wrapper.ejs' }))
  .pipe(dest('output/talks'));

const css = () => src('style/*')
  .pipe(sourcemaps.init())
  .pipe(minify())
  .pipe(sourcemaps.write('.'))
  .pipe(dest('output/style'));

const notFound = () => src('404.md')
  .pipe(markdown())
  .pipe(wrap({ src: 'wrapper.ejs' }))
  .pipe(dest('output'));

const favicon = () => src('favicon.png')
  .pipe(dest('output'));

const buildTalk = (name) => src('talk/' + name + '/index.md', { base: 'talk' })
  .pipe(setSlug(name))
  .pipe(frontMatter({
    property: 'frontMatter',
    remove: true
  }))
  .pipe(markdown())

const buildArticle = (name) => src('article/' + name + '/index.md', { base: 'article', allowEmpty: true })
  .pipe(setSlug(name))
  .pipe(frontMatter({
    property: 'frontMatter',
    remove: true
  }))
  .pipe(markdown({
    highlight(code) {
      return require('highlight.js').highlightAuto(code).value;
    },
    renderer: createRenderer(),
    gfm: true
  }))
  .pipe(wrap({ src: 'template.ejs' }))
  .pipe(wrap({ src: 'wrapper.ejs' }))

const setSlug = name => through.obj({ objectMode: true }, function (file, _, done) {
  file.slug = name;
  this.push(file);
  done();
});


function createRenderer() {
  const renderer = new marked.Renderer();

  renderer.image = (href, title, text) => '<a class="imageLink" href="fullsize/' + href + '"><img src="thumbnail/' + href + '" /></a>';

  return renderer;
}

const build = series(content, talks, css, notFound, favicon);

const watchContent = series(build, function () {
  watch('article/*', content);
});

export { build, watchContent as watch };
export default build;