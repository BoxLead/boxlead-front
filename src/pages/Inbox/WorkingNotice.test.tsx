import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkingNotice } from "./WorkingNotice";

describe("WorkingNotice", () => {
  it("names the agent that is composing", () => {
    render(<WorkingNotice agentName="Ventas" />);
    expect(screen.getByRole("status")).toHaveTextContent("Ventas está respondiendo…");
  });
});
