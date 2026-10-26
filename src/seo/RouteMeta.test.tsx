import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { RouteMeta } from "./RouteMeta";

function AppPage() {
  useDocumentTitle("Bandeja");
  return <h1>Bandeja</h1>;
}

function renderAt(path: string, children?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteMeta />
      {children}
    </MemoryRouter>,
  );
}

function meta(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute("content") ?? document.querySelector(selector)?.getAttribute("content") ?? null;
}

describe("RouteMeta", () => {
  it("describes the landing with its canonical and its social card", () => {
    renderAt("/");
    expect(document.title).toBe("Agentes de IA que automatizan y escalan tus ventas · BoxLead");
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://boxlead.app/");
    expect(meta('meta[property="og:url"]')).toBe("https://boxlead.app/");
    expect(meta('meta[name="twitter:card"]')).toBe("summary_large_image");
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("keeps private pages out of the index and links the legal translations", () => {
    renderAt("/login");
    expect(document.title).toBe("Iniciar sesión · BoxLead");
    expect(meta('meta[name="robots"]')).toBe("noindex");
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it("links both languages of a legal page", () => {
    renderAt("/privacidad");
    const alternates = [...document.querySelectorAll('link[rel="alternate"]')].map(
      (link) => `${link.getAttribute("hreflang")} ${link.getAttribute("href")}`,
    );
    expect(alternates).toEqual([
      "es-AR https://boxlead.app/privacidad",
      "en https://boxlead.app/privacy-policy",
      "x-default https://boxlead.app/privacidad",
    ]);
  });

  it("treats an unknown path as the not found page", () => {
    renderAt("/esto-no-existe");
    expect(document.title).toBe("Página no encontrada · BoxLead");
    expect(meta('meta[name="robots"]')).toBe("noindex");
  });

  it("lets app pages set their own title and keeps them out of the index", () => {
    renderAt("/app/inbox", <AppPage />);
    expect(document.title).toBe("Bandeja · BoxLead");
    expect(meta('meta[name="robots"]')).toBe("noindex");
    expect(document.querySelectorAll("title")).toHaveLength(1);
  });
});
