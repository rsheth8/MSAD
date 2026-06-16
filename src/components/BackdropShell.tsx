/** Instant CSS backdrop while the WebGL contour shader chunk loads and compiles. */
export function BackdropShell() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: `radial-gradient(ellipse 85% 55% at 100% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 65%),
          radial-gradient(ellipse 70% 45% at 0% 100%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 60%)`,
      }}
    />
  );
}
