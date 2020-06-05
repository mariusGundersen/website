import { html } from "./utils";

export default (contents, file) => html`
  <html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marius Gundersen</title>
    <link rel="icon" type="image/png" href="/favicon.png"></link>
    <meta name="viewport" content="width=700px, initial-scale=0.5"></meta>
    <link rel="stylesheet" href="/style/main.css?v=${(new Date).valueOf()}"></link>
    <link rel="stylesheet" href="/style/tomorrow-night.css?v=${(new Date).valueOf()}"></link>
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

        <!-- Piwik -->
        <script type="text/javascript">
          var pkBaseURL = "//analytics.mariusgundersen.net/";
          document.write(unescape("%3Cscript src='" + pkBaseURL + "piwik.js' type='text/javascript'%3E%3C/script%3E"));
        </script>
        <script type="text/javascript">
          try {
            var piwikTracker = Piwik.getTracker(pkBaseURL + "piwik.php", 1);
            piwikTracker.trackPageView();
            piwikTracker.enableLinkTracking();
          } catch (err) { }
        </script><noscript>
          <p><img src="http://analytics.mariusgundersen.net/piwik.php?idsite=1" style="border:0" alt="" /></p>
        </noscript>
        <!-- End Piwik Tracking Code -->
      </footer>
    </div>
  </body>

  </html>
`;
