import { Link } from "react-router-dom";
import {
  LEGAL_ENTITY_NAME,
  PRODUCT_NAME,
  SUPPORT_EMAIL,
} from "../../util/company";
import { Logo } from "../../components/Logo/Logo";
import { ProviderDetails } from "../../components/ProviderDetails/ProviderDetails";
import { BILLING_ENABLED } from "../flags";
import { DataFiscal } from "./DataFiscal";
import "./Footer.css";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p className="footer-tagline">
            Agentes de IA que venden por vos, en todos tus canales.
          </p>
          <p className="footer-legal-entity">
            {PRODUCT_NAME} es una marca de {LEGAL_ENTITY_NAME}.
          </p>
        </div>

        <nav className="footer-column" aria-label="Producto">
          <h2 className="footer-heading">Producto</h2>
          <a href="#demo" className="footer-link">
            Demo
          </a>
          <a href="#como-funciona" className="footer-link">
            Cómo funciona
          </a>
          <a href="#agente" className="footer-link">
            El agente
          </a>
          {BILLING_ENABLED && (
            <a href="#planes" className="footer-link">
              Planes
            </a>
          )}
          <a href="#faq" className="footer-link">
            Preguntas frecuentes
          </a>
          <Link to="/login" className="footer-link">
            Iniciar sesión
          </Link>
        </nav>

        <nav className="footer-column" aria-label="Legal">
          <h2 className="footer-heading">Legal</h2>
          <Link to="/privacy-policy" className="footer-link">
            Política de privacidad
          </Link>
          <Link to="/terms-of-service" className="footer-link">
            Términos de servicio
          </Link>
          <Link to="/data-deletion" className="footer-link">
            Eliminación de datos
          </Link>
        </nav>

        <div className="footer-column">
          <h2 className="footer-heading">Contacto</h2>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="footer-link">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      <section className="footer-provider" aria-labelledby="footer-provider-heading">
        <div className="footer-provider-body">
          <h2 className="footer-heading" id="footer-provider-heading">
            Datos del proveedor
          </h2>
          <ProviderDetails className="footer-provider-details" />
        </div>
        <DataFiscal />
      </section>

      <div className="footer-bottom">
        <p>
          © {year} {LEGAL_ENTITY_NAME}. Todos los derechos reservados.
        </p>
        <p>
          Las marcas y logotipos de terceros pertenecen a sus respectivos
          dueños.
        </p>
      </div>

      <p className="footer-wordmark" aria-hidden="true">
        <strong>BOX</strong>LEAD
      </p>
    </footer>
  );
}
