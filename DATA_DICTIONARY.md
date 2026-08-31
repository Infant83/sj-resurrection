# Data dictionary

| Field | Meaning |
|---|---|
| `recordId` | Permanent post identifier; never changed after publication |
| `board` | `trauma`, `life`, `medical`, `rehabilitation`, or `media` |
| `eventAt` | Optional actual event/observation time with explicit precision; never used to split a source message |
| `recordedAt` | Source conversation time used for feed grouping and sorting |
| `status` | `draft` or `published` |
| `sources` | Provenance and certainty records referenced by exchanges/amendments |
| `exchanges` | One or more user-message/GPT-reply pairs |
| `user.original` | Exact source text; never rewritten |
| `user.corrected` | Optional typo-only display copy |
| `user.originalSha256` | SHA-256 of the complete UTF-8 user source message |
| `assistant.text` | Complete GPT source reply without rewriting or shortening |
| `assistant.textSha256` | SHA-256 of the complete UTF-8 GPT source reply |
| `sourceVerified` | Both messages were compared with the confirmed source conversation |
| `sourceVerifiedAt` | Time the completeness comparison was performed |
| `fidelity` | User source is exact or has a separate typo-corrected display copy; GPT text is exact only |
| `amendments` | Later correction, clarification, or follow-up without overwriting history |
| `media` | Stable references to centrally registered media assets |
| `privacyReviewed` | Manual privacy review completed before publication |
