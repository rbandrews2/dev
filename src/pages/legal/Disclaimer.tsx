import LegalPageShell from "./LegalPageShell";

export default function Disclaimer() {
  return (
    <LegalPageShell title="Disclaimer" kicker="Work Zone OS">
      <p>
        Work Zone OS supports field operations, but final safety decisions and regulatory compliance remain your responsibility. Outputs, recommendations, and map data may not reflect real-time conditions.
      </p>
      <p>
        Always follow local laws, MUTCD guidance, and site-specific safety protocols. Use the platform as an assistive tool, not as a substitute for professional judgment.
      </p>
    </LegalPageShell>
  );
}
