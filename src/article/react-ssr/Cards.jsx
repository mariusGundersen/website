import React, { useState } from 'react';

export default function Anchors({initial=false}){

  const [render, setRender] = useState(initial);

  //useEffect(() => setRender(true), []);

  if(!render) return null;

  return (
    <section className="demo">
      <a key="1" href="#1" className="card">
        <h3>This is a card</h3>
        <p>Here is some description</p>
        <a href="#2">The author</a>
      </a>
      <a key="2" href="#1" className="card">
        <h3>This is a card</h3>
        <p>Here is some description</p>
        <a href="#2">The author</a>
      </a>
      <a href="#3">Next page</a>
    </section>
  );
}