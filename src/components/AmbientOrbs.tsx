/** Soft accent blobs that fill empty space behind the dashboard — complements SceneBackground. */
export function AmbientOrbs() {
  return (
    <div className="ambient-orbs" aria-hidden>
      <div
        className="ambient-orb ambient-orb-a"
        style={{
          width: "min(42vw, 520px)",
          height: "min(42vw, 520px)",
          top: "8%",
          right: "-8%",
        }}
      />
      <div
        className="ambient-orb ambient-orb-b"
        style={{
          width: "min(32vw, 380px)",
          height: "min(32vw, 380px)",
          bottom: "12%",
          left: "-6%",
        }}
      />
    </div>
  );
}
