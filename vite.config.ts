// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',  // 监听所有网络接口，局域网可访问
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',  // npm run preview 同样可局域网访问
    port: 4173,
  },
  test: {
    environment: 'jsdom',
  },
})
