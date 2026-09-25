import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      // input: false — role y activo nunca se aceptan desde el cuerpo de la
      // petición de registro; de lo contrario cualquiera podría auto-asignarse
      // un rol al crear su cuenta.
      role: {
        type: "string",
        required: false,
        defaultValue: "admin",
        input: false,
      },
      nombre_completo: {
        type: "string",
        required: true,
      },
      activo: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      // input: false también aquí, pero por otro motivo: dni y telefono se
      // editan desde el perfil a través de una Server Action propia, que es
      // donde vive la validación (regla invariable 1). Con input: true,
      // /api/auth/update-user los aceptaría sin pasar por ella. Better Auth
      // aplica input: false tanto al crear como al actualizar.
      dni: {
        type: "string",
        required: false,
        unique: true,
        input: false,
        // returned: false — el DNI no viaja en /api/auth/get-session ni en
        // useSession(). La pantalla de perfil lo lee con Drizzle, en el
        // servidor. Ver pregunta 21 de docs/spec/preguntas-abiertas.md.
        returned: false,
      },
      telefono: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  plugins: [nextCookies()],
});
