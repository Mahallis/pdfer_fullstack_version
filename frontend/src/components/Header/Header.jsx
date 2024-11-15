import "./Header.css";
import logo from "./logo.svg";
import light from "./light.svg";
import dark from "./dark.svg";

import { useState } from "react";

export default function Header() {
  const [theme, setTheme] = useState("light");
  const [isThemePressed, setIsThemePressed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-bs-theme", newTheme);
    setTheme(newTheme);
  };

  const handleAnimationEnd = () => {
    setIsAnimating(false);
  };

  const handleThemeClick = () => {
    setIsThemePressed(!isThemePressed);
    setIsAnimating(true);
    toggleTheme();
  };

  return (
    <header className="row">
      <div className="col text-bg-primary py-3">
        <div className="d-flex container">
          <div className="col align-items-center">
            <a className="text-reset text-decoration-none" href="/">
              <div className="container d-flex align-items-center">
                <img src={logo} alt="Logo" />
                <h1 className="mb-0">PDFer</h1>
              </div>
            </a>
          </div>
          <div className="col d-flex align-items-center justify-content-end">
            <div onClick={handleThemeClick} style={{ cursor: "pointer" }}>
              <img
                className={
                  isAnimating
                    ? isThemePressed
                      ? "themeActived"
                      : "themeDisabled"
                    : ""
                }
                onAnimationEnd={handleAnimationEnd}
                src={theme === "light" ? light : dark}
                alt={theme + "_theme"}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
