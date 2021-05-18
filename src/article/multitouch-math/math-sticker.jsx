import React, { useEffect, useRef, useState } from "react";
const fadeOutDuration = .5;
const fadeInDuration = .5;

export default function MathSticker({ progress, steps }) {
  const [blocks, setBlocks] = useState();
  const currentStep = Math.round(progress);
  const activeStep = useRef(0);
  const promise = useRef(Promise.resolve());
  const ref = useRef(null);

  useEffect(() => {
    const blocks = Array.from(ref.current.querySelectorAll('.katex-display'));
    setBlocks(blocks);

    for (const block of blocks) {
      block.style.opacity = 0;
      block.style.zIndex = 0;
    }

    blocks[0].style.opacity = 1;
    blocks[0].style.zIndex = 1;
  }, []);

  useEffect(() => {
    if(currentStep > activeStep.current){
      activeStep.current++;
      const from = blocks[activeStep.current - 1];
      const to = blocks[activeStep.current];
      promise.current = promise.current.then(() => transition(from, to));
    }else if(currentStep < activeStep.current){
      activeStep.current--;
      const from = blocks[activeStep.current + 1];
      const to = blocks[activeStep.current];
      promise.current = promise.current.then(() => transition(from, to, true));
    }
  }, [currentStep])

  return (
    <div className="waves-sticker-container">
      <div ref={ref} className="waves-sticker math-wave">
        {steps}
      </div>
    </div>
  )
}


/**
 *
 * @param {HTMLElement} fromBlock
 * @param {HTMLElement} toBlock
 * @param {boolean} backwards
 */
  async function transition(fromBlock, toBlock, backwards = false) {

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
  for (const { id, elm } of removed) {
    const r = /(^\D+)\d+$/.exec(id);
    if (r) {
      const prefix = r[1];
      const to = Array.from(toElms.entries())
        .map(([id, elm]) => ({ elm, r: /(^\D+)\d+$/.exec(id) }))
        .filter(({ r }) => r)
        .find(({ r }) => r[1] === prefix)?.elm;

      if (to) {
        removed.splice(removed.findIndex(x => x.id === id), 1);
        moved.push({ from: elm, to });
      }
    }
  }

  fromBlock.style.opacity = 1;
  fromBlock.style.zIndex = 1;

  for (const { elm } of removed) {
    elm.style.transition = `opacity ${fadeOutDuration}s ease`;
    elm.style.opacity = 0;
  }

  if (removed.length) {
    await delay(fadeOutDuration);
  }

  // handle splitting of symbols
  // splitting should not be adding one, it should be moving both from the same place
  const clones = [];

  for (const { id, elm } of added) {
    const r = /(^\D+)\d+$/.exec(id);
    if (r) {
      const prefix = r[1];
      const from = Array.from(fromElms.entries())
        .map(([id, elm]) => ({ elm, r: /(^\D+)\d+$/.exec(id) }))
        .filter(({ r }) => r)
        .find(({ r }) => r[1] === prefix)?.elm;

      if (from) {
        added.splice(added.findIndex(x => x.id === id), 1);

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

  const fromBox = fromBlock.getBoundingClientRect();
  const toBox = toBlock.getBoundingClientRect();
  const motions = moved
    .map(({ from, to }) => getMotion(from, fromBox, to, toBox, backwards));

  const duration = 1.5//Math.max(...motions.map(m => m.duration));

  for (const { elm, transform } of motions) {
    elm.style.display = 'inline-block';
    elm.style.transition = `transform ${duration}s ease`;
    elm.style.transform = transform;
  }

  if (moved.length) {
    await delay(duration);
  }

  fromBlock.style.transition = `opacity ${fadeInDuration}s ${fadeInDuration/2}s ease`;
  toBlock.style.transition = `opacity ${fadeInDuration}s ease`;
  fromBlock.style.opacity = 0;
  toBlock.style.opacity = 1;
  fromBlock.style.zIndex = 0;
  toBlock.style.zIndex = 1;

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

const getX = (pos, box) => (pos.x + pos.width / 2) - (box.x);
const getY = (pos, box) => (pos.y + pos.height / 2) - (box.y);

const delay = s => new Promise(res => setTimeout(res, s * 1000));

/**
 *
 * @param {HTMLElement} from
 * @param {HTMLElement} fromBox
 * @param {HTMLElement} to
 * @param {HTMLElement} toBox
 * @param {boolean} backwards
 */
function getMotion(from, fromBox, to, toBox, backwards) {
  const motion = (backwards ? to : from).getAttribute('data-motion');
  const toPos = to.getBoundingClientRect();
  const fromPos = from.getBoundingClientRect();
  const destX = getX(toPos, toBox);
  const srcX = getX(fromPos, fromBox);
  const destY = getY(toPos, toBox);
  const srcY = getY(fromPos, fromBox);
  const dx = destX - srcX;
  const dy = destY - srcY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (motion === 'arc' || motion === 'reverse-arc') {
    const degrees = backwards ^ (motion === 'reverse-arc') ? 180 : -180;
    return {
      elm: from,
      transform: `
        translate(${dx / 2}px, ${dy / 2}px)
        rotate(${degrees}deg)
        translate(${-dx / 2}px, ${-dy / 2}px)
        rotate(${-degrees}deg)
        scale(${toPos.width/fromPos.width}, ${toPos.height/fromPos.height})`,
      duration: distance / 100,
    };
  } else {
    return {
      elm: from,
      transform: `
        translate(${destX - srcX}px, ${destY - srcY}px)
        scale(${toPos.width/fromPos.width}, ${toPos.height/fromPos.height})`,
      duration: Math.max(1, distance / 50),
    };
  }
}
