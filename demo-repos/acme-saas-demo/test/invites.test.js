import assert from "node:assert/strict";
import test from "node:test";
import { inviteMember } from "../src/invites.js";
import { createDemoStore } from "../src/store.js";

test("creates an invite while the team is under its seat limit", () => {
  const store = createDemoStore();

  const invite = inviteMember(store, "team_starter", "new@example.com");

  assert.equal(invite.email, "new@example.com");
  assert.equal(store.invites.length, 2);
});

test("legacy teams without a seat limit can continue inviting members", () => {
  const store = createDemoStore();

  const invite = inviteMember(store, "team_legacy", "new@example.com");

  assert.equal(invite.teamId, "team_legacy");
});
