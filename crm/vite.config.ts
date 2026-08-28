import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const parentEnv = loadEnv(mode, "..", "NEXT_PUBLIC_");
  const crmEnv = loadEnv(mode, ".", "VITE_");
  return {
    plugins: [react()],
    publicDir: "../public/brand",
    server: { port: 3010 },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(crmEnv.VITE_SUPABASE_URL || parentEnv.NEXT_PUBLIC_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(crmEnv.VITE_SUPABASE_PUBLISHABLE_KEY || parentEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    },
  };
});
