import { NextRequest, NextResponse } from "next/server";

/**
 * PROXY API ROUTE
 * used to bypass CORS restrictions for the global registry (Rentry.co)
 */
export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
    }

    // Only allow rentry.co URLs for security
    if (!url.startsWith("https://rentry.co/")) {
        return NextResponse.json({ error: "Unauthorized URL" }, { status: 403 });
    }

    try {
        const response = await fetch(url + (url.endsWith("/raw") ? "" : "/raw"), {
            cache: "no-store",
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Upstream error" }, { status: response.status });
        }

        const data = await response.text();
        // Return text so the sync service can parse it according to its needs
        return new NextResponse(data, {
            status: 200,
            headers: { "Content-Type": "text/plain" }
        });
    } catch (e) {
        return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    const formData = await req.formData();

    if (!url || !url.startsWith("https://rentry.co/api/edit/")) {
        return NextResponse.json({ error: "Unauthorized or Missing URL" }, { status: 403 });
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData as any),
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Upstream error" }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Push failed" }, { status: 500 });
    }
}
