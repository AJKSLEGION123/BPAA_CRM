import { MANAGER_TONE, managerName, type ManagerId } from "@/lib/demo/config";

/** Letter avatar in the manager's colour; no photos anywhere in the demo. */
export function Avatar({ id, withName = false, size = 28 }: { id: ManagerId; withName?: boolean; size?: number }) {
  const t = MANAGER_TONE[id];
  const name = managerName(id);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="avatar" style={{ background: t.bg, color: t.ink, width: size, height: size }} title={name} aria-hidden={withName}>
        {name[0]}
      </span>
      {withName && <span>{name}</span>}
    </span>
  );
}
