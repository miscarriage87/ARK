import type { Metadata } from "next";
import "../globals.css";
import "./admin.css"; // Ensure global styles are applied

export const metadata: Metadata = {
    title: "dArk | Adminbereich",
    description: "Administrative Backend",
};

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="admin-scope antialiased bg-black min-h-screen text-white">
            {children}
        </div>
    );
}
