import { html } from "./utils";

export default (contents, file) => html`
  <!DOCTYPE html>
  <html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marius Gundersen</title>
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=700px, initial-scale=0.5" />
    <a rel="me" href="https://mastodon.social/@gundersen">Mastodon</a>
    <link rel="stylesheet" href="/style/main.css?v=${(new Date).valueOf()}" />
    <link rel="stylesheet" href="/style/tomorrow-night.css?v=${(new Date).valueOf()}" />
  </head>

  <body>
    <div id="wrapper">

      <header>
        <h1><a href="/">Marius Gundersen</a></h1>
      </header>
      <nav class="clearfix ${file.frontMatter && file.frontMatter.type}">
        <a href="/">
          <span>Work in progress</span>
        </a>
        <a href="/talks">
          <span>Talks</span>

        </a>
      </nav>

      ${contents}

      <footer>
        <div>
          <div id="contactMe">
            <a href="mailto:me@mariusgundersen.com">Email</a>
            <a href="//twitter.com/gundersenMarius">Twitter</a>
            <a href="//github.com/mariusGundersen/">GitHub</a>
            <a href="https://stackoverflow.com/users/1585/marius">Stack Overflow</a>
          </div>
        </div>

        <script type="text/javascript">
          var _paq = window._paq || [];
          /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
          _paq.push(['trackPageView']);
          _paq.push(['enableLinkTracking']);
          (function() {
            var u="//analytics.mariusgundersen.net/";
            _paq.push(['setTrackerUrl', u+'matomo.php']);
            _paq.push(['setSiteId', '1']);
            var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
            g.type='text/javascript'; g.async=true; g.defer=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
          })();
        </script>
      </footer>
    </div>
  </body>

  </html>
`;
