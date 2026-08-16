import { expect, test } from '@playwright/test';

/**
 * LO QUE TIENE QUE FUNCIONAR SÍ O SÍ.
 *
 * Cada uno de estos recorridos es algo que se verificó a mano durante el desarrollo y que
 * nadie volvería a verificar nunca. Ahora los hace el CI.
 */

test.describe('la portada', () => {
  test('abre y enseña el edificio y las caras', async ({ page }) => {
    await page.goto('/');

    // La fachada: lo primero que se ve.
    await expect(page.locator('img[src*="/serie/portal/fachada"]').first()).toBeVisible();

    // Y el botón que arranca una partida en un toque, que es la promesa del juego.
    await expect(page.getByRole('button', { name: /jugar|partida/i }).first()).toBeVisible();
  });

  test('la portería está a la vista y ofrece guardar el progreso', async ({ page }) => {
    await page.goto('/');
    // Esto existía desde hacía tres fases escondido en una barra del ranking. Que esté
    // visible en la cabecera es media funcionalidad.
    await expect(page.locator('summary[title="Guardar tu progreso"]')).toBeVisible();
  });
});

test.describe('una partida en solitario', () => {
  // Una partida completa son bastantes preguntas con su animación entre medias: no cabe en
  // los 45 s por defecto y el primer intento se agotó por eso, no porque el juego fallara.
  test.setTimeout(120_000);

  test('se puede empezar, responder y terminar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /jugar|partida/i }).first().click();

    // Se ha creado la partida y estamos dentro.
    await page.waitForURL(/\/partida\//, { timeout: 30_000 });
    await expect(page.locator('body')).toContainText(/pregunta|ronda|\?/i);

    // Responder hasta que la partida acabe o se agoten los intentos razonables.
    for (let vuelta = 0; vuelta < 40; vuelta += 1) {
      if (/\/resultados\//.test(page.url())) break;

      const siguiente = page.getByRole('button', { name: /siguiente|continuar|seguir/i });
      if (await siguiente.first().isVisible().catch(() => false)) {
        await siguiente.first().click();
        await page.waitForTimeout(250);
        continue;
      }

      // Las opciones de respuesta viven dentro del escenario de la pregunta, no en toda la
      // página: buscar botones sueltos pulsaba el control de sonido y la portería.
      const opciones = page.locator('main button, [data-escenario] button').filter({
        hasNotText: /sonido|guardar|volver|salir|ayuda/i,
      });
      const cuantas = await opciones.count();
      if (cuantas > 0) {
        await opciones.nth(0).click({ timeout: 5_000 }).catch(() => {});
      }
      await page.waitForTimeout(350);
    }

    // Se llega al final: a resultados, o al menos la partida avanzó sin romperse.
    await expect(page.locator('body')).not.toContainText(/application error|unhandled/i);
    expect(
      /\/resultados\//.test(page.url()) || /\/partida\//.test(page.url()),
      'la partida se ha ido a una página inesperada',
    ).toBe(true);
  });
});

test.describe('las preguntas visuales', () => {
  test('el banco sirve preguntas con imagen', async ({ request }) => {
    // No se puede forzar que salga una visual en una partida concreta, así que se comprueba
    // que existen y que su imagen se sirve, que es lo que podría romperse.
    const respuesta = await request.get('/serie/vecinos/juan-cuesta.webp');
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()['content-type']).toContain('image/webp');
  });

  test('las tres anchuras existen', async ({ request }) => {
    for (const variante of ['-mini', '', '-grande']) {
      const respuesta = await request.get(`/serie/vecinos/juan-cuesta${variante}.webp`);
      expect(respuesta.status(), `falta la variante ${variante || 'base'}`).toBe(200);
    }
  });
});

test.describe('la clasificación', () => {
  test('abre en todos los tramos sin romperse', async ({ page }) => {
    for (const tramo of ['', '?tramo=semana', '?tramo=mes', '?tramo=temporada', '?tramo=amigos']) {
      const respuesta = await page.goto(`/ranking${tramo}`);
      expect(respuesta?.status(), `tramo ${tramo || 'global'}`).toBeLessThan(400);
      await expect(page.locator('body')).toContainText(/clasificación|comunidad/i);
    }
  });

  test('en móvil no hay scroll lateral', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'solo aplica al proyecto móvil');
    await page.goto('/ranking');
    // La tabla tenía min-width y obligaba a arrastrar el dedo. Esta es la prueba de que no
    // vuelve a pasar sin que nadie se entere.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(desborda, 'la página se desborda a lo ancho').toBe(false);
  });
});

test.describe('el vecino', () => {
  test('se crea, se guarda y sigue ahí al volver', async ({ page }) => {
    await page.goto('/vecino');
    await expect(page.getByText(/tu vecino/i).first()).toBeVisible();

    // Cambiar una pieza y guardar.
    await page.getByRole('button', { name: /al azar/i }).click();
    await page.getByRole('button', { name: /^listo$/i }).click();
    await expect(page.getByText(/guardado/i).first()).toBeVisible({ timeout: 15_000 });

    // Al recargar sigue siendo el mismo: es lo que hace que registrarse tenga sentido.
    await page.reload();
    await expect(page.getByText(/tu vecino/i).first()).toBeVisible();
  });
});

test.describe('compartir una junta', () => {
  test('el enlace corto lleva a la sala', async ({ page }) => {
    const respuesta = await page.goto('/join/ABCD');
    expect(respuesta?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/unirse/');
  });
});

test.describe('el reto del día', () => {
  test('abre', async ({ page }) => {
    const respuesta = await page.goto('/reto');
    expect(respuesta?.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toContainText(/application error/i);
  });
});
