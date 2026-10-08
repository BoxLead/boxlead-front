import { Link } from "react-router-dom";
import type { CategoryResponse } from "../../api/types";
import { colorClass, leadCountLabel } from "../../util/categories";

type CategoryCardProps = {
  category: CategoryResponse;
  onEdit: () => void;
  onDelete: () => void;
};

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const headingId = `category-${category.id}`;
  return (
    <li className={`panel category-card ${colorClass(category.color)}`} aria-labelledby={headingId}>
      <div className="category-card-head">
        <span className="category-card-dot" aria-hidden="true" />
        <h2 id={headingId} className="category-card-name">
          {category.name}
        </h2>
      </div>
      <p className={`category-card-description${category.description ? "" : " category-card-description-empty"}`}>
        {category.description ?? "Sin descripción"}
      </p>
      <div className="category-card-foot">
        <Link to={`/app/leads?category=${category.id}&buyers=1`} className="category-card-count">
          {leadCountLabel(category.leadCount)}
        </Link>
        <div className="category-card-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit} aria-label={`Editar ${category.name}`}>
            Editar
          </button>
          <button type="button" className="btn btn-danger btn-sm" onClick={onDelete} aria-label={`Eliminar ${category.name}`}>
            Eliminar
          </button>
        </div>
      </div>
    </li>
  );
}
