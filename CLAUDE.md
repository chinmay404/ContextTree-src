# Context Tree (frontend)

V3 redesign in progress — read `context/DIRECTION.md` before any design or canvas work.

## Project context (CKIC)

This repo explains itself in `context/`. Four files, four questions.

**Every session, read `context/STATE.md` first.** One screen: where we are, what is
live, what is next.

Do **not** open the other three unless the work needs them:

| Read | Before you |
|---|---|
| `context/ARCHITECTURE.md` | change the shape of the system |
| `context/DEPLOYMENT.md` | touch infra, pipelines or environments |
| `context/DECISIONS.md` | undo something that looks deliberate |
| `context/DIRECTION.md` | do any V3 design, canvas or product work |

Before the session ends, or after anything ships, run `/ckic:continue`.

### Commit messages

```
type(scope): what changed

Why: the reason, not the diff.
Refs: context/DECISIONS.md YYYY-MM-DD | <PR>
```

Types: `feat fix chore docs refactor infra deploy`. The `Why:` line is the point —
it is the only place the reasoning survives, and `/ckic:continue` reads it back.

### Never in `context/`

Secrets — keys, tokens, connection strings, passwords, anything from a `.env`.
Personal data — contact details, customer records, anything identifying a person
outside the team. Resource, pipeline and setting **names** are fine; **values** are not.
