# Data dictionary

| Field | Meaning |
|---|---|
| `recordId` | Permanent post identifier; never changed after publication |
| `board` | `trauma`, `life`, `medical`, `rehabilitation`, or `media` |
| `eventAt` | Actual event/observation time with explicit precision |
| `recordedAt` | Time the material was recorded in ChatGPT or family notes |
| `status` | `draft`, `published`, or `needs-original-check` |
| `sources` | Provenance and certainty records referenced by exchanges/amendments |
| `exchanges` | One or more user-message/GPT-reply pairs |
| `user.original` | Exact source text; never rewritten |
| `user.corrected` | Optional typo-only display copy |
| `fidelity` | Exact, typo-corrected, summary reconstruction, or original pending |
| `amendments` | Later correction, clarification, or follow-up without overwriting history |
| `media` | Stable references to centrally registered media assets |
| `privacyReviewed` | Manual privacy review completed before publication |
