import { Link } from "react-router-dom";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import { LegalLayout } from "./LegalLayout";

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated="March 29, 2026">
      <p>
        {LEGAL_ENTITY_NAME} ("we", "us", or "our") operates {PRODUCT_NAME}, a
        customer relationship management (CRM) platform that helps businesses
        manage conversations and leads from Facebook and Instagram. This Privacy
        Policy explains what data we collect, how we use it, and your rights
        regarding that data.
      </p>

      <h2>1. Data We Collect</h2>
      <p>
        When you connect your Facebook Page or Instagram Professional account to
        BoxLead, we collect the following information through the Meta Graph
        API:
      </p>
      <ul>
        <li>
          <strong>Facebook Page information</strong> — Page name, Page ID, and
          access tokens required to receive and send messages on your behalf.
        </li>
        <li>
          <strong>Instagram account information</strong> — Instagram username,
          account ID, and access tokens.
        </li>
        <li>
          <strong>Direct messages</strong> — The content of messages sent to and
          from your connected Pages and Instagram accounts, including text and
          metadata (timestamps, sender/recipient IDs).
        </li>
        <li>
          <strong>Lead data</strong> — Contact details and conversation history
          that we derive from incoming messages to help you manage customer
          relationships.
        </li>
      </ul>

      <h2>2. How We Use Your Data</h2>
      <p>
        We process the data described above solely to provide the BoxLead CRM
        service:
      </p>
      <ul>
        <li>
          Display incoming messages in your BoxLead dashboard so you can view
          and reply to customers from one place.
        </li>
        <li>
          Organize contacts into leads and conversations to help you track
          customer relationships.
        </li>
        <li>
          Send replies on your behalf through the Meta Graph API when you
          compose a response in BoxLead.
        </li>
      </ul>

      <h2>3. How We Share Your Data</h2>
      <p>
        We <strong>do not sell</strong> your data to third-party data brokers.
        Period.
      </p>
      <p>We may share data only in the following limited circumstances:</p>
      <ul>
        <li>
          <strong>With Meta</strong> — to send and receive messages via the Meta
          Graph API as part of the core CRM functionality you have authorized.
        </li>
        <li>
          <strong>Infrastructure providers</strong> — we use cloud hosting
          services (e.g., AWS) to store and process your data. These providers
          act as data processors under our instructions.
        </li>
        <li>
          <strong>Legal requirements</strong> — if required by applicable law,
          regulation, or valid legal process.
        </li>
      </ul>

      <h2>4. Data Retention &amp; Deletion</h2>
      <p>
        We retain your data for as long as your BoxLead account is active and
        you maintain connected integrations. You may request{" "}
        <strong>complete deletion</strong> of all your data at any time by:
      </p>
      <ol>
        <li>
          Removing the BoxLead integration from your{" "}
          <strong>Facebook Business Integrations</strong> settings.
        </li>
        <li>
          Emailing us at the address listed below with your Account ID to
          confirm erasure.
        </li>
      </ol>
      <p>
        Upon receiving a valid deletion request, we will permanently remove all
        associated Leads, Conversations, and Messages from our database within
        30 days.
      </p>
      <p>
        For detailed step-by-step instructions, visit our{" "}
        <Link to="/data-deletion">Data Deletion</Link> page.
      </p>

      <h2>5. Data Security</h2>
      <p>
        We implement industry-standard security measures including encrypted
        connections (TLS), secure token storage, and access controls to protect
        your data against unauthorized access.
      </p>

      <h2>6. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will
        revise the "Last updated" date at the top of this page. Continued use of
        BoxLead after changes constitutes acceptance of the updated policy.
      </p>

      <div className="legal-contact">
        <p>
          <strong>{LEGAL_ENTITY_NAME}</strong> — Questions? Contact us at{" "}
          <a href="mailto:support@boxlead.app">support@boxlead.app</a>
        </p>
      </div>
    </LegalLayout>
  );
}
