import React from "react";

function ImageSticker({ progress, steps }) {
  const currentStep = Math.round(progress)
  const prev = steps[currentStep - 1]
  const curr = steps[currentStep]
  const next = steps[currentStep + 1]

  return (
    <div className="waves-sticker-container">
      <div className="waves-sticker">
        <div
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            backgroundColor: "background",
          }}
        />
        {prev && (
          <div
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: Math.max(0, currentStep - progress)
            }}
            key={currentStep - 1}
          >
            {prev}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            opacity: 1 - Math.abs(currentStep - progress)
          }}
          key={currentStep}
        >
          {curr}
        </div>
        {next && (
          <div
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: Math.max(0, progress - currentStep)
            }}
            key={currentStep + 1}
          >
            {next}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            height: "100%",
            width: "100%",
            backgroundColor: "rgba(1,1,1,0.6)",
          }}
        />
      </div>
    </div>
  )
}

export default ImageSticker