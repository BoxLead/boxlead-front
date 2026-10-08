import { useState } from "react";
import { ApiError } from "../../api/client";
import type { CategoryResponse, LeadResponse } from "../../api/types";
import { assignLeadCategory } from "../../data/categories";
import { categoryById, colorClass } from "../../util/categories";
import { leadDisplayName } from "../../util/labels";
import { ChevronDownIcon } from "../icons/UiIcons";
import { useToast } from "../ui/toast";
import "./CategorySelect.css";

type CategorySelectProps = {
  lead: LeadResponse;
  categories: CategoryResponse[];
  size?: "sm" | "md";
};

const NONE = "";

export function CategorySelect({ lead, categories, size = "sm" }: CategorySelectProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const current = categoryById(categories, lead.categoryId);

  async function change(value: string) {
    const categoryId = value === NONE ? null : value;
    if (categoryId === (lead.categoryId ?? null)) return;
    setSaving(true);
    try {
      await assignLeadCategory(lead, categoryId);
      const name = leadDisplayName(lead);
      const target = categoryById(categories, categoryId);
      toast({ message: target ? `${name} pasó a ${target.name}.` : `${name} quedó sin categoría.` });
    } catch (error) {
      toast({
        tone: "danger",
        message: error instanceof ApiError ? error.message : "No pudimos cambiar la categoría. Probá de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <label
      className={`category-select category-select-${size}${current ? ` ${colorClass(current.color)}` : " category-select-empty"}`}
    >
      <span className="visually-hidden">Categoría de {leadDisplayName(lead)}</span>
      <select
        value={current?.id ?? NONE}
        disabled={saving}
        onChange={(event) => void change(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      >
        <option value={NONE}>Sin categoría</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <ChevronDownIcon width={14} height={14} />
    </label>
  );
}
