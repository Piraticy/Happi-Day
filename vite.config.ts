import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { randomUUID } from 'node:crypto'

const version = randomUUID()

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), {
    name: 'app-release-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) })
    },
  }],
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] },
})
