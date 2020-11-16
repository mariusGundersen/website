import React, { useState } from 'react';

export default function Anchors({initial=false}){

  const [render, setRender] = useState(initial);

  //useEffect(() => setRender(true), []);

  if(!render) return null;

  return (
    <a href="#1">
      A link <a href="#2">inside</a> a link
    </a>
  );
}