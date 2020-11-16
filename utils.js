import gulpMarkdown from 'gulp-markdown';
import tap from 'gulp-tap';
import marked from 'marked';
import { Transform } from 'stream';
import { html } from './layout/utils';

function createRenderer() {
  const renderer = new marked.Renderer();

  renderer.image = (href, title, text) => html`<a class="imageLink" href="fullsize/${href}"><img src="thumbnail/${href}" /></a>`;

  return renderer;
}

const markdownConfig = {
  highlight(code) {
    return require('highlight.js').highlightAuto(code).value;
  },
  renderer: createRenderer(),
  gfm: true
};

export const mapAsync = func => new Transform({
  transform(chunk, _encoding, cb) {
    Promise.resolve(chunk)
      .then(func)
      .then(
        r => cb(null, r),
        e => cb(e));
  },
  objectMode: true
});

export const mapContentsAsync = func => mapAsync(async file => {
  const result = await func(file.contents.toString('utf8'), file);
  file.contents = Buffer.from(result);
  return file;
});

export const markdown = () => gulpMarkdown(markdownConfig);

export const byDate = (a, b) => b.frontMatter.date.localeCompare(a.frontMatter.date);
export const setSlug = name => tap(f => f.slug = name);
export const setType = type => tap(f => f.frontMatter.type = type);
export const setExtension = ext => tap(f => f.extname = `.${ext}`);
export const template = layout => tap(file => file.contents = Buffer.from(layout(file.contents.toString('utf-8'), file)))