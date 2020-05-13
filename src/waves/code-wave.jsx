import React from "react"
import BarScroller from "./bar-scroller.jsx"
import CodeSticker from "./code-sticker.jsx"
import Wave from "./wave.jsx"

/**
 *
 * There are two ways to use <CodeWave> in MDX:
 *
 *
 * <CodeWave>
 *
 * ```js 1:2
 * // some code
 * ```
 *
 * ## some
 *
 * ## markdown
 *
 * ```js
 * // more code
 * ```
 *
 * - more
 * - markdown
 *
 * </CodeWave>
 *
 *
 * Or, using the output of rehype-waves:
 *
 *
 * <CodeWave parsedSteps={...}>
 *
 * <div>
 *
 * ## some
 *
 * ## markdown
 *
 * </div>
 *
 * <div>
 *
 * - more
 * - markdown
 *
 * </div>
 *
 * </CodeWave>
 *
 *
 *
 */

function CodeWave(props) {
  const { parsedSteps } = props

  const childrenToColumns = children => {
    const kids = React.Children.toArray(children)
    if (parsedSteps) {
      return [[], React.Children.toArray(children)]
    } else {
      const columnCount = 2
      return toColumns(kids, columnCount)
    }
  }

  return (
    <Wave
      columnComponents={[CodeSticker, BarScroller]}
      childrenToStepColumns={childrenToColumns}
      {...props}
    />
  )
}

function toColumns(items, columnCount) {
  const columns = Array(columnCount)
    .fill()
    .map(() => [])

  items.forEach((item, i) => {
    const isCode = item.props && item.props.mdxType === "pre"
    if (isCode) {
      columns[0].push(item)
      columns[1].push(React.createElement("div", {}, []))
    } else {
      const step = columns[0].length - 1
      columns[1][step].props.children.push(item)
    }
  })

  return columns
}

export default CodeWave