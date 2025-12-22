import type { Metadata } from "next";
import "../globals.css"; // Ensure global styles are applied

export const metadata: Metadata = {
    title: "ARK Admin",
    description: "Administrative Backend",
};

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="antialiased bg-black min-h-screen text-white">
            {children}
        </div>
    );
}
