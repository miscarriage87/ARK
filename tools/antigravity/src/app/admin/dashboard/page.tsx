import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { User } from "lucide-react";

export default async function AdminDashboard() {
    const cookieStore = await cookies();
    if (!cookieStore.get("admin_session")) {
        redirect("/admin");
    }

    const users = await prisma.user.findMany({
        orderBy: { updatedAt: 'desc' }
    });

    return (
        <main className="min-h-screen p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-serif mb-8 text-white">Admin Dashboard</h1>

            <div className="grid gap-4">
                {users.map(user => (
                    <Link key={user.id} href={`/admin/user/${user.id}`}>
                        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                    <User size={20} className="text-gray-400 group-hover:text-white" />
                                </div>
                                <div>
                                    <div className="font-bold text-lg text-white">{user.name}</div>
                                    <div className="text-xs text-gray-500 font-mono">{user.id}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                {user.aiConfig ? (
                                    <span className="text-green-400 text-xs px-2 py-1 bg-green-900/30 rounded">Custom AI</span>
                                ) : (
                                    <span className="text-gray-600 text-xs px-2 py-1 bg-gray-900 rounded">Default</span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    );
}
