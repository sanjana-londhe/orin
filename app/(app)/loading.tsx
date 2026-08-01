// Shown immediately on navigation into any /(app)/* route while the
// server-rendered layout/page is in flight. Keeps the user from
// staring at a blank screen during sign-in / page transitions.

export default function Loading() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#ffffff",
      fontFamily: "var(--font-sans), system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="22" fill="#1d1d1f" />
          <circle cx="50" cy="41" r="18" fill="#0066cc" />
          <circle cx="50" cy="59" r="18" fill="#0066cc" />
        </svg>
        <p style={{
          margin: 0,
          fontFamily: "inherit",
          fontSize: 10, fontWeight: 600,
          color: "#86868b",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>
          Loading…
        </p>
      </div>
    </div>
  );
}
