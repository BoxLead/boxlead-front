import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MessageTemplate } from "../../api/types";
import { clearQueryCache, setQueryFetcher } from "../../data/queryCache";
import { TemplateDialog } from "./TemplateDialog";
import { templatesKey } from "./templates";

const templates: MessageTemplate[] = [
  { id: "t-1", name: "order_update", language: "es_AR", body: "Hola {{1}}, tu pedido {{2}} salió", parameterCount: 2 },
  { id: "t-2", name: "welcome_back", language: "es_AR", body: "Hola de nuevo", parameterCount: 0 },
];

const fetcher = vi.fn<(key: string) => Promise<unknown>>();
const hidden = { hidden: true } as const;

function renderDialog(onSend = vi.fn().mockResolvedValue(true), onClose = vi.fn(), error: string | null = null) {
  render(
    <TemplateDialog open conversationId="c-1" contactName="Martín" error={error} onClose={onClose} onSend={onSend} />,
  );
  return { onSend, onClose };
}

beforeEach(() => {
  clearQueryCache();
  fetcher.mockReset();
  setQueryFetcher(fetcher);
});

afterEach(() => {
  setQueryFetcher(null);
});

describe("TemplateDialog", () => {
  it("lists the templates with readable names", async () => {
    fetcher.mockResolvedValue(templates);
    renderDialog();

    expect(await screen.findByRole("button", { name: /order update/i, ...hidden })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /welcome back/i, ...hidden })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith(templatesKey("c-1"));
  });

  it("asks for each value, shows what the person will read and sends them trimmed", async () => {
    fetcher.mockResolvedValue(templates);
    const { onSend, onClose } = renderDialog();

    await userEvent.click(await screen.findByRole("button", { name: /order update/i, ...hidden }));
    const send = screen.getByRole("button", { name: "Enviar plantilla", ...hidden });
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Valor 1", { selector: "input" }), " Ana ");
    expect(screen.getByText("Hola Ana, tu pedido {{2}} salió")).toBeInTheDocument();
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Valor 2", { selector: "input" }), "#123");
    expect(screen.getByText("Hola Ana, tu pedido #123 salió")).toBeInTheDocument();
    await userEvent.click(send);

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("t-1", ["Ana", "#123"]));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("sends a template without values straight away", async () => {
    fetcher.mockResolvedValue(templates);
    const { onSend } = renderDialog();

    await userEvent.click(await screen.findByRole("button", { name: /welcome back/i, ...hidden }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar plantilla", ...hidden }));

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("t-2", []));
  });

  it("stays open when the send fails", async () => {
    fetcher.mockResolvedValue(templates);
    const { onSend, onClose } = renderDialog(vi.fn().mockResolvedValue(false));

    await userEvent.click(await screen.findByRole("button", { name: /welcome back/i, ...hidden }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar plantilla", ...hidden }));

    await waitFor(() => expect(onSend).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows why a template was refused next to its values", async () => {
    fetcher.mockResolvedValue(templates);
    renderDialog(vi.fn().mockResolvedValue(false), vi.fn(), "Number of parameters does not match");

    await userEvent.click(await screen.findByRole("button", { name: /welcome back/i, ...hidden }));

    expect(screen.getByRole("alert", hidden)).toHaveTextContent("Number of parameters does not match");
  });

  it("goes back to the list", async () => {
    fetcher.mockResolvedValue(templates);
    renderDialog();

    await userEvent.click(await screen.findByRole("button", { name: /order update/i, ...hidden }));
    await userEvent.click(screen.getByRole("button", { name: "Volver", ...hidden }));

    expect(screen.getByRole("button", { name: /welcome back/i, ...hidden })).toBeInTheDocument();
  });

  it("explains where templates come from when there are none", async () => {
    fetcher.mockResolvedValue([]);
    renderDialog();

    expect(await screen.findByText(/administrador de WhatsApp de Meta/)).toBeInTheDocument();
  });

  it("offers to retry when the templates cannot be loaded", async () => {
    fetcher.mockRejectedValueOnce(new Error("boom"));
    renderDialog();

    expect(await screen.findByText("No pudimos cargar las plantillas")).toBeInTheDocument();
    fetcher.mockResolvedValue(templates);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar", ...hidden }));

    expect(await screen.findByRole("button", { name: /order update/i, ...hidden })).toBeInTheDocument();
  });
});
