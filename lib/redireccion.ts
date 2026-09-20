/**
 * Si un error lanzado es en realidad el `redirect()` de Next.
 *
 * `redirect()` no falla: interrumpe la ejecución lanzando un error especial
 * que el router reconoce para navegar. Cuando una Server Action lo usa (aquí,
 * `exigirSesion()` mandando a /login), ese error viaja hasta el `await` del
 * cliente, y un `catch` que lo trate como fallo se come la navegación y deja
 * al usuario mirando un mensaje de error en vez de la pantalla de login.
 *
 * Se comprueba por el `digest` y no con `isRedirectError` de Next porque esa
 * función no está exportada en ningún entry público: vive en
 * `next/dist/client/components/redirect-error.js`, una ruta interna que puede
 * moverse en cualquier versión. El prefijo del digest (`NEXT_REDIRECT`) es
 * parte del formato del protocolo y es lo primero que comprueba la propia
 * función de Next.
 *
 * Nota relacionada, por si alguien toca las Server Actions: en el servidor la
 * regla es distinta y más simple — `redirect()` se llama FUERA del `try`, que
 * es lo que documenta Next
 * (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md,
 * líneas 51 y 53). Esta función es para el lado del cliente, donde el error ya
 * viene de vuelta y hay que dejarlo pasar.
 */
export function esRedireccionDeNext(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
