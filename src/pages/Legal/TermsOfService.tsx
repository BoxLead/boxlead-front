import { Link } from "react-router-dom";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import "./Legal.css";

export function TermsOfService() {
  return (
    <div className="legal-page">
      <Link to="/" className="legal-back">
        &larr; Back to BoxLead
      </Link>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: March 29, 2026</p>

      <p>
        These Terms of Service ("Terms") govern your access to and use of the{" "}
        {PRODUCT_NAME} platform and services, operated by {LEGAL_ENTITY_NAME}.
        By creating an account or using {PRODUCT_NAME}, you agree to be bound by
        these Terms.
      </p>

      <h2>1. Description of Service</h2>
      <p>
        BoxLead is a SaaS customer relationship management (CRM) platform that
        connects to Facebook Pages and Instagram Professional accounts via the
        Meta Graph API. It allows businesses to receive, view, and reply to
        direct messages, manage leads, and organize customer conversations from
        a single dashboard.
      </p>

      <h2>2. Account Responsibilities</h2>
      <ul>
        <li>
          You must provide accurate and complete registration information and
          keep it up to date.
        </li>
        <li>
          You are responsible for maintaining the confidentiality of your
          account credentials.
        </li>
        <li>
          You are responsible for all activity that occurs under your account.
        </li>
        <li>
          You must be at least 18 years old or the age of legal majority in your
          jurisdiction to use BoxLead.
        </li>
      </ul>

      <h2>3. Acceptable Use</h2>
      <p>
        When using BoxLead, you agree <strong>not</strong> to:
      </p>
      <ul>
        <li>
          Send spam, unsolicited messages, or any content that violates Meta's
          Platform Terms or Messaging Policies.
        </li>
        <li>Use the platform to harass, threaten, or abuse any individual.</li>
        <li>
          Attempt to gain unauthorized access to other users' accounts, data, or
          our systems.
        </li>
        <li>
          Use BoxLead for any purpose that violates applicable laws or
          regulations.
        </li>
        <li>
          Reverse-engineer, decompile, or attempt to extract the source code of
          the platform.
        </li>
      </ul>

      <h2>4. Messaging Platform Rules</h2>
      <p>
        BoxLead integrates with Meta's messaging infrastructure. You acknowledge
        that:
      </p>
      <ul>
        <li>
          All messaging is subject to Meta's Platform Terms, Community
          Standards, and Messaging Policies.
        </li>
        <li>
          BoxLead may restrict or suspend messaging functionality if Meta
          revokes access or changes its policies.
        </li>
        <li>
          You are solely responsible for the content of messages you send
          through the platform.
        </li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>
        The BoxLead platform, including its design, code, and branding, is owned
        by BoxLead and protected by intellectual property laws. You retain full
        ownership of the data you provide and the content you send through the
        platform.
      </p>

      <h2>6. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, BoxLead shall not be liable for
        any indirect, incidental, special, consequential, or punitive damages,
        including loss of profits, data, or business opportunities, arising from
        your use of the platform. BoxLead is provided on an "as is" and "as
        available" basis without warranties of any kind.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using BoxLead at any time by disconnecting your
        integrations and deleting your account. We reserve the right to suspend
        or terminate your access if you violate these Terms, abuse the platform,
        or if required by law. Upon termination, you may request deletion of
        your data as described in our{" "}
        <Link to="/privacy-policy">Privacy Policy</Link>.
      </p>

      <h2>8. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. When we do, we will revise
        the "Last updated" date at the top of this page. Continued use of
        BoxLead after changes constitutes acceptance of the updated Terms.
      </p>

      <div className="legal-contact">
        <p>
          <strong>{LEGAL_ENTITY_NAME}</strong> — Questions? Contact us at{" "}
          <a href="mailto:support@boxlead.app">support@boxlead.app</a>
        </p>
      </div>
    </div>
  );
}
