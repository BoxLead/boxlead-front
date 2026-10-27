import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InvitationLinkDialog } from "./InvitationLinkDialog";

const LINK = "http://localhost:5173/invitacion#tok-123";

function dialog(): HTMLElement {
  const element = screen.getByRole("heading", { name: "Invitación creada", hidden: true }).closest("dialog");
  if (!element) throw new Error("No dialog");
  return element;
}

describe("InvitationLinkDialog", () => {
  it("only closes with Listo, never with Escape or a click outside", async () => {
    const onClose = vi.fn();
    render(<InvitationLinkDialog link={LINK} onClose={onClose} />);
    expect(screen.getByLabelText("Link de la invitación")).toHaveValue(LINK);
    fireEvent(dialog(), new Event("cancel", { cancelable: true }));
    fireEvent.pointerDown(dialog());
    fireEvent.click(dialog());
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Listo", hidden: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
