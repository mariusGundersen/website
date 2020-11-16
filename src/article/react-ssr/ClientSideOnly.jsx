import { useEffect, useState } from 'react';

export default function Anchors({children}){

  const [render, setRender] = useState(false);

  useEffect(() => setRender(true), []);

  if(!render) return null;

  return children;
}