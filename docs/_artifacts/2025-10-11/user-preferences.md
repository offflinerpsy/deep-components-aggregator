# User Preference: Russian Language Only

Date: 2025-10-11

User explicitly requested that the assistant always responds in Russian and to record this in Copilot rules. The following updates were made:

- Updated `.github/copilot-instructions.md` with an explicit "Язык общения" section enforcing Russian as default.
- Updated `docs/COPILOT_MEMORY.md` with a rule noting Russian as the primary communication language.

Acceptance criteria:
- All future assistant replies are in Russian unless user explicitly asks for another language or when preserving exact technical fragments.

Verification:
- Files updated and committed in working tree (pending PR).
