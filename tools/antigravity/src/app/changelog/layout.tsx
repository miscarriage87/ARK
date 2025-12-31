import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "dArk | Changelog",
    description: "Update History und Versionen.",
};

export default function ChangelogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
