import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PlaygroundResult } from "../../api/types";
import { PlaygroundResultView } from "./PlaygroundResultView";

const result = (patch: Partial<PlaygroundResult> = {}): PlaygroundResult => ({
  decision: "REPLY",
  reason: null,
  replyMode: "AUTO",
  channelRules: {
    channelName: "WhatsApp",
    maxLength: 2000,
    audience: "PRIVATE",
    singleReply: false,
    contactDetailsAllowed: true,
    guidelines: ["Respondé en el idioma del cliente."],
  },
  violations: [],
  ...patch,
});

describe("PlaygroundResultView", () => {
  it("says the agent would reply and which mode would apply", () => {
    render(<PlaygroundResultView result={result()} saved />);
    expect(screen.getByText("El agente respondería")).toBeInTheDocument();
    expect(screen.getByText("En producción respondería en modo automático.")).toBeInTheDocument();
  });

  it("says the agent would hand off, with the reason", () => {
    render(
      <PlaygroundResultView
        result={result({ decision: "HANDOFF", reason: "Pidió una persona", replyMode: "DRAFT" })}
        saved
      />,
    );
    expect(screen.getByText("El agente derivaría a una persona")).toBeInTheDocument();
    expect(screen.getByText("Motivo: Pidió una persona")).toBeInTheDocument();
  });

  it("says when this agent would not answer that combination", () => {
    render(<PlaygroundResultView result={result({ replyMode: null })} saved />);
    expect(screen.getByText("Este agente no respondería esta combinación en producción.")).toBeInTheDocument();
  });

  it("does not guess a mode for an unsaved agent", () => {
    render(<PlaygroundResultView result={result({ replyMode: null })} saved={false} />);
    expect(screen.getByText("Guardá el agente para ver el modo que aplicaría.")).toBeInTheDocument();
  });

  it("lists the channel rules on demand", async () => {
    render(<PlaygroundResultView result={result()} saved />);
    await userEvent.click(screen.getByText("Reglas del canal que aplicó"));
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("2.000 caracteres")).toBeInTheDocument();
    expect(screen.getByText("Respondé en el idioma del cliente.")).toBeInTheDocument();
  });
});
