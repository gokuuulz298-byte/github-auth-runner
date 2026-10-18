# Architecture rules

- Keep lazy route imports centralized in `src/App.tsx` and guard route rendering with a recovery boundary, because deployed hashed assets can become stale while a page remains open.