import { useState } from "react";
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
  const [creating, setCreating] = useState(false);

  const tabs = (
    <ChoiceGroup
      label="Qué mirar"
      variant="segmented"
      choices={VIEWS}
      value={view}
      onChange={(next) => {
        setCreating(false);
        setParams(next === "demos" ? { [VIEW_PARAM]: next } : {});
      }}
    />
  );

  const action = canAct ? (
    <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
      {view === "demos" ? "Otorgar Demo" : "Nueva invitación"}
    </button>
  ) : null;

  return (
    <Screen title={item.label} description={item.description} actions={action}>
      {view === "demos" ? (
        <DemoList key="demos" tabs={tabs} canAct={canAct} creating={creating} onCloseCreate={() => setCreating(false)} />
      ) : (
        <InvitationList
          key="invitations"
          tabs={tabs}
          canAct={canAct}
          resellers={resellers}
          creating={creating}
          onCloseCreate={() => setCreating(false)}
        />
      )}
    </Screen>
  );
}
