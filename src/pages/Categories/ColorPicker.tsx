import type { CategoryColor } from "../../api/types";
import { CATEGORY_COLORS, colorClass, colorLabel } from "../../util/categories";

type ColorPickerProps = {
  value: CategoryColor;
  onChange: (color: CategoryColor) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <fieldset className="color-picker">
      <legend className="field-label">Color</legend>
      <div className="color-picker-options">
        {CATEGORY_COLORS.map((color) => (
          <label key={color} className={`color-picker-option ${colorClass(color)}`} title={colorLabel(color)}>
            <input
              type="radio"
              name="category-color"
              value={color}
              checked={value === color}
              onChange={() => onChange(color)}
            />
            <span className="color-picker-swatch" aria-hidden="true" />
            <span className="visually-hidden">{colorLabel(color)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
