// @ts-check

import { patienceDiffPlus } from './diff.mjs';

class CodeWave extends HTMLElement {
  /** @type {HTMLPreElement[]} */
  #pres = [];
  #currentlyBusy = false;
  /** @type {HTMLPreElement | undefined} */
  #nextCodeBlock = undefined;
  /** @type {HTMLDivElement} */
  #codeContainer;
  /** @type {HTMLDivElement} */
  #transformer;
  constructor() {
    super();
  }
  connectedCallback() {
    const shadowRoot = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
    const elms = this.children;

    const documentSheet = new CSSStyleSheet();
    documentSheet.replaceSync(/*css*/`
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
    document.adoptedStyleSheets.push(documentSheet);

    const shadowSheet = new CSSStyleSheet();
    shadowSheet.replaceSync(/*css*/`
      :host{
          width: calc(100vw - 20px);
          margin-left: calc(50% - 50vw);
          display: grid;
          grid-template: '.' 50vh '.' 1fr / auto;
          @media (orientation: landscape) {
              grid-template: '. .' auto / minmax(0, 1fr) minmax(0, 1fr);
          }
          gap: 10px;
      }
      .code-container {
          height: 50dvh;
          @media (orientation: landscape) {
              height: 100dvh;
          }
          position: sticky;
          top: 0;
          bottom: 0;
          background: #1e1e1e;
          overflow: hidden;
          z-index: 2;
          .transformer {
              position: absolute;
              top: 0;
              left: 0;
              transition: scale 1s, translate 2s;
              transform-origin: top left;
              ::slotted(pre){
                  overflow: visible !important;
                  position: absolute;
                  background: #0000 !important;
                  top: 0;
                  left: 0;
              }
          }
      }
      .text-container {
          position: relative;
          padding: 0 25px;
          @media (orientation: landscape) {
              padding-block: 25vh;
          }
          ::slotted(pre){
              display: none !important;
          }
          ::slotted(div.text){
              scroll-snap-align: center;
              margin-block: max(3em, 25vh);
          }
          ::slotted(div.current){
              anchor-name: --text;
          }
          &::after {
              content: '';
              position: absolute;
              position-anchor: --text;
              top: anchor(top);
              bottom: anchor(bottom);
              left: 0;
              width: 4px;
              border-radius: 2px;
              background: currentColor;
              transition: inset 1s cubic-bezier(0.65, 0, 0.35, 1);
          }
      }
    `)

    shadowRoot.adoptedStyleSheets.push(shadowSheet);

    shadowRoot.innerHTML = /*html*/`
      <div class="code-container">
        <div class="transformer">
            <slot name="code"></slot>
            <slot name="code-new"></slot>
        </div>
      </div>
      <div class="text-container">
        <slot>
      </div>
    `;

    // @ts-ignore
    this.#codeContainer = shadowRoot.querySelector('.code-container');
    // @ts-ignore
    this.#transformer = shadowRoot.querySelector('.transformer');

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
      to?.nextElementSibling?.classList.add('current');

    }, {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    })

    for (const elm of Array.from(elms)) {
      if (elm instanceof HTMLPreElement) {
        const codeElm = elm.firstElementChild;
        if (codeElm && codeElm.nodeName === 'CODE') {
          elm.firstElementChild.innerHTML = elm.firstElementChild.innerHTML
            .split('\n')
            .map(l => `<span style="display: inline-block;">${l}</span>\n`)
            .join('');

          /** @type {number[]} */
          const linesOfInterest = [];
          for (let index = 0; index < elm.firstElementChild.children.length; index++) {
            const line = elm.firstElementChild.children[index];
            if (line.firstElementChild?.tagName === 'MARK') {
              line.append(...line.firstElementChild.childNodes);
              line.firstElementChild.remove();
              line.setAttribute('data-highlight', 'true');
              linesOfInterest.push(index)
            }
          }

          if (linesOfInterest.length === 0) {
            const previousPre = this.#pres.at(-1);
            if (previousPre) {
              const diff = patienceDiffPlus(previousPre.textContent?.split('\n'), elm.textContent?.split('\n'));
              for (const { aIndex, bIndex, moved } of diff.lines) {
                if (aIndex === -1 || (moved && bIndex !== -1)) {
                  linesOfInterest.push(bIndex);
                }
              }
            } else {
              linesOfInterest.push(...elm.textContent?.split('\n').map((_, i) => i) ?? [])
            }
          }

          elm.setAttribute('data-lines-of-interest', linesOfInterest.join(','));

          this.#pres.push(elm);
          if (chunk.hasChildNodes()) {
            console.log(elm, chunk);
            chunks.push(chunk);
            elm.before(chunk);
            this.io.observe(chunk);
            chunk = document.createElement('div');
            chunk.className = 'text';
          }
        }
      } else {
        chunk.append(elm);
      }
    }

    console.log(this.#pres, chunks)

    const current = this.#pres[0];
    current.setAttribute('slot', 'code');
    current.nextElementSibling?.classList.add('current');
    this.transform(current);
  }

  disconnectedCallback() {
    this.io?.disconnect();
  }

  /**
   *
   * @param {HTMLPreElement} newPre
   */
  transition(newPre) {
    /** @type {HTMLPreElement | null} */
    const oldPre = this.querySelector('pre[slot="code"]');
    if (oldPre && newPre && oldPre !== newPre) {
      const oldPreIndex = this.#pres.indexOf(oldPre);
      const newPreIndex = this.#pres.indexOf(newPre);
      const forward = newPreIndex > oldPreIndex;
      this.#currentlyBusy = true;
      this.#nextCodeBlock = undefined;

      const oldLines = Array.from(oldPre.firstElementChild?.children ?? []).filter(e => e instanceof HTMLElement);
      const newLines = Array.from(newPre.firstElementChild?.children ?? []).filter(e => e instanceof HTMLElement);
      const diff = patienceDiffPlus(
        oldLines.map(c => c.textContent),
        newLines.map(c => c.textContent));
      console.log(diff);

      /** @type {number[]} */
      const linesOfInterest = newPre.getAttribute('data-lines-of-interest')?.split(',').map(v => parseInt(v, 10)) ?? [];

      const firstLineOfInterest = linesOfInterest.at(0) ?? 0;
      const lastLineOfInterest = linesOfInterest.at(-1) ?? 0;

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
          newLine.style.setProperty('--cw-opacity', linesOfInterest.includes(bIndex) ? '1' : '0.4');
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
          newLine.style.setProperty('--cw-opacity', linesOfInterest.includes(bIndex) ? '1' : '0.4');
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

  /**
   * @param {HTMLPreElement} elm
   */
  transform(elm, y = 0.5, height = 1) {
    const scale = Math.min(1, this.#codeContainer.clientWidth / elm.clientWidth, this.#codeContainer.clientHeight / (height * elm.clientHeight));
    this.#transformer.style.translate = `0 ${this.#codeContainer.clientHeight / 2 - y * elm.clientHeight * scale}px`
    this.#transformer.style.scale = `${scale}`;
  }
}

customElements.define('code-wave', CodeWave);
