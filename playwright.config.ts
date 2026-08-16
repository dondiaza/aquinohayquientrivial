import { defineConfig, devices } from '@playwright/test';

/**
 * E2E — la diferencia entre «los tipos cuadran» y «se puede jugar».
 *
 * Había 325 tests unitarios y ni uno que comprobara que alguien puede empezar una partida y
 * terminarla. Todo lo verificado durante el desarrollo se hizo a mano, así que un cambio en
 * el reductor de sala podía romper el juego con el CI en verde.
 *
 * Se prueba contra el build de PRODUCCIÓN, no contra `next dev`: el bug que más tiempo costó
 * en este proyecto —la carpeta de imágenes leída al cargar el módulo— solo se manifiesta en
 * el build, y probar en desarrollo lo habría escondido.
 *
 * Un solo navegador a propósito. El objetivo es saber si el juego funciona, no barrer
 * motores; añadir Firefox y WebKit triplica el tiempo de CI para responder una pregunta que
 * hoy no nos hacemos.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3210',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  },

  projects: [
    // Móvil primero, que es como se juega esto de verdad.
    { name: 'movil', use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
  ],

  // Sin `E2E_BASE_URL` levanta el servidor él mismo. Con ella, se prueba contra lo desplegado.
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run start',
          url: 'http://localhost:3210',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
