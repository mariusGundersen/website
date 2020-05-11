import { html } from "./utils";
import mdArticle from './mdArticle.js';

export default (contents, file) => html`
  ${mdArticle(contents, file)}
  <script src="./index.js"></script>
`;