// A heading at a logical level (2 = a main section of the app), shifted by
// HeadingOffset where the map sits under someone else's headings. The class
// names the logical level, so styles don't depend on the tag.

import { useContext, type HTMLAttributes, type Ref } from 'react'
import { HeadingOffset } from './headingLevel.ts'

export function H({
  level,
  className,
  ref,
  ...props
}: { level: 2 | 3; ref?: Ref<HTMLHeadingElement> } & HTMLAttributes<HTMLHeadingElement>) {
  const Tag = `h${Math.min(6, level + useContext(HeadingOffset))}` as 'h2'
  return <Tag ref={ref} className={[`heading-${level}`, className].filter(Boolean).join(' ')} {...props} />
}
