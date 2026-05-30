import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl =
    env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEYS ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEYS ||
    env.SUPABASE_ANON_KEY ||
    "";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEYS": JSON.stringify(supabasePublishableKey),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabasePublishableKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (id.includes("react-router") || id.includes("@remix-run")) {
              return "router";
            }

            if (id.includes("@supabase")) {
              return "supabase";
            }

            if (id.includes("recharts")) {
              return "charts";
            }

            if (id.includes("@fullcalendar")) {
              return "calendar";
            }

            if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("sonner")) {
              return "ui-vendor";
            }
          },
        },
      },
    },

    server: {
      host: true,
      strictPort: true,
      port: 8080,
      open: false,

    },
  };
})
