import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChoiceGroup } from "../../../../src/components/ui/ChoiceGroup";
import { Screen } from "../../components/Screen";
import { navItem } from "../../nav";
import { canAccess } from "../../session/roles";
import { useAdmin } from "../../session/session";
import { DemoList } from "./DemoList";
import type { Hold } from "./hold";
import { InvitationList } from "./InvitationList";
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
  const [params, setParams] = useSearchParams();
  const asked: View = params.get(VIEW_PARAM) === "demos" ? "demos" : "invitaciones";
  const [creating, setCreating] = useState(false);
  const [holds, setHolds] = useState(0);
  const [view, setView] = useState(asked);
  const locked = holds > 0;
  if (!locked && view !== asked) setView(asked);

  const hold = useCallback<Hold>(() => {
    setHolds((count) => count + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setHolds((count) => count - 1);
    };
  }, []);

  const tabs = (
    <ChoiceGroup
      label="Qué mirar"
      variant="segmented"
      choices={VIEWS.map((choice) => ({ ...choice, disabled: locked && choice.value !== view }))}
      value={view}
      onChange={(next) => {
        if (locked) return;
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
        <DemoList key="demos" tabs={tabs} canAct={canAct} creating={creating} hold={hold} onCloseCreate={() => setCreating(false)} />
      ) : (
        <InvitationList key="invitations" tabs={tabs} canAct={canAct} creating={creating} hold={hold} onCloseCreate={() => setCreating(false)} />
      )}
    </Screen>
  );
}
