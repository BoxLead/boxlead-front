import { describe, expect, it } from "vitest";
import { isoDuration } from "../landing/demoVideo";
import { LANDING_FAQS } from "../landing/faq";
import { serializeJsonLd } from "./jsonLd";
import { PUBLIC_PAGES } from "./pages";
import { breadcrumbs, demoVideo, faqPage, organization, softwareApplication } from "./structuredData";

describe("structured data", () => {
  it("turns the demo label into an ISO duration", () => {
    expect(isoDuration("2:27")).toBe("PT2M27S");
    expect(isoDuration("0:45")).toBe("PT0M45S");
  });

  it("describes the video from the landing constants", () => {
    const video = demoVideo();
    expect(video).toMatchObject({
      "@type": "VideoObject",
      duration: "PT2M27S",
      contentUrl: "https://boxlead.app/demo/boxlead-demo.mp4",
      thumbnailUrl: ["https://boxlead.app/demo/boxlead-demo-poster.jpg"],
    });
  });

  it("flattens the FAQ answers into plain text", () => {
    const faq = faqPage(LANDING_FAQS);
    const questions = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(questions[1].acceptedAnswer.text).toContain("Mirá la Política de privacidad o pedí la eliminación de tus datos");
    expect(questions).toHaveLength(LANDING_FAQS.length);
  });

  it("never declares prices on the application", () => {
    expect(JSON.stringify(softwareApplication())).not.toMatch(/offers|price/i);
    expect(organization()).toMatchObject({ legalName: "Catvin SRL" });
  });

  it("escapes closing tags when serialized", () => {
    const json = serializeJsonLd([breadcrumbs([{ name: "</script>", path: "/" }])]);
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json)["@context"]).toBe("https://schema.org");
  });

  it("gives every indexable page a valid graph", () => {
    for (const page of PUBLIC_PAGES.filter((candidate) => candidate.index)) {
      const graph = page.jsonLd?.() ?? [];
      expect(graph.length, page.path).toBeGreaterThan(0);
      for (const node of graph) expect(node["@type"], page.path).toBeTypeOf("string");
    }
  });
});
