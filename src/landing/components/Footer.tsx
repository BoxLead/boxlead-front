import { Link } from "react-router-dom";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME } from "../../util/company";
import "./Footer.css";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="footer-divider" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <span className="footer-logo-icon">⚡</span>
            {PRODUCT_NAME}
          </div>
          <p className="footer-legal-entity">
            {PRODUCT_NAME} es una marca de {LEGAL_ENTITY_NAME}.
          </p>
          <p className="footer-copyright">
            © {year} {LEGAL_ENTITY_NAME}. Todos los derechos reservados.
          </p>
        </div>
        <nav className="footer-links">
          <Link to="/privacy-policy" className="footer-link">
            Política de privacidad
          </Link>
          <Link to="/terms-of-service" className="footer-link">
            Términos de servicio
          </Link>
          <Link to="/data-deletion" className="footer-link">
            Eliminación de datos
          </Link>
          <Link to="/login" className="footer-link">
            Iniciar sesión
          </Link>
        </nav>
      </div>
    </footer>
  );
}
