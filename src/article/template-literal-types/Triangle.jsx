import React, { useEffect, useRef } from 'react';
import * as twgl from 'twgl.js';

export default function Triangle(){
  const ref = useRef();

  useEffect(() => {
    if(!ref.current) return;

    const vertexShader = `
      precision highp float;

      // here is an attribute
      attribute vec3 position;

      varying vec2 uv;

      void main() {
        gl_Position = vec4(position, 1.0);
        uv = position.xy;
      }
    `;

    const fragmentShader = `
      precision highp float;

      // and here is a uniform
      uniform float time;

      varying vec2 uv;

      void main() {
        gl_FragColor = vec4(0.5*(uv+1.0), 0.5*(cos(time)+1.0), 1.0);
      }
    `;

    const canvas = ref.current;
    const gl = canvas.getContext("webgl");

    const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      // this is the attribute again
      position: [-1, 0, 0, 0, -1, 0, 1, 1, 0],
    });

    requestAnimationFrame(function render(time) {
      twgl.resizeCanvasToDisplaySize(canvas, window.devicePixelRatio);
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.useProgram(programInfo.program);
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      twgl.setUniforms(programInfo, {
        // and this is the uniform again
        time: time / 1000,
      });
      twgl.drawBufferInfo(gl, bufferInfo);

      requestAnimationFrame(render);
    });
  }, []);

  return (<canvas ref={ref} style={{width: '100%', background: '#1d1f21'}}></canvas>)
}