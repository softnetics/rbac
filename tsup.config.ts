import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: true,
  minify: true,
  clean: true,
  dts: true,
  format: ['cjs', 'esm'],
  sourcemap: true,
})
