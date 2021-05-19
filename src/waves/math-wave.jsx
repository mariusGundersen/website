import React from "react"
import BarScroller from "./bar-scroller.jsx"
import MathSticker from "./math-sticker.jsx"
import Wave from "./wave.jsx"

/**
 *
 * Usage
 *
 *
 * <MathWave>
 *
 * $$
 * y = e^x
 * $$
 *
 * ## some
 *
 * ## markdown
 *
 * $$
 * ln y = x
 * $$
 *
 * - more
 * - markdown
 *
 * </MathWave>
 *
 *
 */

function MathWave(props) {

  const childrenToColumns = children => {
    const kids = React.Children.toArray(children)
    const columnCount = 2
    return toColumns(kids, columnCount)
  }

  return (
    <Wave
      columnComponents={[MathSticker, BarScroller]}
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
    const isMath = item.props && item.props.mdxType === "div" && item.props.className == "math math-display";
    if (isMath) {
      columns[0].push(item)
      columns[1].push(React.createElement("div", {}, []))
    } else {
      const step = columns[0].length - 1
      columns[1][step].props.children.push(item)
    }
  })

  return columns
}

export default MathWave