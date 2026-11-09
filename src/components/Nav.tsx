"use client";

import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { USERS } from "@/lib/users";
import { useUserState } from "./UserProvider";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/problems", label: "Problems" },
  { href: "/resources", label: "Resources" },
];

export function Nav() {
  const pathname = usePathname();
  const { user, switchUser } = useUserState();
  const me = USERS.find((u) => u.id === user);
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-card/80 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:gap-5">
        <Link href="/" className="font-mono font-bold whitespace-nowrap">
          <span className="text-acc">$</span> <span className="hidden sm:inline">lc-warriors</span>
          <span className="sm:hidden">lcw</span>
        </Link>
        <div className="flex gap-0.5">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150 sm:px-3 sm:text-sm ${
                  active ? "bg-card2 text-fg" : "text-mut hover:text-fg"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        {me && (
          <button
            type="button"
            onClick={switchUser}
            aria-label="Switch user"
            className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line py-1 pr-2 pl-1 sm:gap-2 sm:pr-3 font-mono text-sm transition-colors duration-150 hover:border-acc"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md border border-acc bg-card2 text-xs font-bold">
              {me.monogram}
            </span>
            <span className="hidden sm:inline">{me.id}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 text-mut" aria-hidden />
          </button>
        )}
      </nav>
    </header>
  );
}
