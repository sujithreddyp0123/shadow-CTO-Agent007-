# ACME SaaS Demo

This tiny repo is the controlled target for the Shadow CTO vertical slice.

The baseline intentionally has teams, members, invites, and a `seatLimit` field, but `inviteMember` does not enforce seat limits yet. Shadow CTO's runner copies this seed into `work/shadow-demo-repo`, asks an implementation agent to make the requested change, then captures the resulting diff and verification output.
