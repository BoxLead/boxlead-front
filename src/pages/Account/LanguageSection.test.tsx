import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { i18n } from "../../i18n";
import { LANGUAGE_KEY } from "../../i18n/preference";
import { LanguageSection } from "./LanguageSection";

describe("language setting", () => {
  it("shows the current language and each name in its own language", () => {
    render(<LanguageSection />);
    const select = screen.getByRole("combobox", { name: "Idioma" });
    expect(select).toHaveValue("es");
    expect(screen.getByRole("option", { name: "Español" })).toHaveAttribute("lang", "es-AR");
    expect(screen.getByRole("option", { name: "English" })).toHaveAttribute("lang", "en");
  });

  it("switches to English, stores the choice and applies it", async () => {
    render(<LanguageSection />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Idioma" }), "en");
    expect(await screen.findByRole("combobox", { name: "Language" })).toHaveValue("en");
    expect(i18n.language).toBe("en");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByText("Choose the language you see BoxLead in.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
  });

  it("goes back to Spanish", async () => {
    await i18n.changeLanguage("en");
    render(<LanguageSection />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Language" }), "es");
    expect(await screen.findByRole("combobox", { name: "Idioma" })).toHaveValue("es");
    expect(i18n.language).toBe("es");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe("es");
    expect(document.documentElement.lang).toBe("es-AR");
    expect(screen.getByText("Elegí en qué idioma ves BoxLead.")).toBeInTheDocument();
  });
});
