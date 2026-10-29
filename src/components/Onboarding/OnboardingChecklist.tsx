import { Link } from "react-router-dom";
import type { AccountConnectionResponse, AgentResponse, OnboardingResponse } from "../../api/types";
import { useAuth } from "../../context/auth";
import { AGENTS_KEY } from "../../data/agents";
import { needsAgents, ONBOARDING_KEY, onboardingSteps } from "../../data/onboarding";
import { useApiQuery } from "../../hooks/useApiQuery";
import { CONNECTIONS_KEY } from "../../hooks/useConnectPlatform";
import { cx } from "../../util/classNames";
import { ArrowRightIcon, CheckIcon } from "../icons/UiIcons";
import "./OnboardingChecklist.css";

export function OnboardingChecklist() {
  const { features } = useAuth();
  const enabled = features.onboarding;
  const connections = useApiQuery<AccountConnectionResponse[]>(enabled ? CONNECTIONS_KEY : null);
  const status = useApiQuery<OnboardingResponse>(enabled ? ONBOARDING_KEY : null);
  const agents = useApiQuery<AgentResponse[]>(enabled && needsAgents(status.data) ? AGENTS_KEY : null);

  if (!enabled) return null;
  const steps = onboardingSteps({ connections: connections.data, status: status.data, agents: agents.data });
  if (!steps) return null;
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;
  const next = steps.find((step) => !step.done);

  return (
    <section className="onboarding" aria-labelledby="onboarding-title">
      <div className="onboarding-head">
        <h2 id="onboarding-title" className="onboarding-title">
          Primeros pasos
        </h2>
        <p className="onboarding-count">
          {done} de {steps.length}
        </p>
        <div
          className="onboarding-bar"
          role="progressbar"
          aria-label="Primeros pasos hechos"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={done}
          aria-valuetext={`${done} de ${steps.length}`}
          data-done={done}
        >
          <span className="onboarding-bar-fill" />
        </div>
      </div>
      <ol className="onboarding-steps">
        {steps.map((step, index) => (
          <li key={step.id} className={cx("onboarding-step", step.done && "is-done", step === next && "is-next")}>
            <span className="onboarding-marker" aria-hidden="true">
              {step.done ? <CheckIcon /> : index + 1}
            </span>
            <div className="onboarding-step-body">
              <p className="onboarding-step-title" id={`onboarding-${step.id}`}>
                {step.title}
                {step.done ? <span className="visually-hidden"> (hecho)</span> : null}
              </p>
              {step === next ? <p className="onboarding-step-text">{step.text}</p> : null}
            </div>
            {step.done ? null : (
              <Link
                to={step.to}
                className={cx("btn btn-sm onboarding-step-link", step === next ? "btn-primary" : "btn-secondary")}
                aria-describedby={`onboarding-${step.id}`}
              >
                {step.action}
                <ArrowRightIcon />
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
