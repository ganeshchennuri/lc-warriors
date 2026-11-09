export type UserId = "raj" | "ganesh" | "arbaaz";

export const USERS: readonly { id: UserId; name: string; monogram: string }[] = [
  { id: "raj", name: "Raj", monogram: "R" },
  { id: "ganesh", name: "Ganesh", monogram: "G" },
  { id: "arbaaz", name: "Arbaaz", monogram: "A" },
];

export const ALL_USER_IDS: UserId[] = USERS.map((u) => u.id);

export function isUserId(x: unknown): x is UserId {
  return typeof x === "string" && USERS.some((u) => u.id === x);
}

export function userName(id: UserId): string {
  return USERS.find((u) => u.id === id)!.name;
}
