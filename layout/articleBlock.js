import { html } from "./utils";
import layout from './index.js';

export default (contents, file) => layout(
  html`
      <section class="articleBlock">
      ${contents}
      </section>

      <div>
        <em>
          Did you find a mistake or have a suggestion for an improvement?
          <a href="https://github.com/mariusGundersen/website/issues/new" target="_blank">Let me know</a>
          or
          <a href="https://github.com/mariusGundersen/website/blob/master/article/${file.slug}/index.md" target="_blank">fork it</a>
          and send me a pull-request.
        </em>
      </div>
  `,
  file
);