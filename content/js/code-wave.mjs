// @ts-check

import { patienceDiff } from './diff.mjs';

const documentStyle = /*css*/`
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
`;
const shadowStyle = /*css*/`
  :host{
      display: grid;
      --width: calc(100vw - var(--scrollbar-width, 20px));
      width: var(--width);
      margin-left: calc( (100% - var(--width)) / 2);
      grid-template:
        '.' 50vh
        '.' 1fr
      / minmax(0, 1fr);
      @media (orientation: landscape) {
          grid-template: '. .' auto / minmax(0, 1fr) minmax(0, 1fr);
      }
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
          transition: scale 0s, translate 0s;
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

      /* TODO: this is the same as main, somehow it should be copied here */
      padding-inline: 1em;
      max-width: 900px;
      /* end TODO */

      @media (orientation: landscape) {
          padding-block: 25vh;
      }

      ::slotted(pre){
          display: none !important;
      }

      ::slotted(div.text){
          margin-block: max(3em, 25vh);
          overflow-y: auto;
          opacity: 0.75;
          transition: opacity 1s;
      }

      ::slotted(div.current){
          anchor-name: --text;
          opacity: 1;
      }

      &::after {
          content: '';
          position: absolute;
          position-anchor: --text;
          top: anchor(top);
          bottom: anchor(bottom);
          left: .4em;
          width: .2em;
          border-radius: 2px;
          opacity: 0.5;
          background: currentColor;
          transition: inset 1s cubic-bezier(0.65, 0, 0.35, 1);
      }
  }
`;

const shadowHtml = /*html*/`
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
  /** @type {IntersectionObserver | undefined} */
  #io;
  /** @type {MediaQueryList} */
  #media;
  constructor() {
    super();
  }
  connectedCallback() {
    const shadowRoot = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    const documentSheet = new CSSStyleSheet();
    documentSheet.replaceSync(documentStyle);
    document.adoptedStyleSheets.push(documentSheet);

    const shadowSheet = new CSSStyleSheet();
    shadowSheet.replaceSync(shadowStyle)

    shadowRoot.adoptedStyleSheets.push(shadowSheet);

    shadowRoot.innerHTML = shadowHtml;

    // @ts-ignore
    this.#codeContainer = shadowRoot.querySelector('.code-container');
    // @ts-ignore
    this.#transformer = shadowRoot.querySelector('.transformer');

    /** @type {Element[]} */
    const chunks = [];
    let chunk = document.createElement('div');
    chunk.className = 'text';

    this.style.setProperty('--scrollbar-width', `${window.innerWidth - document.documentElement.clientWidth}px`);

    for (const elm of Array.from(this.children)) {
      if (elm instanceof HTMLPreElement) {
        const codeElm = elm.firstElementChild;
        if (codeElm && codeElm.nodeName === 'CODE') {

          this.splitLines(codeElm);

          /** @type {number[]} */
          const linesOfInterest = [];
          for (let index = 0; index < codeElm.childNodes.length; index++) {
            const line = codeElm.childNodes[index];
            if (line instanceof HTMLElement && line.firstElementChild?.tagName === 'MARK') {
              line.append(...line.firstElementChild.childNodes);
              line.firstElementChild.remove();
              line.setAttribute('data-highlight', 'true');
              linesOfInterest.push(index)
            }
          }

          if (linesOfInterest.length === 0) {
            const previousPre = this.#pres.at(-1);
            if (previousPre) {
              const diff = patienceDiff(previousPre.textContent?.split('\n'), elm.textContent?.split('\n'));
              for (const { aIndex, bIndex } of diff.lines) {
                if (aIndex === -1) {
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
            chunks.push(chunk);
            elm.before(chunk);
            chunk = document.createElement('div');
            chunk.className = 'text';
          }
        }
      } else {
        chunk.append(elm);
      }
    }

    this.#media = window.matchMedia('(orientation: landscape)');
    this.createIntersectionObserver(chunks, this.#media.matches);

    this.#media.onchange = (e) => {
      this.createIntersectionObserver(chunks, e.matches);
    }

    const current = this.#pres[0];
    current.setAttribute('slot', 'code');
    current.nextElementSibling?.classList.add('current');
    this.transform(current);
  }

  disconnectedCallback() {
    this.#io?.disconnect();
    this.#media.onchange = null;
  }

  /** @type {IntersectionObserverCallback} */
  onIntersection = (entries) => {
    const target = entries.find(e => e.isIntersecting)?.target;
    if (!target) return;
    const to = target.previousElementSibling;
    if (to instanceof HTMLPreElement) {
      if (this.#currentlyBusy) {
        this.#nextCodeBlock = to;
      } else {
        this.transition(to);
      }
      this.querySelector('div.text.current')?.classList.remove('current');
      target.classList.add('current');
    }
  }

  /**
   * @param {Element[]} chunks
   * @param {boolean} isLandscape
   */
  createIntersectionObserver(chunks, isLandscape) {
    this.#io?.disconnect();
    this.#io = new IntersectionObserver(this.onIntersection, {
      root: null,
      rootMargin: isLandscape ? '-50% 0px -50% 0px' : '-75% 0px -25% 0px',
      threshold: 0
    });

    for (const chunk of chunks) {
      this.#io.observe(chunk);
    }
  }

  /**
   * @param {Element} elm
   */
  splitLines(elm) {
    /**
     * @param {Element} node
     */
    function* recurse(node) {
      const makeClone = () => {
        const clone = node.cloneNode();
        // @ts-ignore
        clone.append(...group);
        group = [];
        return clone;
      }

      /**
       * @type {(Node)[]}
       */
      let group = [];

      for (const child of [...node.childNodes]) {
        if (child.textContent?.includes('\n')) {
          if (child instanceof Text) {
            child.remove();
            const chunks = child.textContent?.split('\n') ?? [];
            const tail = chunks.pop();
            for (const chunk of chunks) {
              group.push(new Text(chunk));
              yield makeClone();
              yield '\n';
            }
            if (tail) {
              group.push(new Text(tail));
            }
          } else if (child instanceof Element) {
            for (const g of recurse(child)) {
              if (g === '\n') {
                yield makeClone();
                yield '\n';
              } else {
                group.push(g);
              }
            }
          }
        } else {
          group.push(child)
        }
      }
      yield makeClone();
    }

    const line = document.createElement('div');
    line.style.display = 'inline-block';
    line.append(...elm.childNodes);

    for (const l of recurse(line)) {
      if (l === '\n') {
        elm.append(new Text('\n'));
      } else {
        elm.append(l);
      }
    }
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
      const diff = patienceDiff(
        oldLines.map(c => c.textContent),
        newLines.map(c => c.textContent));

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

      const duration = Math.max(1, (insertDelay + hasInsert));

      this.#transformer.style.transitionDelay = `${0}s`;
      this.#transformer.style.transitionDuration = '1s';
      this.transform(
        newPre,
        (firstLineOfInterest + lastLineOfInterest) / 2 / (newLines.length - 1),
        (lastLineOfInterest - firstLineOfInterest) / (newLines.length - 1));

      setTimeout(() => {
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
  transform(elm, verticalCenterPoint = 0.5, verticalFraction = 1) {


    const containerWidth = this.#codeContainer.clientWidth;
    const codeWidth = elm.clientWidth;
    const containerHeight = this.#codeContainer.clientHeight;
    const codeHeight = elm.clientHeight;
    const scale = Math.min(1, containerWidth / codeWidth, containerHeight / (verticalFraction * codeHeight));

    const xPos = containerWidth / 2 - 0.5 * codeWidth * scale;
    const yPos = containerHeight / 2 - verticalCenterPoint * codeHeight * scale;

    this.#transformer.style.translate = `${xPos}px ${yPos}px`
    this.#transformer.style.scale = `${scale}`;
  }
}

customElements.define('code-wave', CodeWave);
