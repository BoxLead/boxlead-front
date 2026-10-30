import { Fragment, type MouseEventHandler } from "react";
import { Link } from "react-router-dom";
import { parseRich } from "./richText";
import { useLocalizedPath } from "./useLanguage";

type RichTextProps = {
  text: string;
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function RichText({ text, onLinkClick }: RichTextProps) {
  const localized = useLocalizedPath();
  return (
    <>
      {parseRich(text).map((part, index) => {
        if (typeof part === "string") return <Fragment key={index}>{part}</Fragment>;
        if (part.href.startsWith("/")) {
          return (
            <Link to={localized(part.href)} key={index} onClick={onLinkClick}>
              {part.label}
            </Link>
          );
        }
        return (
          <a href={part.href} key={index} onClick={onLinkClick}>
            {part.label}
          </a>
        );
      })}
    </>
  );
}
