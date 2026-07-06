import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const arisPackages = [
  '@aris/agent',
  '@aris/core',
  '@aris/stream',
  '@aris/tasks',
  '@aris/workspace',
  '@aris/research',
  '@aris/projects',
  '@aris/notes',
  '@aris/server',
]

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: {
    noExternal: [...arisPackages, '@cursor/sdk'],
  },
  optimizeDeps: {
    exclude: ['@cursor/sdk'],
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
