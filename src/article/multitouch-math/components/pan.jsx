import React, { useCallback, useRef, useState } from "react";

export default function PanZoom(){
  const isDown = useRef(false);
  const model = useRef({ x: 0, y: 0 });
  const translate = useRef({ x: 0, y: 0 });

  const [transform, setTransform] = useState('');

  const onPointerDown = useCallback(e => {
    isDown.current = true;
    model.current.x = e.clientX - translate.current.x;
    model.current.y = e.clientY - translate.current.y;
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback(e => {
    if (isDown.current) {
      translate.current.x = e.clientX - model.current.x;
      translate.current.y = e.clientY - model.current.y;
      setTransform(`translate(${translate.current.x}px, ${translate.current.y}px)`);
    }
    e.preventDefault();
  }, []);

  const onPointerUp = useCallback(() => {
    isDown.current = false;
  }, []);

  return (
    <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onLostPointerCapture={onPointerUp} style={{touchAction: 'none'}}>
      <img src="https://placekitten.com/200/200" style={{transform, transformOrigin: 'top left'}} />
    </div>
  );
}