class CodeWave extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    const elms = this.children;

    let pres = [];
    let chunks = [];
    let chunk = document.createElement('div');
    chunk.className = 'text';

    this.io = new IntersectionObserver((entries, observer) => {
      console.log('intersect', entries);
      const target = entries.find(e => e.isIntersecting)?.target;
      if (!target) return;
      console.log('target', target);
      const index = chunks.indexOf(target);
      if (index < 0) return;
      console.log('index', index);
      this.querySelector('pre[slot="code"]')?.removeAttribute('slot');
      pres[index]?.setAttribute('slot', 'code');
    }, {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    })

    for (const elm of Array.from(elms)) {
      if (elm instanceof HTMLPreElement) {
        console.log(elm);
        pres.push(elm);
        if (chunk.hasChildNodes()) {
          chunks.push(chunk);
          elm.before(chunk);
          chunk = document.createElement('div');
          chunk.className = 'text';
          this.io.observe(chunk);
        }
      } else if (elm instanceof HTMLDivElement) {

      } else {
        chunk.append(elm);
      }
    }

    console.log(pres, chunks)

    this.querySelector('& > pre').setAttribute('slot', 'code');

    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(document.getElementById('code-wave-template').content.cloneNode(true));
  }

  disconnectedCallback() {
    this.io.disconnect();
  }
}

customElements.define('code-wave', CodeWave);