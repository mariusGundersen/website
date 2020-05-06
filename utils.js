
import marked from 'marked';
import tap from 'gulp-tap';
import gulpMarkdown from 'gulp-markdown';
import { src } from 'gulp';
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

export const markdown = () => gulpMarkdown(markdownConfig);

export const byDate = (a, b) => b.frontMatter.date.localeCompare(a.frontMatter.date);
export const setSlug = name => tap(f => f.slug = name);
export const setType = type => tap(f => f.frontMatter.type = type);
export const template = layout => tap(file => file.contents = Buffer.from(layout(file.contents.toString('utf-8'), file)))
export const srcPipe = (path, srcOptions, ...steps) => steps.reduce((value, step) => value.pipe(step), src(path, srcOptions));
