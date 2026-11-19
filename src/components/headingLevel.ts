import { createContext } from 'react'

/**
 * How many levels to push headings down. 0 in the full site (the page title
 * is the h1); 1 when embedded in WordPress under the page's own h2, so the
 * map's "h2" headings become h3, and so on.
 */
export const HeadingOffset = createContext(0)
