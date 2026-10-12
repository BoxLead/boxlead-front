import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PlaygroundDialog } from "./PlaygroundDialog";

describe("PlaygroundDialog", () => {
  it("offers a comment trial only on a channel that replies to comments", async () => {
    render(
      <PlaygroundDialog
        open
        agentName="Ventas"
        target={{ agentId: "a-1" }}
        categories={[]}
        onClose={() => undefined}
      />,
    );

    expect(screen.queryByRole("switch", { name: "Probar como comentario", hidden: true })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Canal"), "INSTAGRAM");
    expect(screen.getByRole("switch", { name: "Probar como comentario", hidden: true })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Canal"), "MELI");
    expect(screen.queryByRole("switch", { name: "Probar como comentario", hidden: true })).not.toBeInTheDocument();
  });
});
