import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'out/**', '.worktrees/**'],
    alias: {
      'vscode': new URL('./tests/__mocks__/vscode.ts', import.meta.url).pathname,
    },
  },
})
