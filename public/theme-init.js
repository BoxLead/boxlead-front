(function () {
  var theme = "dark";
  var sidebar = "expanded";
  try {
    var storedTheme = localStorage.getItem("boxlead.theme");
    if (storedTheme === "light" || storedTheme === "dark") theme = storedTheme;
    else if (window.matchMedia("(prefers-color-scheme: light)").matches) theme = "light";
    if (localStorage.getItem("boxlead.sidebar") === "collapsed") sidebar = "collapsed";
  } catch (error) {
    theme = "dark";
    sidebar = "expanded";
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.sidebar = sidebar;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f4f3ec" : "#0a1521");
})();
