# Greenfield example: weekend flight changes

This example shows how a product starts from a request before code exists.

## Request

Travellers call on weekends because agents are offline.
Can they make simple flight changes themselves?

## Expected flow

1. `propose-change` clarifies the request.
2. User approves a product wiki proposal.
3. `apply-wiki-change` writes the wiki units.
4. `generate-checks` drafts executable checks for the acceptance criteria.
5. `compile-change` chooses an architecture and implements the smallest safe slice.

