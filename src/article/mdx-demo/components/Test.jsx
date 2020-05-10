import React, { useEffect, useState } from 'react';

export default props => {
  const [color, setColor] = useState('red');

  useEffect(() => {
    const intval = setInterval(() => {
      setColor('wheat');
    }, 1000);

    return () => clearInterval(intval);
  });

  return (
    <div style={{ background: color }}>
      This is a test
      <h3>{props.title}</h3>
    </div>
  );
};