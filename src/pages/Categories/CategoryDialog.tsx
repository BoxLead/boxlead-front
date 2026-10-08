import { useId, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import type { CategoryColor, CategoryResponse } from "../../api/types";
import { CharCounter } from "../../components/ui/CharCounter";
import { Dialog } from "../../components/ui/Dialog";
import { createCategory, updateCategory } from "../../data/categories";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  categoryErrorMessage,
} from "../../util/categories";
import { ColorPicker } from "./ColorPicker";

type CategoryDialogProps = {
  open: boolean;
  category: CategoryResponse | null;
  defaultColor: CategoryColor;
  onClose: () => void;
  onSaved: (category: CategoryResponse, created: boolean) => void;
};

export function CategoryDialog({ open, category, defaultColor, onClose, onSaved }: CategoryDialogProps) {
  const nameCounterId = useId();
  const descriptionCounterId = useId();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [color, setColor] = useState<CategoryColor>(category?.color ?? defaultColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const invalid =
    trimmed.length === 0 || name.length > CATEGORY_NAME_MAX || description.length > CATEGORY_DESCRIPTION_MAX;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const body = { name: trimmed, description: description.trim(), color };
      const saved = category ? await updateCategory(category.id, body) : await createCategory(body);
      onSaved(saved, category === null);
    } catch (e) {
      setError(e instanceof ApiError ? categoryErrorMessage(e.message) : "No pudimos guardar la categoría. Probá de nuevo.");
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      title={category ? "Editar categoría" : "Nueva categoría"}
      busy={saving}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={(event) => void submit(event)} noValidate>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="input"
            name="name"
            value={name}
            autoComplete="off"
            required
            aria-invalid={name.length > CATEGORY_NAME_MAX || undefined}
            aria-describedby={nameCounterId}
            onChange={(event) => setName(event.target.value)}
          />
          <CharCounter id={nameCounterId} length={name.length} max={CATEGORY_NAME_MAX} />
        </label>
        <label className="field">
          <span className="field-label">Descripción</span>
          <textarea
            className="input category-textarea"
            name="description"
            rows={3}
            value={description}
            placeholder="Qué tipo de leads entran en esta categoría"
            aria-invalid={description.length > CATEGORY_DESCRIPTION_MAX || undefined}
            aria-describedby={descriptionCounterId}
            onChange={(event) => setDescription(event.target.value)}
          />
          <CharCounter id={descriptionCounterId} length={description.length} max={CATEGORY_DESCRIPTION_MAX} />
        </label>
        <ColorPicker value={color} onChange={setColor} />
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={invalid || saving}>
            {saving ? "Guardando…" : category ? "Guardar cambios" : "Crear categoría"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
