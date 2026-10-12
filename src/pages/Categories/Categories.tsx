import { useState } from "react";
import { ApiError } from "../../api/client";
import type { CategoryResponse } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { TagIcon } from "../../components/icons/UiIcons";
import { Banner } from "../../components/ui/Banner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/toast";
import { CATEGORIES_KEY, deleteCategory } from "../../data/categories";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { categoryErrorMessage, leadCountLabel, nextColor } from "../../util/categories";
import { CategoryCard } from "./CategoryCard";
import { CategoryDialog } from "./CategoryDialog";
import "./Categories.css";

const MAX_CATEGORIES = 30;

type Editing = { category: CategoryResponse | null; key: number };

export function Categories() {
  useDocumentTitle("Categorías");

  const toast = useToast();
  const categories = useApiQuery<CategoryResponse[]>(CATEGORIES_KEY);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [opened, setOpened] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<CategoryResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const list = categories.data ?? [];
  const atLimit = list.length >= MAX_CATEGORIES;

  function openEditor(category: CategoryResponse | null) {
    setOpened((count) => count + 1);
    setEditing({ category, key: opened + 1 });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(pendingDelete.id);
      toast({ tone: "info", message: `Eliminaste ${pendingDelete.name}.` });
      setPendingDelete(null);
    } catch (error) {
      toast({
        tone: "danger",
        message: error instanceof ApiError ? categoryErrorMessage(error.message) : "No pudimos eliminar la categoría.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const createButton = (
    <button type="button" className="btn btn-primary" onClick={() => openEditor(null)} disabled={atLimit || !categories.data}>
      Nueva categoría
    </button>
  );

  return (
    <div className="page categories-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-header-desc">
            Agrupá tus leads según lo que necesitan. Cada lead puede estar en una categoría.
          </p>
        </div>
        {list.length > 0 ? createButton : null}
      </header>

      {atLimit ? (
        <Banner tone="info" className="categories-banner" title="Llegaste al máximo de categorías">
          Podés tener hasta {MAX_CATEGORIES}. Eliminá una para crear otra.
        </Banner>
      ) : null}

      {categories.error && !categories.data ? (
        <Banner
          tone="danger"
          title="No pudimos cargar las categorías"
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void categories.reload()}>
              Reintentar
            </button>
          }
        >
          {categories.error}
        </Banner>
      ) : categories.loading ? (
        <div className="category-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton category-skeleton" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="panel categories-empty">
          <EmptyState
            icon={<TagIcon />}
            title="Creá tu primera categoría"
            hint="Las categorías te ayudan a agrupar a tus leads según lo que necesitan."
            action={createButton}
          />
        </div>
      ) : (
        <ul className="category-grid" aria-label="Categorías">
          {list.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={() => openEditor(category)}
              onDelete={() => setPendingDelete(category)}
            />
          ))}
        </ul>
      )}

      {editing ? (
        <CategoryDialog
          key={editing.key}
          open
          category={editing.category}
          defaultColor={nextColor(list)}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            setEditing(null);
            toast({ message: created ? `Creaste ${saved.name}.` : `Guardaste ${saved.name}.` });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`¿Eliminar ${pendingDelete?.name ?? "la categoría"}?`}
        confirmLabel={deleting ? "Eliminando…" : "Eliminar"}
        tone="danger"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      >
        <p>
          {!pendingDelete || pendingDelete.leadCount === 0
            ? "No tiene leads asignados."
            : pendingDelete.leadCount === 1
              ? "El lead asignado queda sin categoría."
              : `Sus ${leadCountLabel(pendingDelete.leadCount)} quedan sin categoría.`}
        </p>
      </ConfirmDialog>
    </div>
  );
}
