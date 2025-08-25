import { patienceDiffPlus } from './diff.mjs';

class CodeWave extends HTMLElement {
  #currentlyBusy = false;
  #nextCodeBlock = undefined;
  #codeContainer;
  #transformer;
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
              translate: 0%;
              opacity: 1;
          }
          to {
              translate: var(--cw-offset);
              opacity: 0;
          }
      }

      @keyframes cw-slide-in {
          from {
              translate: var(--cw-offset);
              opacity: 0;
          }
          to {
              translate: 0%;
              opacity: 1;
          }
      }

      @keyframes cw-move-new-line {
          from {
              translate: 0 var(--cw-offset);
          }
          to {
              translate: 0 0;
          }
      }

      @keyframes cw-move-old-line {
          from {
              translate: 0 0;
              opacity: 0;
          }
          to {
              translate: 0 var(--cw-offset);
              opacity: 0;
          }
      }
    `);

    document.adoptedStyleSheets.push(sheet);

    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(document.getElementById('code-wave-template').content.cloneNode(true));

    this.#codeContainer = this.shadowRoot.querySelector('.code-container');
    /** @type {HTMLDivElement} */
    this.#transformer = this.shadowRoot.querySelector('.transformer');

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
      const to = pres[index];
      console.log('to', to)
      if (this.#currentlyBusy) {
        this.#nextCodeBlock = to;
      } else {
        this.transition(to);
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
    this.#transformer.style.scale = this.#codeContainer.clientWidth / current.clientWidth;
  }

  disconnectedCallback() {
    this.io.disconnect();
  }

  /**
   *
   * @param {HTMLPreElement} newPre
   */
  transition(newPre) {
    /** @type {HTMLPreElement} */
    const oldPre = this.querySelector('pre[slot="code"]');
    if (oldPre && newPre && oldPre !== newPre) {
      const backwards = isElmSiblingOf(oldPre, newPre);
      this.#currentlyBusy = true;
      this.#nextCodeBlock = undefined;

      const oldLines = oldPre.firstElementChild.children;
      const newLines = newPre.firstElementChild.children;
      const diff = patienceDiffPlus(
        Array.from(oldLines).map(c => c.textContent),
        Array.from(newLines).map(c => c.textContent));
      console.log(diff);
      const hasRemove = diff.lineCountDeleted > 0 ? 1 : 0;
      const hasInsert = diff.lineCountInserted > 0 ? 1 : 0;
      const hasMove = diff.lines.some(({ aIndex, bIndex }) => aIndex !== bIndex && aIndex !== -1 && bIndex !== -1) ? 1 : 0;
      const moveDelay = hasRemove;
      const insertDelay = hasRemove + hasMove;
      console.log('delays', moveDelay, insertDelay)
      newPre?.setAttribute('slot', 'code-new');
      this.#transformer.style.isolation = 'isolate';
      for (const { aIndex, bIndex, line } of diff.lines) {
        if (bIndex === -1) {
          const oldLine = oldLines[aIndex];
          oldLine.style.setProperty('--cw-offset', backwards ? '-100%' : '100%')
          oldLine.style.animation = 'cw-slide-out ease-in 1s 0s both';
        } else if (aIndex === -1) {
          const newLine = newLines[bIndex];
          newLine.style.setProperty('--cw-offset', backwards ? '100%' : '-100%')
          newLine.style.animation = `cw-slide-in ease-out 1s ${insertDelay}s both`;
        } else if (aIndex !== bIndex) {
          const oldLine = oldLines[aIndex];
          const newLine = newLines[bIndex];
          oldLine.style.opacity = '0';
          //oldLines.style.animation = `cw-move-old-line 0s ease-in-out ${moveDelay}s both`;
          //oldLine.style.setProperty('--cw-offset', `${bIndex - aIndex}lh`)
          newLine.style.animation = `cw-move-new-line 1s ease-in-out ${moveDelay}s both`;
          newLine.style.setProperty('--cw-offset', `${aIndex - bIndex}lh`)
        } else {
          const oldLine = oldLines[aIndex];
          oldLine.style.opacity = '0';

        }
      }

      const duration = (hasRemove + hasMove + hasInsert);

      this.#transformer.style.transitionDuration = '1s';
      this.#transformer.style.scale = this.#codeContainer.clientWidth / newPre.clientWidth;

      setTimeout(() => {
        console.log('animation-end');
        oldPre.removeAttribute('slot');
        for (const line of oldLines) {
          line.style.animation = '';
          line.style.opacity = '';
        }
        for (const line of newLines) {
          line.style.animation = '';
        }
        newPre.setAttribute('slot', 'code');
        this.#transformer.style.isolation = 'auto';
        if (this.#nextCodeBlock) {
          this.transition(this.#nextCodeBlock);
        } else {
          this.#currentlyBusy = false;
        }
      }, 1000 * duration);
    } else {
      this.#currentlyBusy = false;
      this.#nextCodeBlock = undefined;
    }
  }
}

customElements.define('code-wave', CodeWave);

function isElmSiblingOf(a, b) {
  while (a) {
    if (a === b) return true;
    a = a.nextElementSibling;
  }
  return false;
}