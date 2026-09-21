import { expect, test } from "@playwright/test";

/**
 * Prueba de humo: comprueba que el runner, el navegador y la app se hablan.
 *
 * Deliberadamente sobre /login, la única pantalla sin sesión: no hay forma de
 * automatizar el login sin meter credenciales en el repositorio, y eso no se
 * hace (regla 8 de AGENTS.md). Para cubrir las pantallas privadas hará falta
 * decidir antes cómo se siembra una sesión de prueba.
 */
test("la pantalla de login carga y pide correo y contraseña", async ({
  page,
}) => {
  await page.goto("/login");

  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.getByRole("button", { name: /iniciar sesión|entrar/i })).toBeVisible();
});

/** Una ruta protegida sin sesión tiene que mandar al login, no renderizarse. */
test("una ruta protegida redirige al login sin sesión", async ({ page }) => {
  await page.goto("/ordenes-trabajo");

  await expect(page).toHaveURL(/\/login$/);
});
