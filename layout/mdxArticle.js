import { html } from "./utils";
import mdArticle from './mdArticle.js';

export default (contents, file) => html`
  ${mdArticle(contents, file)}
  <script src="./index.js"></script>
  <link rel="stylesheet" href="/style/waves.css?v=${(new Date).valueOf()}" />
  <link rel="stylesheet" href="/style/vscode-dark.css?v=${(new Date).valueOf()}"></link>
`;