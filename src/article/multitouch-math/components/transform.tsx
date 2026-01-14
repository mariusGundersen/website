import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import PanZoom from "./panzoom.tsx";

interface Transform {
  x: number;
  y: number;
  s: number;
}

export interface Props {
  setTransform: Dispatch<SetStateAction<Transform>>;
  transform: Transform;
}

interface PointerInfo {
  model: { x: number; y: number };
  view: { x: number; y: number };
}

// v = sm + t
export default function Transform() {
  const width = 200;
  const ref = useRef<HTMLDivElement>(undefined);

  const min = useMemo(
    () =>
      -(ref.current?.closest("body").offsetWidth - ref.current?.offsetWidth) /
      2,
    [ref.current]
  );
  const max = useMemo(
    () => ref.current?.closest("body").offsetWidth + min - width,
    [ref.current, min]
  );

  const [transform, setTransform] = useState({ x: 0, y: 0, s: 1 });
  useEffect(() => {
    setTransform({ x: 0, y: 0, s: 1 });
  }, []);

  return (
    <div ref={ref}>
      <PanZoom transform={transform} setTransform={setTransform} />
      <div>
        <div style={{zIndex: 1, display: 'inline-flex', flexDirection: 'column', padding: '10px', position: 'relative', backgroundColor: 'white'}}>
          <div style={{display: 'flex', flexDirection:'row', alignItems: 'center'}}>
            <label>x: </label>
            <input
              type="range"
              min={min}
              max={max}
              value={transform.x}
              onChange={(e) => {
                const x = e.currentTarget.valueAsNumber;
                setTransform((t) => ({ ...t, x }));
              }}
            />
            <span>{transform.x.toFixed(0)}px</span>
          </div>
          <div style={{display: 'flex', flexDirection:'row', alignItems: 'center'}}>
            <label>y: </label>
            <input
              type="range"
              min={-200}
              max={200}
              value={transform.y}
              onChange={(e) => {
                const y = e.currentTarget.valueAsNumber;
                setTransform((t) => ({ ...t, y }));
              }}
            />
            <span>{transform.y.toFixed(0)}px</span>
          </div>
          <div style={{display: 'flex', flexDirection:'row', alignItems: 'center'}}>
            <label>s: </label>
            <input
              type="range"
              min={0.01}
              max={10}
              step={0.01}
              value={transform.s}
              onChange={(e) => {
                const s = e.currentTarget.valueAsNumber;
                setTransform((t) => ({ ...t, s }));
              }}
            />
            <span>{transform.s.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
