import React from "react"
import { useSpring } from "use-spring"

function getProgress(scroller, focusPoint) {
  const children = scroller.childNodes
  const middle = window.innerHeight * focusPoint
  let prevBottom = children[0].getBoundingClientRect().bottom
  for (let i = 1; i < children.length; i++) {
    const { top, bottom } = children[i].getBoundingClientRect()
    const breakpoint = (prevBottom + top) / 2
    if (middle < breakpoint) {
      return i - 1
    }
    prevBottom = bottom
  }
  return children.length - 1
}

function useFocusPoint() {
  if (typeof window === "undefined") return false
  return 0.5;
}

function useCurrentStep(ref) {
  const [progress, setProgress] = React.useState(0)
  const focusPoint = useFocusPoint()

  React.useEffect(() => {
    const scroller = ref.current.querySelector("[data-wave-scroller]")
    function onScroll() {
      const newProgress = getProgress(scroller, focusPoint)
      setProgress(newProgress)
    }
    document.addEventListener("scroll", onScroll)
    return () => {
      document.removeEventListener("scroll", onScroll)
    }
  }, [])

  return progress
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