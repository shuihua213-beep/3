import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 29983,   // 随机端口（由脚本生成）
    strictPort: false,     // 若被占用，Vite 会继续找下一个可用端口
    open: false
  },
  preview: {
    port: 29983,            // 预览端口保持默认，可按需改为随机
    strictPort: false
  }
})