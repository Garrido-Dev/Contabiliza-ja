import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // ou o plugin do seu framework

export default defineConfig({
  plugins: [react()],

  base: process.env.NODE_ENV === 'production' && process.env.GITHUB_ACTIONS
    ? '/Contabiliza-ja/' 
    : '/', 
})

