import React from "react"
import OpacityScroller from "./opacity-scroller.jsx"
import Wave from "./wave.jsx"
import ImageSticker from "./image-sticker.jsx"

function toColumns(items, columnCount) {
  const columns = Array(columnCount)
    .fill()
    .map(() => [])

  items.forEach((item, i) => {
    const isImg =
      item.props &&
      item.props.mdxType === "p" &&
      item.props.children &&
      item.props.children.props &&
      item.props.children.props.mdxType === 'img';
    if (isImg) {
      const img = React.cloneElement(
        item.props.children,
        { style: { width: "100%", height: "100%", objectFit: "cover" } }
      )
      columns[0].push(img)
      columns[1].push(React.createElement("div", {}, []))
    } else {
      const step = columns[0].length - 1
      columns[1][step].props.children.push(item)
    }
  })

  return columns
}

function ImageWave(props) {
  const childrenToColumns = children => {
    const items = React.Children.map(children, child => [child])
    const columnCount = 2
    const columns = toColumns(items, columnCount)
    return columns
  }

  return (
    <Wave
      columnComponents={[ImageSticker, OpacityScroller]}
      childrenToStepColumns={childrenToColumns}
      {...props}
    />
  )
}

export default ImageWave