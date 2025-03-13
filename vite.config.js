import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxiconf = {
    proxy: {
      '/api': {
        target: env.VITE_API_REAL_URL,
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
    cors: false,
  };
  return {
    server: proxiconf,
    preview: proxiconf,
    plugins: [tailwindcss()],
  };
});
