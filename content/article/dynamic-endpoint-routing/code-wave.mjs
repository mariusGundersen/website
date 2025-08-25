import { patienceDiffPlus } from './diff.mjs';

class CodeWave extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    const elms = this.children;

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(/*css*/`
      html {
        scroll-snap: y proximity;
      }

      @keyframes cw-slide-out {
          from {
              translate: 0;
              opacity: 1;
              mix-blend-mode: plus-lighter;
          }
          to {
              translate: -100%;
              opacity: 0;
              mix-blend-mode: plus-lighter;
          }
      }

      @keyframes cw-slide-in {
          from {
              translate: 100%;
              opacity: 0;
              mix-blend-mode: plus-lighter;
          }
          to {
              translate: 0%;
              opacity: 1;
              mix-blend-mode: plus-lighter;
          }
      }

      @keyframes cw-move-from {
          from {
              translate: 0 var(--cw-offset);
              opacity: 0;
              mix-blend-mode: plus-lighter;
          }
          to {
              translate: 0 0;
              opacity: 1;
              mix-blend-mode: plus-lighter;
          }
      }

      @keyframes cw-move-to {
          from {
              translate: 0 0;
              opacity: 1;
              mix-blend-mode: plus-lighter;
          }
          to {
              translate: 0 var(--cw-offset);
              opacity: 0;
              mix-blend-mode: plus-lighter;
          }
      }
    `);

    document.adoptedStyleSheets.push(sheet);

    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(document.getElementById('code-wave-template').content.cloneNode(true));

    const codeContainer = this.shadowRoot.querySelector('.code-container');
    /** @type {HTMLDivElement} */
    const transformer = this.shadowRoot.querySelector('.transformer');

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
      console.log('to', to)
      if (from && to && from !== to) {
        const diff = patienceDiffPlus(
          Array.from(from.firstElementChild.children).map(c => c.textContent),
          Array.from(to.firstElementChild.children).map(c => c.textContent));
        console.log(diff);
        const hasRemove = diff.lineCountDeleted > 0 ? 1 : 0;
        const hasInsert = diff.lineCountInserted > 0 ? 1 : 0;
        const hasMove = diff.lines.some(({ aIndex, bIndex }) => aIndex !== bIndex && aIndex !== -1 && bIndex !== -1) ? 1 : 0;
        const moveDelay = hasRemove;
        const insertDelay = hasRemove + hasMove;
        console.log('delays', moveDelay, insertDelay)
        to?.setAttribute('slot', 'code-new');
        transformer.style.isolation = 'isolate';
        for (const { aIndex, bIndex, line } of diff.lines) {
          if (bIndex === -1) {
            from.firstElementChild.children[aIndex].style.animation = 'cw-slide-out ease-in 1s 0s both';
          } else if (aIndex === -1) {
            to.firstElementChild.children[bIndex].style.animation = `cw-slide-in ease-out 1s ${insertDelay}s both`;
          } else if (aIndex !== bIndex) {
            const fromLine = from.firstElementChild.children[aIndex];
            const toLine = to.firstElementChild.children[bIndex];
            fromLine.style.animation = `cw-move-to 1s ease-in-out ${moveDelay}s both`;
            fromLine.style.setProperty('--cw-offset', `${bIndex - aIndex}lh`)
            toLine.style.animation = `cw-move-from 1s ease-in-out ${moveDelay}s both`;
            to.style.setProperty('--cw-offset', `${aIndex - bIndex}lh`)
          }
        }

        const duration = (hasRemove + hasMove + hasInsert);

        transformer.style.transitionDuration = `${moveDelay}s`
        transformer.style.scale = codeContainer.clientWidth / to.clientWidth;

        setTimeout(() => {
          console.log('animation-end');
          from.removeAttribute('slot');
          to.setAttribute('slot', 'code');
          transformer.style.isolation = 'auto';
        }, 1000 * duration);
      }

      this.querySelector('div.text.current')?.classList.remove('current');
      to?.nextElementSibling.classList.add('current');

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
    transformer.style.scale = codeContainer.clientWidth / current.clientWidth;
  }

  disconnectedCallback() {
    this.io.disconnect();
  }
}

customElements.define('code-wave', CodeWave);