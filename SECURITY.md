# Security

## Reporting a problem

Please report security problems privately, not in a public issue: use **Report a vulnerability** on the
repository's Security tab, or email **hello@monarcpro.app** with "Volito security" in the subject.
Include the version (`npx volito --version` or `package.json`), what you ran and what happened.
We'll reply within a few working days and credit you in the release notes if you'd like.

## Supported versions

Fixes land on the latest release on npm.

## What the sandbox is, and isn't

Volito runs each graphic's program in a fresh Node `vm` context (and a Web Worker in the browser). Only
strings and numbers cross into it; eval, `Function`, `require`, `process` and the network are out of reach.
That keeps mistakes contained, but `vm` is not a security boundary: run packs and programs you trust, as
you would any npm package. A way for a program to reach outside its context is still worth reporting.
