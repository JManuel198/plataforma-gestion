import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración mínima de Playwright.
 *
 * Está aquí para que el runner sea usable, no porque exista una suite: hoy
 * solo hay una prueba de humo. La deuda técnica anotada en AGENTS.md sigue en
 * pie — las pruebas que de verdad hacen falta son las de `correlativo.ts`
 * (concurrencia) y `lib/fecha.ts` (zonas horarias), y esas son de unidad, no
 * de navegador. Este archivo no las cubre ni pretende hacerlo.
 *
 * Playwright figura además en el Stack para generar PDF, que es otra cosa y
 * otro paquete: para eso haría falta `playwright-core` + `@sparticuz/chromium`
 * si va a correr en Vercel. `@playwright/test` es solo el runner de pruebas.
 */
export default defineConfig({
  testDir: "./tests",
  // Sin reintentos: una prueba que pasa a la segunda es una prueba que no se
  // entiende. Si aparece intermitencia, se arregla la prueba.
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    // Solo al fallar, para no llenar el disco en cada corrida.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    // Reutiliza el servidor si ya está levantado, en vez de pelearse por el
    // puerto 3000 con el que suele estar corriendo durante el desarrollo.
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
