export function PageSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6" aria-busy="true">
      <div className="h-7 w-48 animate-pulse rounded bg-card2" />
      <div className="mt-6 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-card" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="mt-3 h-20 animate-pulse rounded-xl bg-card" />
      ))}
    </main>
  );
}
