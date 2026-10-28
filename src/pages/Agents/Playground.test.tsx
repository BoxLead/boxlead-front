import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import * as playground from "../../data/agentPlayground";
import { Playground } from "./Playground";

describe("Playground", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function sendWith(error: ApiError) {
    vi.spyOn(playground, "runPlayground").mockRejectedValue(error);
    render(<Playground agentName="Ventas" target={{ agentId: "a-1" }} categories={[]} />);
    await userEvent.type(screen.getByPlaceholderText("Mensaje del cliente"), "¿Tienen stock?");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
  }

  it("explains in its own words that the plan has no more trials", async () => {
    await sendWith(new ApiError("Llegaste al límite de tu plan.", 402, { error: "Payment Required", message: "Playground cost cap reached", code: "PLAN_LIMIT_REACHED" }));
    expect(
      await screen.findByText("Tu plan no tiene más pruebas disponibles en este período. Para seguir probando, pasate a un plan con más capacidad."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Playground cost cap reached")).not.toBeInTheDocument();
  });

  it("keeps the missing plan message for a 402 without a plan", async () => {
    await sendWith(new ApiError("Necesitás un plan activo para hacer esto.", 402, { code: "PLAN_REQUIRED" }));
    expect(await screen.findByText("Necesitás un plan activo para hacer esto.")).toBeInTheDocument();
  });

  it("offers a comment trial only on a channel that replies to comments", async () => {
    render(<Playground agentName="Ventas" target={{ agentId: "a-1" }} categories={[]} />);

    expect(screen.queryByRole("switch", { name: "Probar como comentario" })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Canal"), "INSTAGRAM");
    expect(screen.getByRole("switch", { name: "Probar como comentario" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Canal"), "MELI");
    expect(screen.queryByRole("switch", { name: "Probar como comentario" })).not.toBeInTheDocument();
  });
});
