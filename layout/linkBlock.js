import { html, formatDate } from "./utils";

export default (contents, file) => html`
    <section class="linkBlock clearfix">
      <a href="${file.frontMatter.url ? file.frontMatter.url : '/' + file.slug}"><img src="/${file.slug}/img.png"></a>
      <div>
        <h2><a href="${file.frontMatter.url ? file.frontMatter.url : '/' + file.slug}">${file.frontMatter.title}</a></h2>
        ${ file.frontMatter.short}
        <span class="date">${ formatDate(file.frontMatter.date)}</span>
      </div>
    </section>

`;