import LegalPageShell from "./LegalPageShell";

export default function Contact() {
  return (
    <LegalPageShell title="Contact" kicker="Support">
      <p>
        Need help with Work Zone OS? Reach out to Superior Consultation, LLC.
      </p>
      <ul className="space-y-1 text-orange-100/85">
        <li>Email: <a className="underline decoration-orange-400" href="mailto:support@superiorconsultation.com">support@superiorconsultation.com</a></li>
        <li>Phone: +1 (800) 000-0000</li>
        <li>Hours: Monday–Friday, 9am–6pm ET</li>
      </ul>
      <p>
        For urgent field issues, follow your organization&apos;s escalation plan and local safety protocols first.
      </p>
    </LegalPageShell>
  );
}
