// Entry for the WordPress block (npm run build:wordpress). The build script
// wraps this bundle so CSE_MAP_CSS holds all of the app's CSS as a string.

import { mountEmbeddedMap, MOUNT_ID } from './embed.tsx'

declare const CSE_MAP_CSS: string

const host = document.getElementById(MOUNT_ID)
if (host) mountEmbeddedMap(host, CSE_MAP_CSS)
