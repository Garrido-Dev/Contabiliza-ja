import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // pode variar dependendo do seu projeto

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Libera o acesso para a rede local
    allowedHosts: true // Permite que o Ngrok acesse sem dar o erro 403
  }
})
