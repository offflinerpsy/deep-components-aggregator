# ADR-0001: Template for Architecture Decision Records

**Status**: Template (not a real decision)  
**Date**: 2025-10-05  
**Deciders**: Team / Lead Developer

---

## Context

Describe the context and problem statement:
- What forces are at play?
- What is the issue we're trying to address?
- What are the constraints?

Example:
> We need a standardized way to document architectural decisions in the project. Without a clear format, decisions are scattered across commit messages, Slack threads, and meeting notes, making it hard to understand why certain choices were made.

---

## Decision

State the decision clearly and concisely.

Example:
> We will use Architecture Decision Records (ADR) in the `docs/adr/` directory to document all significant architectural decisions. Each ADR will be numbered sequentially (0001, 0002, etc.) and follow this template.

---

## Consequences

Describe the resulting context after applying the decision:

### Positive
- Decisions are documented and searchable
- New team members can understand historical context
- Forces explicit reasoning about trade-offs

### Negative
- Requires discipline to maintain
- Adds overhead to decision-making process

### Neutral
- Need to educate team on ADR format
- May need tooling to generate/manage ADRs

---

## Alternatives Considered

List other options that were evaluated:

1. **Wiki pages**: Pro - easy to edit; Con - often becomes stale
2. **README sections**: Pro - visible; Con - doesn't scale
3. **No documentation**: Pro - zero overhead; Con - knowledge loss

---

## Links

References and related resources:
- [ADR on GitHub](https://github.com/joelparkerhenderson/architecture-decision-record)
- [Thoughtworks on ADRs](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)
- Related ADRs: #0002 (if applicable)
- Pull Request: #XXX
- Issue: #YYY

---

## Notes

Additional context, implementation notes, or migration plan.

Example:
> Start with this template (ADR-0001). Next ADR will be numbered 0002. Store in `docs/adr/NNNN-short-title.md`.
