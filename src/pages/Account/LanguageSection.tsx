import { useId } from "react";
import { useTranslation } from "react-i18next";
import { chooseLanguage } from "../../i18n/apply";
import { HTML_LANG, isLanguage, LANGUAGES } from "../../i18n/languages";
import { useLanguage } from "../../i18n/useLanguage";
import { AccountRow } from "./AccountRow";

export function LanguageSection() {
  const { t } = useTranslation("account");
  const language = useLanguage();
  const selectId = useId();
  const title = t("languageLabel", { ns: "common" });

  return (
    <AccountRow title={title} description={t("language.description")}>
      <label className="visually-hidden" htmlFor={selectId}>
        {title}
      </label>
      <select
        id={selectId}
        className="select account-language"
        name="language"
        value={language}
        onChange={(event) => {
          if (isLanguage(event.target.value)) chooseLanguage(event.target.value);
        }}
      >
        {LANGUAGES.map((option) => (
          <option key={option} value={option} lang={HTML_LANG[option]}>
            {t(`languages.${option}`, { ns: "common", lng: option })}
          </option>
        ))}
      </select>
    </AccountRow>
  );
}
