import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboardUI from "./AdminDashboardUI";
import {
    CATEGORY_STYLE_GUIDE,
    ARCHETYPES_FOR_MODE,
    MODE_INSTRUCTIONS,
    DEFAULT_MASTER_PROMPT
} from "@/lib/ai-service";

export default async function AdminDashboard() {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")) {
        redirect("/admin");
    }

    const users = await prisma.user.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            views: {
                take: 1,
                orderBy: { date: 'desc' },
                include: { quote: true }
            }
        }
    });

    const systemContext = {
        masterPrompt: DEFAULT_MASTER_PROMPT,
        styleGuides: CATEGORY_STYLE_GUIDE,
        archetypes: ARCHETYPES_FOR_MODE,
        instructions: MODE_INSTRUCTIONS
    };

    return (
        <AdminDashboardUI
            users={users}
            systemContext={systemContext}
            systemVersion="v1.1"
        />
    );
}
