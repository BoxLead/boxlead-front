import { Link } from "react-router-dom";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import { LegalLayout } from "./LegalLayout";

export function DataDeletion() {
  return (
    <LegalLayout title="Data Deletion Instructions" updated="March 29, 2026">
      <p>
        If you no longer wish to use {PRODUCT_NAME} and want all your data
        permanently removed from our systems, follow the steps below.{" "}
        {PRODUCT_NAME} is operated by {LEGAL_ENTITY_NAME}. This process ensures
        complete erasure of your Leads, Conversations, and Messages from our
        database.
      </p>

      <h2>Step 1: Remove BoxLead from Facebook</h2>
      <p>
        First, revoke BoxLead's access to your Facebook account by removing the
        integration:
      </p>
      <ol>
        <li>
          Go to <strong>Facebook Settings</strong> &rarr;{" "}
          <strong>Security and Login</strong> &rarr;{" "}
          <strong>Business Integrations</strong>.
        </li>
        <li>
          Find <strong>BoxLead</strong> in the list of active integrations.
        </li>
        <li>
          Click <strong>Remove</strong> to disconnect BoxLead from your Facebook
          account.
        </li>
      </ol>
      <p>
        This immediately stops BoxLead from receiving any new messages or data
        from your connected Facebook Pages and Instagram accounts.
      </p>

      <h2>Step 2: Request Data Erasure</h2>
      <p>
        After removing the integration, send an email to our support team to
        request full deletion of your stored data:
      </p>
      <div className="legal-contact">
        <p>
          <strong>{LEGAL_ENTITY_NAME}</strong>
        </p>
        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:support@boxlead.app">support@boxlead.app</a>
        </p>
        <p>
          <strong>Subject:</strong> Data Deletion Request
        </p>
        <p>
          <strong>Include:</strong> Your BoxLead Account ID (found in your
          account settings) and the email address associated with your account.
        </p>
      </div>

      <h2>Step 3: Confirmation</h2>
      <p>
        Once we receive your request, we will permanently delete the following
        data from our PostgreSQL database within <strong>30 days</strong>:
      </p>
      <ul>
        <li>
          All <strong>Leads</strong> associated with your account.
        </li>
        <li>
          All <strong>Conversations</strong> and their message history.
        </li>
        <li>
          All <strong>Messages</strong> (both inbound and outbound) stored on
          your behalf.
        </li>
        <li>Your account profile and connected integration tokens.</li>
      </ul>
      <p>
        You will receive an email confirmation once the deletion is complete.
      </p>

      <h2>Questions?</h2>
      <p>
        For more information about how we handle your data, see our{" "}
        <Link to="/privacy-policy">Privacy Policy</Link>. If you have any
        questions about the deletion process, contact {LEGAL_ENTITY_NAME} at{" "}
        <a href="mailto:support@boxlead.app">support@boxlead.app</a>.
      </p>
    </LegalLayout>
  );
}
