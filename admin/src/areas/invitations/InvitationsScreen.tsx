import { useSearchParams } from "react-router-dom";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { Screen } from "../../components/Screen";
import { navItem } from "../../nav";
import { canAccess } from "../../session/roles";
import { useAdmin } from "../../session/session";
import { DemoList } from "./DemoList";
import { InvitationList } from "./InvitationList";
import { useResellers } from "./useResellers";
import "./Invitations.css";

type View = "invitaciones" | "demos";

const VIEW_PARAM = "vista";

const VIEWS = [
  { value: "invitaciones" as const, label: "Invitaciones" },
  { value: "demos" as const, label: "Demos" },
];

export function InvitationsScreen() {
  const item = navItem("invitations");
  const me = useAdmin();
  const canAct = canAccess(me.roles, ["SUPPORT"]);
  const resellers = useResellers();
  const [params, setParams] = useSearchParams();
  const view: View = params.get(VIEW_PARAM) === "demos" ? "demos" : "invitaciones";

  const tabs = (
    <ChoiceGroup
      label="Qué mirar"
      variant="segmented"
      choices={VIEWS}
      value={view}
      onChange={(next) => setParams(next === "demos" ? { [VIEW_PARAM]: next } : {})}
    />
  );

  return (
    <Screen title={item.label} description={item.description}>
      {view === "demos" ? (
        <DemoList key="demos" tabs={tabs} canAct={canAct} />
      ) : (
        <InvitationList key="invitations" tabs={tabs} canAct={canAct} resellers={resellers} />
      )}
    </Screen>
  );
}
