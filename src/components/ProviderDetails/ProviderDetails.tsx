import { cx } from "../../util/classNames";
import { PROVIDER, providerEntries, type Provider } from "./provider";
import "./ProviderDetails.css";

type ProviderDetailsProps = {
  provider?: Provider;
  className?: string;
};

export function ProviderDetails({ provider = PROVIDER, className }: ProviderDetailsProps) {
  return (
    <dl className={cx("provider-details", className)}>
      {providerEntries(provider).map(({ label, value, href }) => (
        <div key={label} className="provider-details-item">
          <dt>{label}</dt>
          <dd>{href ? <a href={href}>{value}</a> : value}</dd>
        </div>
      ))}
    </dl>
  );
}
