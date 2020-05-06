import { html, date } from "./utils";

export default (contents, file) => html`
    <section class="linkBlock clearfix">
      <a href="${file.frontMatter.site}" target="_blank"><img src="/${file.slug}/img.png"></a>
      <div class="talks-box">
        <a href="${file.frontMatter.site}" target="_blank"><h2>${file.frontMatter.title}</h2></a>
        ${file.frontMatter.short}
        <div class="link-button-box">
          <a href="${file.frontMatter.slides}" target="_blank" class="link-button">Slides</a>
          ${file.frontMatter.video ? html`<a href="${file.frontMatter.video}" target="_blank" class="link-button">Video</a>` : ''}
        </div>
        <span class="date">${date(file.frontMatter.date, "MMMM Do YYYY")}</span>
      </div>
    </section>
`;