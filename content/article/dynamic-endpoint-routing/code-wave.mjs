import { patienceDiffPlus } from './diff.mjs';

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
      const from = this.querySelector('pre[slot="code"]');
      const to = pres[index];
      if (from && to) {
        const diff = patienceDiffPlus(
          Array.from(from.firstElementChild.children).map(c => c.textContent),
          Array.from(to.firstElementChild.children).map(c => c.textContent));
        console.log(diff);
      }
      from?.removeAttribute('slot');
      to?.setAttribute('slot', 'code');

      this.querySelector('div.text.current')?.classList.remove('current');
      to?.nextElementSibling.classList.add('current');

      if (to) {
        console.log(to.clientWidth);
        to.style.scale = this.shadowRoot.querySelector('.code-container').clientWidth / to.clientWidth
      }
    }, {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    })

    for (const elm of Array.from(elms)) {
      if (elm instanceof HTMLPreElement) {
        elm.firstElementChild.innerHTML = elm.firstElementChild.innerHTML.split('\n').map(l => `<span style="display: block; min-height: 1lh;">${l}</span>`).join('');
        pres.push(elm);
        if (chunk.hasChildNodes()) {
          console.log(elm, chunk);
          chunks.push(chunk);
          elm.before(chunk);
          this.io.observe(chunk);
          chunk = document.createElement('div');
          chunk.className = 'text';
        }
      } else if (elm instanceof HTMLDivElement && elm.className === 'text') {

      } else {
        chunk.append(elm);
      }
    }

    console.log(pres, chunks)

    const current = this.querySelector('& > pre');
    current.setAttribute('slot', 'code');
    current.nextElementSibling.classList.add('current');

    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(document.getElementById('code-wave-template').content.cloneNode(true));

    this.ownerDocument.documentElement.style.scrollSnapType = 'y proximity';
  }

  disconnectedCallback() {
    this.io.disconnect();
  }
}

customElements.define('code-wave', CodeWave);