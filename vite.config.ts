import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // 相対パスで出力し、dist をどのフォルダ・サブパスに置いても動くようにする（提出用）
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
})
