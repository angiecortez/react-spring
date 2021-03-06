import React from 'react'
import ReactDOM from 'react-dom'
import { convertValues, getValues } from '../../shared/helpers'

const check = value => value === 'auto'
const overwrite = (width, height) => (acc, [name, value]) => ({
  ...acc,
  [name]: value === 'auto' ? (~name.indexOf('height') ? height : width) : value,
})

export default function fixAuto(props, callback) {
  const { from, to, children } = props

  // Dry-route props back if nothing's using 'auto' in there
  // TODO: deal with "null"
  if (!(getValues(to).some(check) || getValues(from).some(check))) return
  // Fetch render v-dom
  let element = children(convertValues(props))
  // A spring can return undefined/null, check against that (#153)
  if (!element) return
  // Or it could be an array (#346) ...
  if (Array.isArray(element))
    element = { type: 'div', props: { children: element } }
  // Extract styles
  const elementStyles = element.props.style

  // Return v.dom with injected ref
  return (
    <element.type
      key={element.key ? element.key : undefined}
      {...element.props}
      style={{ ...elementStyles, position: 'absolute', visibility: 'hidden' }}
      ref={ref => {
        if (ref) {
          // Once it's rendered out, fetch bounds (minus padding/margin/borders)
          let node = ReactDOM.findDOMNode(ref)
          let width, height
          let cs = getComputedStyle(node)
          if (cs.boxSizing === 'border-box') {
            width = node.offsetWidth
            height = node.offsetHeight
          } else {
            const paddingX =
              parseFloat(cs.paddingLeft || 0) + parseFloat(cs.paddingRight || 0)
            const paddingY =
              parseFloat(cs.paddingTop || 0) + parseFloat(cs.paddingBottom || 0)
            const borderX =
              parseFloat(cs.borderLeftWidth || 0) +
              parseFloat(cs.borderRightWidth || 0)
            const borderY =
              parseFloat(cs.borderTopWidth || 0) +
              parseFloat(cs.borderBottomWidth || 0)
            width = node.offsetWidth - paddingX - borderX
            height = node.offsetHeight - paddingY - borderY
          }

          const convert = overwrite(width, height)
          callback({
            ...props,
            from: Object.entries(from).reduce(convert, from),
            to: Object.entries(to).reduce(convert, to),
          })
        }
      }}
    />
  )
}
