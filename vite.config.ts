import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: 如需部署到 https://<user>.github.io/<repo>/，
// 把 base 改成 '/<repo>/'（例如 '/credit-card-center/'）。
export default defineConfig({
  plugins: [react()],
  base: './',
})
