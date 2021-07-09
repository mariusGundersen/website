import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
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
      </div>
    </div>
  );
}
