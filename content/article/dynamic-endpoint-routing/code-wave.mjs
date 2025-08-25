import { patienceDiff } from './diff.mjs';

class CodeWave extends HTMLElement {
  #pres = [];
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
              opacity: var(--cw-opacity);
          }
      }

      @keyframes cw-move-new-line {
          from {
              translate: 0 var(--cw-offset);
          }
          to {
              translate: 0 0;
              opacity: var(--cw-opacity);
          }
      }
    `);

    document.adoptedStyleSheets.push(sheet);

    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(document.getElementById('code-wave-template').content.cloneNode(true));

    this.#codeContainer = this.shadowRoot.querySelector('.code-container');
    /** @type {HTMLDivElement} */
    this.#transformer = this.shadowRoot.querySelector('.transformer');

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
      const to = this.#pres[index];
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
        elm.firstElementChild.innerHTML = elm.firstElementChild.innerHTML
          .split('\n')
          .map(l => `<span style="display: block; min-height: 1lh;">${l}</span>`)
          .join('');

        for (const line of elm.firstElementChild.children) {
          if (line.firstElementChild?.tagName === 'MARK') {
            line.append(...line.firstElementChild.childNodes);
            line.firstElementChild.remove();
            line.setAttribute('data-highlight', 'true');
          }
        }

        this.#pres.push(elm);
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

    console.log(this.#pres, chunks)

    const current = this.querySelector('& > pre');
    current.setAttribute('slot', 'code');
    current.nextElementSibling.classList.add('current');
    this.transform(current);
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
      const oldPreIndex = this.#pres.indexOf(oldPre);
      const newPreIndex = this.#pres.indexOf(newPre);
      const forward = newPreIndex > oldPreIndex;
      this.#currentlyBusy = true;
      this.#nextCodeBlock = undefined;

      const oldLines = Array.from(oldPre.firstElementChild.children);
      const newLines = Array.from(newPre.firstElementChild.children);
      const diff = patienceDiff(
        oldLines.map(c => c.textContent),
        newLines.map(c => c.textContent));
      console.log(diff);

      /** @type {HTMLElement[]} */
      const linesOfInterest = [];
      if (newPre.querySelectorAll('[data-highlight]').length > 0) {
        newPre.querySelectorAll('[data-highlight]').forEach(elm => linesOfInterest.push(elm));
      } else if (oldPreIndex + 1 !== newPreIndex) {
        const diff = patienceDiff(
          Array.from(this.#pres[newPreIndex - 1]?.firstElementChild.children ?? []).map(c => c.textContent),
          newLines.map(c => c.textContent));
        for (const { aIndex, bIndex } of diff.lines) {
          if (aIndex === -1) {
            linesOfInterest.push(newLines[bIndex]);
          }
        }
      } else {
        for (const { aIndex, bIndex } of diff.lines) {
          if (aIndex === -1) {
            linesOfInterest.push(newLines[bIndex]);
          }
        }
      }

      const firstLineOfInterest = newLines.indexOf(linesOfInterest.at(0));
      const lastLineOfInterest = newLines.indexOf(linesOfInterest.at(-1));

      const removeDuration = 0.3;
      const moveDuration = 0.5;
      const insertDuration = 0.4;

      const hasRemove = diff.lineCountDeleted > 0 ? removeDuration : 0;
      const hasInsert = diff.lineCountInserted > 0 ? insertDuration : 0;
      const hasMove = diff.lines.some(({ aIndex, bIndex }) => aIndex !== bIndex && aIndex !== -1 && bIndex !== -1) ? moveDuration : 0;
      let removeDelay = 0;
      const moveDelay = hasRemove;
      let insertDelay = hasRemove + hasMove;
      console.log('delays', moveDelay, insertDelay)
      newPre.setAttribute('slot', 'code-new');
      this.#transformer.style.isolation = 'isolate';
      for (const { aIndex, bIndex } of diff.lines) {
        if (bIndex === -1) {
          const oldLine = oldLines[aIndex];
          oldLine.style.setProperty('--cw-offset', forward ? '-250px' : '250px')
          oldLine.style.animation = `cw-slide-out ease-in ${removeDuration}s ${removeDelay}s both`;
          removeDelay += 0.01;
        } else if (aIndex === -1) {
          const newLine = newLines[bIndex];
          newLine.style.setProperty('--cw-opacity', linesOfInterest.includes(newLine) ? '1' : '0.4');
          newLine.style.setProperty('--cw-offset', forward ? '250px' : '-250px')
          newLine.style.animation = `cw-slide-in ease-out ${insertDuration}s ${insertDelay}s both`;
          insertDelay += 0.01
        } else {
          const oldLine = oldLines[aIndex];
          const newLine = newLines[bIndex];
          newLine.style.opacity = window.getComputedStyle(oldLine).getPropertyValue('opacity');
          oldLine.style.opacity = '0';
          oldLine.style.animation = '';
          newLine.style.animation = `cw-move-new-line ${moveDuration}s ease-in-out ${moveDelay}s both`;
          newLine.style.setProperty('--cw-offset', `${aIndex - bIndex}lh`);
          newLine.style.setProperty('--cw-opacity', linesOfInterest.includes(newLine) ? '1' : '0.4');
        }
      }

      const duration = (insertDelay + hasInsert);

      this.#transformer.style.transitionDuration = '1s';
      console.log('y', firstLineOfInterest, lastLineOfInterest)
      this.transform(
        newPre,
        (firstLineOfInterest + lastLineOfInterest) / 2 / (newLines.length - 1),
        (lastLineOfInterest - firstLineOfInterest) / (newLines.length - 1));

      setTimeout(() => {
        console.log('animation-end');
        oldPre.removeAttribute('slot');
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

  transform(elm, y = 0.5, height = 1) {
    const scale = Math.min(1, this.#codeContainer.clientWidth / elm.clientWidth, this.#codeContainer.clientHeight / (height * elm.clientHeight));
    this.#transformer.style.translate = `0 ${this.#codeContainer.clientHeight / 2 - y * elm.clientHeight * scale}px`
    this.#transformer.style.scale = scale;
  }
}

customElements.define('code-wave', CodeWave);
