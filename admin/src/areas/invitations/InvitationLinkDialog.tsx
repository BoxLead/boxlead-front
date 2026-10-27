import { useId, useState } from "react";
import { Banner } from "../../../../src/components/ui/Banner";
import { Dialog } from "../../../../src/components/ui/Dialog";

type InvitationLinkDialogProps = {
  link: string | null;
  onClose: () => void;
};

type Copy = "idle" | "copied" | "failed";

function LinkBody({ link, onClose }: { link: string; onClose: () => void }) {
  const [copy, setCopy] = useState<Copy>("idle");
  const fieldId = useId();
  const noteId = useId();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <div className="dialog-form">
      <Banner tone="warning" title="Este link no se vuelve a ver">
        Copialo ahora y mandáselo a la persona. BoxLead no lo guarda y al cerrar esta ventana se pierde.
      </Banner>
      <div className="field">
        <label className="field-label" htmlFor={fieldId}>
          Link de la invitación
        </label>
        <input
          id={fieldId}
          className="input invitation-link"
          type="text"
          readOnly
          autoComplete="off"
          spellCheck={false}
          value={link}
          aria-describedby={noteId}
          onFocus={(event) => event.currentTarget.select()}
        />
        <span id={noteId} className={copy === "failed" ? "field-error" : "field-help"} role={copy === "idle" ? undefined : "status"}>
          {copy === "copied"
            ? "Copiaste el link."
            : copy === "failed"
              ? "No pudimos copiarlo. Seleccionalo y copialo a mano."
              : "Sirve una sola vez y solo para ese email."}
        </span>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Listo
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void copyLink()}>
          {copy === "copied" ? "Copiado" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}

export function InvitationLinkDialog({ link, onClose }: InvitationLinkDialogProps) {
  return (
    <Dialog open={link !== null} title="Invitación creada" size="md" onClose={onClose}>
      {link ? <LinkBody key={link} link={link} onClose={onClose} /> : null}
    </Dialog>
  );
}
