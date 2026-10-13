import { defineConfig } from "vite";

export default defineConfig({
    server: {
        // Alle Anfragen an /api gehen an unseren Node.js-Server
        proxy: {
            "/api": "http://localhost:3000"
        }
    }
});
