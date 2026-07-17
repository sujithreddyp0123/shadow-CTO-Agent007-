import { findTeam } from "./store.js";

export function inviteMember(store, teamId, email) {
  findTeam(store, teamId);

  const invite = {
    id: `inv_${store.invites.length + 1}`,
    teamId,
    email,
    status: "pending",
  };

  store.invites.push(invite);
  return invite;
}
