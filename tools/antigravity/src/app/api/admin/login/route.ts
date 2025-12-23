import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    const { password } = await req.json();
    if (password === "Pohlidor87") {
        (await cookies()).set("admin_session", "true", { path: "/", httpOnly: true });
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
