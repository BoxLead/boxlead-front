import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
  InstagramIcon,
  MercadoLibreMark,
  WhatsAppIcon,
} from "../../components/icons/PlatformIcons";
import { CheckIcon } from "../../components/icons/UiIcons";
import { LogoMark } from "../../components/Logo/Logo";
import "./AgentDemo.css";

type SceneChannel = { channel: string; icon: ReactNode };

const SCENE_CHANNELS: SceneChannel[] = [
  { channel: "WhatsApp", icon: <WhatsAppIcon width={18} height={18} /> },
  { channel: "Instagram", icon: <InstagramIcon width={18} height={18} /> },
  { channel: "MercadoLibre", icon: <MercadoLibreMark width={18} height={18} /> },
];

const PHASE_DURATIONS = [1100, 1500, 1300, 3200];
const LAST_PHASE = PHASE_DURATIONS.length - 1;

type Step = { scene: number; phase: number };

export function AgentDemo() {
  const { t } = useTranslation("landing");
  const scenes = t("agentDemo.scenes", { returnObjects: true }).map((scene, index) => ({ ...scene, ...SCENE_CHANNELS[index] }));
  const autoplay = !useMediaQuery("(prefers-reduced-motion: reduce)");
  const [played, setStep] = useState<Step>({ scene: 0, phase: 0 });
  const step = autoplay ? played : { scene: played.scene, phase: LAST_PHASE };

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => {
      setStep((current) =>
        current.phase < LAST_PHASE
          ? { scene: current.scene, phase: current.phase + 1 }
          : { scene: (current.scene + 1) % SCENE_CHANNELS.length, phase: 0 },
      );
    }, PHASE_DURATIONS[played.phase]);
    return () => window.clearTimeout(timer);
  }, [autoplay, played]);

  const scene = scenes[step.scene];
  const status = t("agentDemo.status", { returnObjects: true })[step.phase];

  return (
    <div className="agent-demo" aria-label={t("agentDemo.label")}>
      <div className="agent-demo-tabs" role="tablist" aria-label={t("agentDemo.channels")}>
        {scenes.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item.channel}
            aria-selected={index === step.scene}
            aria-label={item.channel}
            className={`agent-demo-tab${index === step.scene ? " is-active" : ""}`}
            onClick={() =>
              setStep({ scene: index, phase: autoplay ? 0 : LAST_PHASE })
            }
          >
            {item.icon}
            <span aria-hidden="true">{item.channel}</span>
          </button>
        ))}
      </div>

      <div className="agent-demo-thread" role="tabpanel" key={step.scene}>
        <div className="agent-demo-meta">
          <span className="agent-demo-contact">{scene.contact}</span>
          <span className="agent-demo-context">{scene.context}</span>
        </div>

        <p className="agent-demo-bubble agent-demo-bubble-in">
          {scene.inbound}
        </p>

        {step.phase === 1 && (
          <div
            className="agent-demo-bubble agent-demo-bubble-out agent-demo-typing"
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        )}

        {step.phase >= 2 && (
          <p className="agent-demo-bubble agent-demo-bubble-out">
            {scene.reply}
          </p>
        )}

        {step.phase >= 3 && (
          <ul className="agent-demo-outcomes">
            {scene.outcomes.map((outcome) => (
              <li className="agent-demo-outcome" key={outcome}>
                <CheckIcon width={14} height={14} />
                {outcome}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="agent-demo-footer">
        <span className="agent-demo-agent">
          <span className="agent-demo-agent-avatar">
            <LogoMark />
          </span>
          {t("agentDemo.agent")}
        </span>
        <span
          className={`agent-demo-status${step.phase >= 2 ? " is-done" : ""}`}
        >
          <span className="agent-demo-status-dot" />
          {status}
        </span>
      </div>
    </div>
  );
}
