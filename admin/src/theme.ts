const THEME_COLOR = { light: "#f4f3ec", dark: "#0a1521" } as const;

function apply(light: boolean): void {
  const theme = light ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

export function followSystemTheme(): void {
  const query = window.matchMedia("(prefers-color-scheme: light)");
  apply(query.matches);
  query.addEventListener("change", (event) => apply(event.matches));
}
