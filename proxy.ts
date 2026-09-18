import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Chequeo optimista: solo mira si la cookie de sesión existe, no la valida.
// La verificación real corre en app/(protegido)/layout.tsx contra la base de
// datos — este proxy solo evita renderizar pantallas privadas de más.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
