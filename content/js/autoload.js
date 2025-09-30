document.addEventListener('DOMContentLoaded', e => {
  const tags = [...document.querySelectorAll('*:not(:defined)')]
    .map(e => e.localName)
    .filter((name, index, tags) => tags.indexOf(name) === index);

  for (const tag of tags) {
    import(`/js/custom-elements/${tag}.mjs`).then(m => {
      if (m.default) {
        customElements.define(tag, m.default);
      }
    });
  }
})