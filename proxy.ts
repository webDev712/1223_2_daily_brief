import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // API не блокируем — Stripe и остальные API работают
    if (pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    // Статические/internal файлы
    if (
        pathname.startsWith("/_next/") ||
        pathname === "/favicon.ico"
    ) {
        return NextResponse.next();
    }

    // Страна пользователя
    const country = request.headers.get("x-vercel-ip-country");

    return NextResponse.next();
    // Польша — обычный сайт
    if (country === "PL") {
    }

    // Остальные страны
    return NextResponse.rewrite(
        new URL("/under-development", request.url)
    );
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};