import React from "react"
import { CodeSurfer } from "@code-surfer/standalone"
import { readStepFromElement } from "./step-reader.js"
import { nightOwl, vsDark } from '@code-surfer/themes';

function CodeSticker({ steps: stepElements, progress, parsedSteps }) {
  const steps = React.useMemo(() => parsedSteps
    ? undefined
    : stepElements.map(readStepFromElement),
    [])

  return (
    <div className="waves-sticker-container">
      <div
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <div className="waves-sticker">
          <CodeSurfer
            progress={progress}
            steps={steps}
            parsedSteps={parsedSteps}
            theme={vsDark}
          />
        </div>
      </div>
    </div>
  )
}

export default CodeSticker