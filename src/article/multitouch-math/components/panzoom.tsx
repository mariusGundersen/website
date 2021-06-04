import React, {
  PointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

interface PointerInfo {
  model: { x: number; y: number };
  view: { x: number; y: number };
}

// v = sm + t
export default function PanZoom() {
  const pointers = useMemo(() => new Map<number, PointerInfo>(), []);
  const requested = useRef(false);

  const [transform, setTransform] = useState({ x: 0, y: 0, s: 1 });

  const solve = useCallback(() => {
    requested.current = false;
    const points = [...pointers.values()];
    if (points.length > 1) {
      const transform = solveMultiple(points);
      for (const { model, view } of points) {
        model.x = (view.x - transform.x) / transform.s;
        model.y = (view.y - transform.y) / transform.s;
      }
      setTransform(transform);
    } else if (points.length === 1) {
      const { view, model } = points[0];
      setTransform((t) => ({
        s: t.s,
        x: view.x - t.s * model.x,
        y: view.y - t.s * model.y,
      }));
    }
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      const { x, y } = e.currentTarget.getBoundingClientRect();
      pointers.set(e.pointerId, {
        model: {
          x: (e.clientX - x - transform.x) / transform.s,
          y: (e.clientY - y - transform.y) / transform.s,
        },
        view: { x: e.clientX - x, y: e.clientY - y },
      });
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [transform]
  );

  const onPointerMove = useCallback((e: PointerEvent) => {
    const pointer = pointers.get(e.pointerId);
    if (!pointer) return;
    const { x, y } = e.currentTarget.getBoundingClientRect();
    pointer.view.x = e.clientX - x;
    pointer.view.y = e.clientY - y;
    if (!requested.current) {
      requestAnimationFrame(solve);
      requested.current = true;
    }
    e.preventDefault();
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    pointers.delete(e.pointerId);
  }, []);

  const { x, y, s } = transform;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onLostPointerCapture={onPointerUp}
      style={{ touchAction: "none", position: "relative" }}
    >
      <img
        src="https://placekitten.com/200/200"
        style={{
          transform: `matrix(${s}, 0, 0, ${s}, ${x}, ${y})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

function solveMultiple(posPairs: PointerInfo[]) {
  /*
  v = tm
  tm = v

  [ s 0 x ]   [m_x_a  m_x_b  m_x_c]   [v_x_a  v_x_b  v_x_c]
  [ 0 s y ] x [m_y_a  m_y_b  m_y_c] = [v_y_a  v_y_b  v_y_c]
  [ 0 0 1 ]   [    1      1      1]   [    1      1      1]

  s*m_x_a + x = v_x_a
  s*m_x_b + x = v_x_b
  s*m_x_c + x = v_x_c
  s*m_y_a + y = v_y_a
  s*m_y_b + y = v_y_b
  s*m_y_c + y = v_y_c

  [ m_x_a 1 0 ] [ s ]   [ v_x_a ]
  [ m_x_b 1 0 ] [ x ] = [ v_x_b ]
  [ m_x_c 1 0 ] [ y ]   [ v_x_c ]
  [ m_y_a 0 1 ]         [ v_y_a ]
  [ m_y_b 0 1 ]         [ v_y_b ]
  [ m_y_c 0 1 ]         [ v_y_c ]

  Ax = b
  AtAx = Atb
  AtA^-1 AtA x = AtA^-1 Atb

  (At*A)i*At*b
  Ai*Ati*At*b
  Ai*b

  [L*3][3] = [L]
  [3*L][L*3][3] = [3*L][L]
  [3*3][3] = [3]
  */

  const len = posPairs.length;
  let m00 = 0,
    m01 = 0,
    m02 = 0;
  const atb = [0, 0, 0];
  for (const { model, view } of posPairs) {
    m00 += model.x * model.x + model.y * model.y;
    m01 += model.x;
    m02 += model.y;

    atb[0] += view.x * model.x + view.y * model.y;
    atb[1] += view.x;
    atb[2] += view.y;
  }

  // prettier-ignore
  const ata = [
    m00, m01, m02,
    m01, len, 0,
    m02, 0, len
  ] as const;

  const atainv = invert(ata);

  const result = {
    s: atainv[0] * atb[0] + atainv[1] * atb[1] + atainv[2] * atb[2],
    x: atainv[3] * atb[0] + atainv[4] * atb[1] + atainv[5] * atb[2],
    y: atainv[6] * atb[0] + atainv[7] * atb[1] + atainv[8] * atb[2],
  };

  return result;
}

// prettier-ignore
type matrix3x3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number
];

// prettier-ignore
function invert([
  a, b, c,
  d, e, f,
  g, h, i
]: matrix3x3): matrix3x3{
  /*
  step 1: matrix of minors
  [
    e*i - f*h, d*i - f*g, d*h - e*g,
    b*i - c*h, a*i - c*g, a*h - b*g,
    b*f - c*e, a*f - c*d, a*e - b*d
  ]

  step 2: matrix of cofactors
  [
    e*i - f*h, f*g - d*i, d*h - e*g,
    c*h - b*i, a*i - c*g, b*g - a*h,
    b*f - c*e, c*d - a*f, a*e - b*d
  ]

  step 3: adjugate
  [
    e*i - f*h, c*h - b*i, b*f - c*e,
    f*g - d*i, a*i - c*g, c*d - a*f,
    d*h - e*g, b*g - a*h, a*e - b*d
  ]
  */

  const inv = [
    e*i - f*h, c*h - b*i, b*f - c*e,
    f*g - d*i, a*i - c*g, c*d - a*f,
    d*h - e*g, b*g - a*h, a*e - b*d
  ];

  const det = a*inv[0] + b*inv[3] + c*inv[6];

  return inv.map(i => i/det) as unknown as matrix3x3;
}
