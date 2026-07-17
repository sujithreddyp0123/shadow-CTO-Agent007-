export function createDemoStore() {
  return {
    teams: [
      { id: "team_starter", name: "Starter Co", seatLimit: 3 },
      { id: "team_legacy", name: "Legacy Unlimited", seatLimit: null },
    ],
    members: [
      { id: "mem_1", teamId: "team_starter", email: "ana@example.com" },
      { id: "mem_2", teamId: "team_starter", email: "bo@example.com" },
      { id: "mem_3", teamId: "team_legacy", email: "legacy@example.com" },
    ],
    invites: [
      { id: "inv_1", teamId: "team_starter", email: "pending@example.com", status: "pending" },
    ],
  };
}

export function findTeam(store, teamId) {
  const team = store.teams.find((item) => item.id === teamId);
  if (!team) {
    throw new Error(`Unknown team: ${teamId}`);
  }
  return team;
}
