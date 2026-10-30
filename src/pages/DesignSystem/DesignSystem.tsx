import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { setTheme, useTheme } from "../../theme/theme";
import { Avatar } from "../../components/ui/Avatar";
import { Banner } from "../../components/ui/Banner";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { Tag } from "../../components/ui/Tag";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import "./DesignSystem.css";

const SPACES = ["0-5", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20"];
const SIZES = ["3xs", "2xs", "xs", "sm", "md", "base", "lg", "xl", "2xl", "3xl", "4xl"];
const RADII = ["2xs", "xs", "sm", "md", "lg", "xl", "pill"];
const SHADOWS = ["1", "2", "3", "4"];
const SURFACES = ["bg", "bg-subtle", "surface", "surface-elevated", "surface-overlay"];
const TEXTS = ["heading", "text", "text-muted", "text-faint", "accent", "success", "warning", "danger"];

export function DesignSystem() {
  useDocumentTitle("Sistema de diseño");
  const theme = useTheme();

  return (
    <div className="page ds">
      <header className="page-header">
        <div>
          <h1 className="page-title">Sistema de diseño</h1>
          <p className="page-header-desc">Tokens y primitivas tal como se ven en el tema actual. Solo en desarrollo.</p>
        </div>
        <ChoiceGroup
          label="Tema"
          variant="segmented"
          value={theme}
          choices={[
            { value: "dark", label: "Oscuro" },
            { value: "light", label: "Claro" },
          ]}
          onChange={setTheme}
        />
      </header>

      <section className="ds-section">
        <h2 className="panel-title">Espaciado</h2>
        <div className="ds-row">
          {SPACES.map((step) => (
            <div key={step} className="ds-space">
              <span className={`ds-space-bar ds-space-${step}`} />
              <span className="ds-caption">{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ds-section">
        <h2 className="panel-title">Tipografía</h2>
        <div className="ds-stack">
          {SIZES.map((size) => (
            <p key={size} className={`ds-type ds-type-${size}`}>
              <span className="ds-caption">{size}</span>
              Escalá tus ventas con un agente que trabaja solo
            </p>
          ))}
        </div>
      </section>

      <section className="ds-section">
        <h2 className="panel-title">Color</h2>
        <div className="ds-row">
          {SURFACES.map((name) => (
            <div key={name} className={`ds-swatch ds-swatch-${name}`}>
              <span className="ds-caption">{name}</span>
            </div>
          ))}
        </div>
        <div className="ds-row">
          {TEXTS.map((name) => (
            <span key={name} className={`ds-text ds-text-${name}`}>
              {name}
            </span>
          ))}
        </div>
      </section>

      <section className="ds-section">
        <h2 className="panel-title">Elevación y radios</h2>
        <div className="ds-row">
          {SHADOWS.map((level) => (
            <div key={level} className={`ds-elevation ds-elevation-${level}`}>
              <span className="ds-caption">shadow-{level}</span>
            </div>
          ))}
        </div>
        <div className="ds-row">
          {RADII.map((radius) => (
            <div key={radius} className={`ds-radius ds-radius-${radius}`}>
              <span className="ds-caption">{radius}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ds-section">
        <h2 className="panel-title">Controles</h2>
        <div className="ds-row">
          <button type="button" className="btn btn-primary">
            Primario
          </button>
          <button type="button" className="btn btn-secondary">
            Secundario
          </button>
          <button type="button" className="btn btn-danger">
            Peligro
          </button>
          <button type="button" className="btn btn-ghost">
            Fantasma
          </button>
          <button type="button" className="btn btn-primary" disabled>
            Deshabilitado
          </button>
          <button type="button" className="btn btn-secondary btn-sm">
            Chico
          </button>
          <button type="button" className="btn btn-primary btn-lg">
            Grande
          </button>
        </div>
        <div className="ds-row">
          <input className="input ds-input" placeholder="Escribí algo" aria-label="Ejemplo" />
          <select className="select ds-input" aria-label="Ejemplo de select">
            <option>Todas las categorías</option>
          </select>
          <input className="input input-sm ds-input" placeholder="Chico" aria-label="Ejemplo chico" />
          <select className="select select-sm ds-input" aria-label="Ejemplo de select chico">
            <option>Chico</option>
          </select>
        </div>
        <div className="ds-row">
          <ChoiceGroup
            unreadLabel={(count) => `, ${count} sin leer`}
            label="Chips"
            value="a"
            choices={[
              { value: "a", label: "Todos" },
              { value: "b", label: "WhatsApp", count: 3 },
              { value: "c", label: "Instagram" },
            ]}
            onChange={() => undefined}
          />
          <ChoiceGroup
            label="Segmentado"
            variant="segmented"
            value="b"
            choices={[
              { value: "a", label: "7 días" },
              { value: "b", label: "30 días" },
              { value: "c", label: "90 días" },
            ]}
            onChange={() => undefined}
          />
        </div>
        <div className="ds-row">
          <Tag>Neutro</Tag>
          <Tag tone="accent">Acento</Tag>
          <Tag tone="success">Éxito</Tag>
          <Tag tone="warning">Aviso</Tag>
          <Tag tone="danger">Error</Tag>
          <Tag tone="meli">Preguntas</Tag>
          <Avatar name="Ana Pérez" size="sm" />
          <Avatar name="Tomás Ríos" platform="WHATSAPP" />
          <Avatar name="Carla M" platform="INSTAGRAM" size="lg" />
        </div>
      </section>

      <section className="ds-section">
        <h2 className="panel-title">Avisos</h2>
        <div className="ds-stack">
          <Banner title="Información">Un aviso neutro con la forma de todos los avisos.</Banner>
          <Banner tone="warning" title="Atención">
            Algo necesita una mirada.
          </Banner>
          <Banner tone="danger" title="Error" action={<button type="button" className="btn btn-secondary btn-sm">Reintentar</button>}>
            Algo salió mal y esto es lo que podés hacer.
          </Banner>
          <Banner tone="success" title="Listo">
            Se guardó.
          </Banner>
        </div>
      </section>

      <section className="ds-section">
        <h2 className="panel-title">Estados vacíos</h2>
        <div className="ds-empties panel">
          <EmptyState illustration="inbox" title="Tu bandeja está vacía" hint="Cuando alguien te escriba aparece acá." />
          <EmptyState illustration="leads" title="Todavía no hay leads" hint="Se crean solos cuando alguien te escribe." />
          <EmptyState illustration="search" title="Nada con estos filtros" />
          <EmptyState illustration="agents" title="Elegí un agente" />
          <EmptyState illustration="categories" title="Creá tu primera categoría" />
          <EmptyState illustration="connections" title="Conectá un canal" />
          <EmptyState illustration="metrics" title="Todavía no hay datos" />
          <EmptyState illustration="missing" title="No encontramos esto" />
        </div>
      </section>
    </div>
  );
}
