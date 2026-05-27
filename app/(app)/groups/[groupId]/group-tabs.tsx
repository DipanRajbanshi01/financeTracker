"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/members", label: "Members" },
  { href: "/settings", label: "Settings" },
];

export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;

  return (
    <nav className="flex gap-1 border-b border-orbit-border text-sm">
      {tabs.map((t) => {
        const href = `${base}${t.href}`;
        const isActive = t.href === "" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={t.label}
            href={href}
            className={`-mb-px border-b-2 px-3 py-2 transition ${
              isActive
                ? "border-orbit-cyan text-orbit-cyan"
                : "border-transparent text-orbit-muted hover:text-orbit-text"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
