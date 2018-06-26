# 3. Keep the access token in memory

Date: 2018-06-26
Status: Accepted

## Context

The Auth0 access token has to survive between page views inside the SPA. The
convenient place to put it is `localStorage`, which is also where most of the
tutorials put it.

This token can suspend and terminate phone lines.

## Decision

The token lives in a `BehaviorSubject` in `AuthService` and nowhere else. On a
full page reload we do a silent renew against Auth0 rather than restoring a
token from disk.

The interceptor attaches it only to requests whose URL starts with our API
base. Any other host gets no Authorization header.

## Consequences

Good:

- A script that gets onto the page — a compromised dependency, a bad tag from
  marketing — cannot read the token out of storage. It reduces the blast
  radius of an XSS from "attacker can terminate every line this agent can see"
  to "attacker can act while the page is open".
- Scoping the header to our API means a token cannot leak to a third party
  through a mistyped URL.

Bad:

- A hard refresh costs a silent-renew round trip, which is a visible flicker
  on a slow connection.
- Silent renew depends on a third-party cookie to Auth0. Safari's ITP was
  already making this fragile in 2018 and it got worse afterwards; the real
  answer is refresh token rotation, which Auth0 did not offer us at the time.
