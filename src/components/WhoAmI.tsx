"use client";

import { USERS, type UserId } from "@/lib/users";

export function WhoAmI({ onPick }: { onPick: (user: UserId) => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Choose your profile" className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-bg px-4 py-16">
      <h1 className="font-mono text-2xl font-semibold">
        <span className="text-acc">$</span> whoami
        <span aria-hidden className="cursor-blink ml-1 inline-block h-6 w-2.5 translate-y-1 bg-acc" />
      </h1>
      <p className="mt-2 font-mono text-sm text-mut">lc-warriors · leetcode 75</p>
      <div className="mt-10 flex flex-wrap justify-center gap-5">
        {USERS.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onPick(u.id)}
            className="group flex w-32 cursor-pointer flex-col items-center gap-3 rounded-xl text-mut transition-colors duration-200 hover:text-fg focus-visible:text-fg"
          >
            <span className="grid h-28 w-full place-items-center rounded-xl border border-line bg-gradient-to-br from-card2 to-bg font-mono text-4xl font-bold text-fg transition-[border-color,box-shadow] duration-200 group-hover:border-acc group-hover:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]">
              {u.monogram}
            </span>
            <span className="font-mono text-sm">{u.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
