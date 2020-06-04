import React from "react"

function Scroller({ steps, progress }) {
  return (
    <div className="waves-scroller-container" data-wave-scroller>
      {steps.map((step, i) => (
        <div style={{ opacity: Math.max(0.1, 1 - Math.abs(i - progress)) }} className="waves-scroller-step" key={i} >
          {step}
        </div>
      ))}
    </div>
  )
}

export default Scroller