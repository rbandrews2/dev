import LegalPageShell from "./LegalPageShell";

export default function LicenseAgreement() {
  return (
    <LegalPageShell title="Limited Ownership License Agreement" kicker="Work Zone OS">
      <div className="space-y-4 text-amber-100/85">
        <p>Work Zone OS (WZOS)</p>
        <p>Superior Consultation, LLC</p>
        <p>Contact: info@superiorllc.org</p>
        <p>Effective Date: [Insert Date]</p>
        <p>
          This Limited Ownership License Agreement (“Agreement”) is a legally binding agreement
          between Superior Consultation, LLC (“Licensor,” “we,” “us,” or “our”) and the
          individual or entity (“Licensee,” “you,” or “your”) accessing or using Work Zone OS
          (WZOS) (the “Software”).
        </p>
        <p>
          By accessing, using, or authorizing uuse of the Software or any of its features, modules,
          or services, you acknowledge that you have read, understood, and agree to be bound by the
          terms of this Agreement.
        </p>

        <p className="font-semibold">1. Ownership and License Grant</p>
        <p>
          The Software, including but not limited to all source code, object code, designs,
          workflows, interfaces, documentation, databases, and associated intellectual property, is
          owned exclusively by Superior Consultation, LLC.
        </p>
        <p>
          Subject to your compliance with this Agreement, Licensor grants you a limited,
          non-exclusive, non-transferable, revocable license to access and use the Software solely
          for your internal business operations.
        </p>
        <p>No ownership rights are transferred under this Agreement.</p>

        <p className="font-semibold">2. Restrictions on Modification and Use</p>
        <p>You may not, directly or indirectly:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Modify, alter, customize, reverse engineer, decompile, disassemble, or create derivative works of the Software</li>
          <li>Attempt to bypass, disable, or interfere with security, licensing, or access controls</li>
          <li>Copy, resell, sublicense, lease, distribute, or otherwise make the Software available to third parties</li>
          <li>Integrate third-party code, tools, or systems into the Software without prior written consent</li>
        </ul>
        <p>
          Any modification, customization, or alteration of the Software requires explicit written
          authorization from Superior Consultation, LLC. Unauthorized changes immediately terminate
          this license.
        </p>

        <p className="font-semibold">3. Acceptance Through Use</p>
        <p>By using the Software or any available features, modules, forms, dashboards, or services provided through WZOS, you expressly agree to be bound by:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>This Limited Ownership License Agreement</li>
          <li>Any accompanying Terms of Service, Privacy Policy, or Disclaimers</li>
        </ul>
        <p>Continued use constitutes ongoing acceptance.</p>

        <p className="font-semibold">4. Limited Warranty</p>
        <p>The Software is provided with a one (1) year limited warranty from the date of initial activation.</p>
        <p>During the warranty period, Superior Consultation, LLC warrants that:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>The Software will operate substantially as described under normal use</li>
          <li>Material defects affecting core functionality will be addressed in a commercially reasonable timeframe</li>
        </ul>
        <p>This warranty does not cover issues arising from:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Unauthorized modifications</li>
          <li>Misuse, abuse, or improper operation</li>
          <li>Third-party integrations not approved in writing</li>
        </ul>

        <p className="font-semibold">5. Updates, Enhancements, and Security</p>
        <p>
          During the active license period, Licensee is granted unrestricted access to product
          enhancements and security updates, including but not limited to:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Bug fixes</li>
          <li>Performance improvements</li>
          <li>Security patches</li>
          <li>Feature refinements</li>
        </ul>
        <p>
          Licensor retains sole discretion over feature availability, rollout timing, and activation
          requirements.
        </p>

        <p className="font-semibold">6. Termination</p>
        <p>This license may be terminated immediately by Superior Consultation, LLC if you:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Violate any term of this Agreement</li>
          <li>Attempt unauthorized modification or redistribution</li>
          <li>Use the Software in a manner inconsistent with its intended purpose</li>
        </ul>
        <p>
          Upon termination, all rights granted under this Agreement cease, and you must discontinue
          use of the Software.
        </p>

        <p className="font-semibold">7. Limitation of Liability</p>
        <p>
          To the maximum extent permitted by law, Superior Consultation, LLC shall not be liable for
          any indirect, incidental, consequential, or special damages arising from or related to use
          of the Software, including but not limited to loss of data, business interruption, or lost
          profits.
        </p>

        <p className="font-semibold">8. Governing Law</p>
        <p>
          This Agreement shall be governed by and construed in accordance with the laws of the
          Commonwealth of Virginia, without regard to conflict of law principles.
        </p>

        <p className="font-semibold">9. Entire Agreement</p>
        <p>
          This Agreement constitutes the entire understanding between the parties regarding the
          Software and supersedes all prior agreements or understandings, whether written or oral.
        </p>

        <p>Superior Consultation, LLC</p>
        <p>All rights reserved.</p>
      </div>
    </LegalPageShell>
  );
}
