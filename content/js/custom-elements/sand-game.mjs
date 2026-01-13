// @ts-check

// @ts-ignore
import * as twgl from 'https://cdn.jsdelivr.net/npm/twgl.js@7.0.0/dist/7.x/twgl-full.module.js';

const renderShaders = [
/*glsl*/ `
  precision highp float;

  attribute vec2 position;
  varying vec2 texCoord;

  void main(void) {
    texCoord = 0.5*(position+1.0);
    gl_Position = vec4(position, 0.0, 1.0);
  }
`,
/*glsl*/ `
  precision highp float;

  uniform sampler2D sandTexture;

  varying vec2 texCoord;

  bool isSand(vec4 value) {
    return value.r == 1.0;
  }
  bool isAir(vec4 value) {
    return value == vec4(0.0, 0.0, 0.0, 0.0);
  }
  vec4 lookup() {
    return texture2D(sandTexture, texCoord);
  }

  vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

  void main() {
    vec4 self = lookup();

    if (isSand(self)) {
      gl_FragColor = vec4(hsv2rgb(vec3(self.b, 0.75, 0.66)), 1.0);
    } else {
      gl_FragColor = vec4(0.678, 0.847, 0.902, 1.0);
    }
  }
`
]

const sandShaders = [
/*glsl*/ `
  precision highp float;

  attribute vec2 position;
  varying vec2 texCoord;

  void main(void) {
    texCoord = 0.5*(position+1.0);
    gl_Position = vec4(position, 0.0, 1.0);
  }
`,
/*glsl*/ `
  precision highp float;

  uniform float direction;
  uniform vec2 inverseTileTextureSize;
  uniform sampler2D sandTexture;

  varying vec2 texCoord;

  bool isSand(vec4 value) {
    return value.r == 1.0;
  }
  bool isAir(vec4 value) {
    return value == vec4(0.0, 0.0, 0.0, 0.0);
  }

  vec4 lookup(float x, float y) {
    return texture2D(sandTexture, texCoord + inverseTileTextureSize * vec2( x, y));
  }

  vec4 getNextState() {
    vec4 self = lookup(0.0, 0.0);

    if (isSand(self)) {
      vec4 below = lookup(0.0, -1.0);
      if (isAir(below)) {
        return below;
      } else {
        vec4 diagonally = lookup(direction, -1.0);
        if (isAir(diagonally)) {
          return diagonally;
        } else {
          return self;
        }
      }
    } else {
      vec4 above = lookup(0.0, 1.0);
      if (isSand(above)) {
        return above;
      } else {
        vec4 diagonally = lookup(-direction, 1.0);
        vec4 besides = lookup(-direction, 0.0);
        if (isSand(besides) && isSand(diagonally)) {
          return diagonally;
        } else {
          return self;
        }
      }
    }
  }

  void main() {
    gl_FragColor = vec4(getNextState());
  }
`
];

const shadowStyle = /*css*/`
  .container {

  }

  canvas {
    width: 100%;
  }
`;

const shadowHtml = /*html*/`
  <div class="container">
    <canvas width=400 height=400></canvas>
  </div>
`;


class SandGame extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    const shadowRoot = this.shadowRoot ?? this.attachShadow({ mode: 'open' });

    const shadowSheet = new CSSStyleSheet();
    shadowSheet.replaceSync(shadowStyle)

    shadowRoot.adoptedStyleSheets.push(shadowSheet);

    shadowRoot.innerHTML = shadowHtml;


    const canvas = shadowRoot.querySelector('canvas');
    if (!canvas) throw new Error(' oh noes');
    const gl = canvas.getContext("webgl");
    if (!gl) throw new Error('oh noes');

    const renderProgram = twgl.createProgramInfo(gl, renderShaders);
    const sandProgram = twgl.createProgramInfo(gl, sandShaders);

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      // this is the attribute again
      position: [
        -1, -1, 0, //
        1, -1, 0,
        1, 1, 0,
        //
        -1, -1, 0,
        -1, 1, 0,
        1, 1, 0
      ],
    });

    twgl.resizeCanvasToDisplaySize(canvas, devicePixelRatio);
    const width = Math.floor(canvas.width / 2 / devicePixelRatio);
    const height = Math.floor(canvas.height / 2 / devicePixelRatio);

    const bottomRow = new Uint32Array(width * height);
    bottomRow.fill(0xff, 0, width);

    const sand1 = twgl.createFramebufferInfo(gl, [{ min: gl.NEAREST, mag: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE, type: gl.UNSIGNED_BYTE, src: new Uint8Array(bottomRow.buffer) }], width, height);

    const sand2 = twgl.createFramebufferInfo(gl, [{ min: gl.NEAREST, mag: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE, type: gl.UNSIGNED_BYTE, src: new Uint8Array(bottomRow.buffer) }], width, height);


    /**
     * @type {{ id: number; x: number; y: number; hue: number; }[]}
    */
    let pointers = [];


    let frame = 0;
    requestAnimationFrame(function render(time) {
      gl.viewport(0, 0, canvas.width, canvas.height);

      const [from, to] = frame % 2 === 0 ? [sand1, sand2] : [sand2, sand1];
      frame++;

      // DRAW
      for (const { x, y, hue } of pointers) {
        gl.bindTexture(gl.TEXTURE_2D, from.attachments[0])
        const sand = (0 << 24) | (hue << 16) | (0 << 8) | (0xff << 0);
        const data = new Uint32Array([sand, 0x0, sand, 0x0, sand]);

        gl.texSubImage2D(gl.TEXTURE_2D, 0, clamp(x - 2, 0, width - 5), y, 5, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(data.buffer));
      }


      // SIMULATE

      gl.useProgram(sandProgram.program);
      twgl.bindFramebufferInfo(gl, to);
      twgl.setBuffersAndAttributes(gl, sandProgram, bufferInfo);
      twgl.setUniforms(sandProgram, {
        inverseTileTextureSize: [1 / width, 1 / height],
        sandTexture: from.attachments[0],
        direction: frame % 2 === 0 ? 1 : -1
      });

      twgl.drawBufferInfo(gl, bufferInfo);

      // RENDER

      gl.useProgram(renderProgram.program);
      twgl.bindFramebufferInfo(gl, null);
      twgl.setBuffersAndAttributes(gl, renderProgram, bufferInfo);
      twgl.setUniforms(renderProgram, {
        sandTexture: to.attachments[0]
      });
      twgl.drawBufferInfo(gl, bufferInfo);

      requestAnimationFrame(render);
    });

    const toSimSize = (/** @type {number} */ value) => value * width / canvas.offsetWidth;

    canvas.addEventListener('pointerdown', e => {
      pointers.push({
        id: e.pointerId,
        x: toSimSize(e.offsetX),
        y: toSimSize(canvas.offsetHeight - e.offsetY),
        hue: Math.floor(Math.random() * 0xff)
      });
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', e => {
      const pointer = pointers.find(p => p.id === e.pointerId);
      if (pointer) {
        pointer.x = toSimSize(e.offsetX);
        pointer.y = toSimSize(canvas.offsetHeight - e.offsetY);
      }
    });

    /**
     * @param {PointerEvent} event
     */
    function onPointerUp(event) {
      const pointer = pointers.findIndex(p => p.id === event.pointerId);
      if (pointer >= 0) {
        pointers.splice(pointer, 1);
      }
    };


    canvas.addEventListener('pointercancel', onPointerUp)

    canvas.addEventListener('pointerup', onPointerUp)

  }
}

customElements.define('sand-game', SandGame);


/**
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(v, max));
}