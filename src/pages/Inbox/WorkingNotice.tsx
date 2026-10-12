import { workingAgentLabel } from "../../util/agents";
import "./WorkingNotice.css";

type WorkingNoticeProps = {
  agentName: string;
};

export function WorkingNotice({ agentName }: WorkingNoticeProps) {
  return (
    <p className="conversation-working" role="status">
      <span className="conversation-working-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {workingAgentLabel(agentName)}…
    </p>
  );
}
