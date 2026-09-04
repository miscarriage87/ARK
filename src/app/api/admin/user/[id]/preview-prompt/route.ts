import { NextResponse } from "next/server";
import { buildDailyPromptPreview } from "@/lib/ai-service";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isValidUUID, logger } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await isAdminAuthenticated())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidUUID(id)) {
        return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    try {
        const preview = await buildDailyPromptPreview(id);
        return NextResponse.json(preview);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to build prompt preview";
        if (message !== "User not found") {
            logger.error("[Admin] Prompt preview failed:", error);
        }
        return NextResponse.json({ error: message }, { status: message === "User not found" ? 404 : 500 });
    }
}
