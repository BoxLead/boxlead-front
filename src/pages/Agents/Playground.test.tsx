import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Playground } from "./Playground";

describe("Playground", () => {
  it("offers a comment trial only on a channel that replies to comments", async () => {
    render(<Playground agentName="Ventas" target={{ agentId: "a-1" }} categories={[]} />);

    expect(screen.queryByRole("switch", { name: "Probar como comentario" })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Canal"), "INSTAGRAM");
    expect(screen.getByRole("switch", { name: "Probar como comentario" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Canal"), "MELI");
    expect(screen.queryByRole("switch", { name: "Probar como comentario" })).not.toBeInTheDocument();
  });
});
