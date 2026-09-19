import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
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
    },
  },
  plugins: [nextCookies()],
});
