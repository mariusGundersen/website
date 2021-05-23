// @ts-check

import React, { useEffect, useRef, useState } from "react";
const fadeOutDuration = .5;
const fadeInDuration = .5;

export default function MathSticker({ progress, steps }) {
  /** @type {[HTMLElement[], import("react").Dispatch<import("react").SetStateAction<HTMLElement[]>>]} */
  const [blocks, setBlocks] = useState();
  const activeStep = useRef(0);
  const promise = useRef(Promise.resolve(1));
  const ref = useRef(null);

  useEffect(() => {
    const blocks = Array.from(ref.current.querySelectorAll('.math-display'));
    setBlocks(blocks);

    for (const block of blocks) {
      block.style.position = 'relative';
      block.style.opacity = 0;
      block.style.zIndex = 0;
    }

    blocks[0].style.opacity = 1;
    blocks[0].style.zIndex = 1;

    promise.current = promise.current.then(async() => {
      await delay(0.1);
      const newScale = calculateScale(blocks[0], ref.current);
      scaleContainer(ref.current, newScale, 1);
      return newScale;
    });
  }, []);

  const currentStep = Math.round(progress);

  useEffect(() => {
    if(currentStep > activeStep.current){
      activeStep.current++;
      const from = blocks[activeStep.current - 1];
      const to = blocks[activeStep.current];
      promise.current = promise.current.then(async (scale) => {
        return await transition(ref.current, from, to, scale);
      });
    }else if(currentStep < activeStep.current){
      activeStep.current--;
      const from = blocks[activeStep.current + 1];
      const to = blocks[activeStep.current];
      promise.current = promise.current.then(async (scale) => {
        return await transition(ref.current, from, to, scale, true);
      });
    }
  }, [currentStep])

  return (
    <div className="waves-sticker-container">
      <div className="waves-sticker math-wave">
        <div ref={ref} className="math-wave-content">
          {steps}
        </div>
      </div>
    </div>
  )
}




/**
 * @param {HTMLElement} block
 * @param {HTMLElement} container
 */
function calculateScale(block, container) {
  /** @type {HTMLElement} */
  const baseBlock = block.querySelector('.katex-html');
  const hScale = container.offsetWidth / baseBlock.offsetWidth;
  const vScale = container.offsetHeight / baseBlock.offsetHeight;
  const newScale = Math.min(hScale * 0.8, vScale / 2, 2);
  return newScale;
}

/**
 * @param {HTMLElement} container
 * @param {number} scale
 * @param {number} duration
 */
function scaleContainer(container, scale, duration) {
    container.style.transition = `transform ${duration}s ease`;
    container.style.transform = `scale(${scale})`;
}

const PrefixRegex = /(^\D+)(\d+)$/;
/**
 *
 * @param {HTMLElement} container
 * @param {HTMLElement} fromBlock
 * @param {HTMLElement} toBlock
 * @param {number} scale
 * @param {boolean} backwards
 */
async function transition(container, fromBlock, toBlock, scale, backwards = false) {
  const fromElms = getElmMap(fromBlock);
  const toElms = getElmMap(toBlock);

  console.log('start');

  const added = Array.from(toElms.entries())
    .filter(([id]) => !fromElms.has(id))
    .map(p => ({ elm: p[1], id: p[0] }));

  const removed = Array.from(fromElms.entries())
    .filter(([id]) => !toElms.has(id))
    .map(p => ({ elm: p[1], id: p[0] }));

  const moved = Array.from(toElms.entries())
    .filter(([id]) => fromElms.has(id))
    .map(([id, to]) => ({ from: fromElms.get(id), to }));

  // handle merging of symbols
  // merging should not be removing one, it should be moving both to the same place
  for (const { id, elm } of [...removed]) {
    const prefix = getPrefixedIndex(id)?.prefix;
    if (prefix) {
      const to = findBestMatch(toElms, prefix);

      if (to) {
        removed.splice(removed.findIndex(x => x.id === id), 1);
        moved.push({ from: elm, to });
      }
    }
  }

  // if the removed element contains moved elements, then don't remove it
  for(const ignored of removed.filter(r => moved.some(m => r.elm.contains(m.from)))){
    removed.splice(removed.indexOf(ignored), 1);
  }

  // if the removed element is inside a moved element, then don't remove it
  for(const ignored of removed.filter(r => moved.some(m => m.from.contains(r.elm)))){
    removed.splice(removed.indexOf(ignored), 1);
  }

  fromBlock.style.opacity = '1';
  fromBlock.style.zIndex = '1';

  for (const { elm } of removed) {
    elm.style.transition = `opacity ${fadeOutDuration}s ease`;
    elm.style.opacity = '0';
  }

  if (removed.length) {
    await delay(fadeOutDuration);
  }

  // handle splitting of symbols
  // splitting should not be adding one, it should be moving both from the same place
  const clones = [];

  for (const { id, elm } of [...added]) {
    const prefix = getPrefixedIndex(id)?.prefix;
    if (prefix) {
      const from = findBestMatch(fromElms, prefix);

      if (from) {
        added.splice(added.findIndex(x => x.id === id), 1);

        /** @type {HTMLElement} */
        // @ts-ignore
        const clone = from.cloneNode(true);

        clone.style.position = 'absolute';
        clone.style.top = from.offsetTop + 'px';
        clone.style.left = from.offsetLeft + 'px';

        from.parentElement.appendChild(clone);

        moved.push({ from: clone, to: elm });
        clones.push(clone);
      }
    }
  }

  const motions = moved
    .map(({ from, to }) => getMotion(from, fromBlock, to, toBlock, backwards));

  const duration = 1.5//Math.max(...motions.map(m => m.duration));

  for (const { elm, transform } of motions) {
    elm.style.display = 'inline-block';
    elm.style.transition = `transform ${duration}s ease`;
    elm.style.transform = transform;
  }

  const newScale = calculateScale(toBlock, container);
  // don't scale down unless we need to
  if(newScale/scale > 1.5 || scale/newScale > 1){
    scaleContainer(container, newScale, duration);
  }

  if (moved.length) {
    await delay(duration);
  }

  fromBlock.style.transition = `opacity ${fadeInDuration}s ${fadeInDuration/2}s ease`;
  toBlock.style.transition = `opacity ${fadeInDuration}s ease`;
  fromBlock.style.opacity = '0';
  toBlock.style.opacity = '1';
  fromBlock.style.zIndex = '0';
  toBlock.style.zIndex = '1';

  await delay(fadeInDuration + fadeInDuration/2);

  fromBlock.style.transition = '';
  toBlock.style.transition = '';

  for (const [_, elm] of fromElms) {
    elm.style.display = '';
    elm.style.transition = '';
    elm.style.opacity = '';
    elm.style.transform = '';
  }

  for (const clone of clones) {
    clone.parentNode.removeChild(clone);
  }

  await delay(0.001);
  console.log('end')

  return newScale;
}

/**
 * @param {Map<string, HTMLElement>} elements
 * @param {string} prefix
 */
function findBestMatch(elements, prefix) {
  return Array.from(elements.entries())
    .filter(([_, elm]) => !elm.hasAttribute('data-nomatch'))
    .map(([id, elm]) => ({ elm, r: getPrefixedIndex(id) }))
    .filter(({ r }) => r?.prefix === prefix)
    .sort((a, b) => a.r.index.localeCompare(b.r.index)) // pick the lowest matching
  [0]?.elm;
}

/**
 * @param {string} id
 */
function getPrefixedIndex(id) {
  const r = PrefixRegex.exec(id);

  if(r){
    return {
      prefix: r[1],
      index: r[2]
    }
  }
}

/**
 *
 * @param {HTMLElement} parent
 * @returns {Map<string, HTMLElement>}
 */
function getElmMap(parent) {
  const map = new Map();
  for (const elm of parent.querySelectorAll('[data-key]')) {
    map.set(elm.getAttribute('data-key'), elm);
  }
  return map;
}

/**
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} ancestor
 */
function getPos(element, ancestor){
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  let x = width / 2;
  let y = height / 2;

  while(element !== ancestor && element !== null){
    x += element.offsetLeft;
    y += element.offsetTop;
    // @ts-ignore
    element = element.offsetParent;
  }

  return {
    x,
    y,
    width,
    height
  };
}

const delay = (/** @type {number} */ s) => new Promise(res => setTimeout(res, s * 1000));

/**
 *
 * @param {HTMLElement} from
 * @param {HTMLElement} fromBox
 * @param {HTMLElement} to
 * @param {HTMLElement} toBox
 * @param {boolean} backwards
 */
function getMotion(from, fromBox, to, toBox, backwards) {
  const motion = (backwards ? from : to).getAttribute('data-motion');
  const dest = getPos(to, toBox);
  const src = getPos(from, fromBox);
  const dx = dest.x - src.x;
  const dy = dest.y - src.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (motion === 'arc' || motion === 'arc-inverse') {
    const degrees = backwards !== (motion === 'arc-inverse') ? 180 : -180;
    return {
      elm: from,
      transform: `
        translate(${dx / 2}px, ${dy / 2}px)
        rotate(${degrees}deg)
        translate(${-dx / 2}px, ${-dy / 2}px)
        rotate(${-degrees}deg)
        scale(${dest.width/src.width}, ${dest.height/src.height})`,
      duration: distance / 100,
    };
  } else if (motion === 'none') {
    return {
      elm: from,
      transform: '',
      duration: 0,
    };
  } else {
    return {
      elm: from,
      transform: `
        translate(${dest.x - src.x}px, ${dest.y - src.y}px)
        scale(${dest.width/src.width}, ${dest.height/src.height})`,
      duration: Math.max(1, distance / 50),
    };
  }
}
