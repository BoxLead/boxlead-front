import { Link } from "react-router-dom";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "../../util/company";
import { LegalLayout } from "./LegalLayout";

export function DataDeletion() {
  return (
    <LegalLayout title="Data Deletion Instructions" language="en" meta="Last updated: November 3, 2026">
      <p>
        {PRODUCT_NAME}, operated by {LEGAL_ENTITY_NAME}, lets you control your data yourself. You can disconnect a
        social account (Facebook Page, Instagram or WhatsApp) from {PRODUCT_NAME}, or delete your whole account and
        everything stored in it, without contacting us.
      </p>

      <h2>Disconnect a social account from {PRODUCT_NAME}</h2>
      <ol>
        <li>
          Sign in at <a href="https://boxlead.app/login">boxlead.app</a> and open <strong>Connections</strong>.
        </li>
        <li>
          Find the account you want to remove and click <strong>Disconnect</strong>.
        </li>
        <li>Confirm in the dialog.</li>
      </ol>
      <p>
        {PRODUCT_NAME} immediately deletes the connection and the access tokens it stored for that account, and stops
        receiving its new messages. Conversations and leads that were already in {PRODUCT_NAME} are kept until you
        delete them or delete your account.
      </p>
      <p>
        To also revoke the permissions on the Meta side, remove {PRODUCT_NAME} from your Facebook settings: go to{" "}
        <strong>Settings</strong> &rarr; <strong>Security and Login</strong> &rarr;{" "}
        <strong>Business Integrations</strong>, find <strong>BoxLead</strong> and click <strong>Remove</strong>.
      </p>

      <h2>Delete your account and all its data</h2>
      <ol>
        <li>
          Sign in and open <Link to="/app/cuenta">Account</Link> from the account menu.
        </li>
        <li>
          In the <strong>Delete account</strong> section, click the delete button.
        </li>
        <li>
          Confirm it is you with your password, or by signing in again with Google or Facebook if you signed up that
          way.
        </li>
        <li>
          Type <strong>BORRAR</strong> (the confirmation word, in capital letters) and confirm.
        </li>
      </ol>
      <p>
        If your account has a paid subscription, cancel it first in Billing, or request the cancellation{" "}
        <Link to="/baja">here</Link>, and then delete the account.
      </p>
      <p>The deletion is immediate and cannot be undone. It removes:</p>
      <ul>
        <li>Your connections with Meta, WhatsApp and Mercado Libre, and their access tokens.</li>
        <li>Your leads, conversations and messages.</li>
        <li>Your categories, agents and their settings.</li>
        <li>Your sign-in details and usage data.</li>
      </ul>
      <p>
        We only keep what the law requires, such as invoices, payments and the record of the terms you accepted. You
        receive an email when the deletion is complete.
      </p>

      <h2>Ask us to delete your data</h2>
      <p>
        If you cannot sign in, or you are a customer who wrote to a business that uses {PRODUCT_NAME} and you want your
        messages removed, email us and we will delete the data within <strong>30 days</strong>.
      </p>
      <div className="legal-contact">
        <p>
          <strong>{LEGAL_ENTITY_NAME}</strong>
        </p>
        <p>
          <strong>Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          <strong>Subject:</strong> Data Deletion Request
        </p>
        <p>
          <strong>Include:</strong> the email address of your {PRODUCT_NAME} account, or, if you are a customer of a
          business, the name or phone number you used to write to it.
        </p>
      </div>

      <h2>Questions?</h2>
      <p>
        For more information about how we handle your data, see our <Link to="/privacy-policy">Privacy Policy</Link>.
        You can also write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}
