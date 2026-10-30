import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { chooseLanguage } from "../../i18n/apply";
import { HTML_LANG } from "../../i18n/languages";
import { alternatePaths } from "../../i18n/paths";
import { useLanguage } from "../../i18n/useLanguage";
import { cx } from "../../util/classNames";
import "./LanguageSwitch.css";

type LanguageSwitchProps = {
  className?: string;
  full?: boolean;
};

export function LanguageSwitch({ className, full = false }: LanguageSwitchProps) {
  const { t } = useTranslation();
  const { hash } = useLocation();
  const current = useLanguage();
  const others = alternatePaths(useLocation().pathname).filter((alternate) => alternate.language !== current);
  if (others.length === 0) return null;
  return (
    <nav className={cx("language-switch", className)} aria-label={t("languageLabel")}>
      {others.map(({ language, path }) => (
        <Link
          key={language}
          to={`${path}${hash}`}
          lang={HTML_LANG[language]}
          hrefLang={HTML_LANG[language]}
          className="language-switch-link"
          aria-label={full ? undefined : t(`languages.${language}`)}
          onClick={() => chooseLanguage(language)}
        >
          {full ? t(`languages.${language}`) : language.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
