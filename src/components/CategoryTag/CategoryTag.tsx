import type { CategoryResponse } from "../../api/types";
import { colorClass } from "../../util/categories";
import "./CategoryTag.css";

type CategoryTagProps = {
  category: Pick<CategoryResponse, "name" | "color">;
};

export function CategoryTag({ category }: CategoryTagProps) {
  return <span className={`category-tag ${colorClass(category.color)}`}>{category.name}</span>;
}
