import React from "react"
import { useSpring } from "use-spring"

function useCurrentStep(ref) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const scroller = ref.current.querySelector("[data-wave-scroller]");
    const children = [...scroller.childNodes];
    let prevVisible = { target: children[0] };

    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(e => e.isIntersecting) ?? prevVisible;

      prevVisible = visible;
      const newProgress = children.indexOf(visible.target);
      setProgress(newProgress);
    }, {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    });

    for (const child of children) {
      observer.observe(child);
    }

    return () => observer.disconnect();
  }, []);

  return progress;
}

function Wave({
  children,
  columnComponents = [],
  childrenToStepColumns,
  ...rest
}) {
  const ref = React.useRef()
  const currentStep = useCurrentStep(ref)

  const [progress] = useSpring(currentStep, {
    decimals: 3,
    stiffness: 80,
    damping: 48,
    mass: 8,
  })

  const columns = React.useMemo(() => {
    return childrenToStepColumns(children)
  }, [])

  return (
    <div ref={ref} className="waves-wave">
      {columns.map((columnSteps, columnIndex) => {
        const Component = columnComponents[columnIndex]
        //TODO rename currentStep to currentStepIndex
        return (
          <Component
            key={columnIndex}
            steps={columnSteps}
            progress={progress}
            currentStep={currentStep}
            {...rest}
          />
        )
      })}
    </div>
  )
}

export default Wave