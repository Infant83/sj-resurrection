# Data dictionary

| Field | Meaning |
|---|---|
| `recordId` | Permanent post identifier; never changed after publication |
| `board` | `trauma`, `life`, `medical`, `rehabilitation`, or `media` |
| `eventAt` | Optional actual event/observation time with explicit precision; never used to split a source message |
| `recordedAt` | Source conversation time used for feed grouping and sorting |
| `status` | `draft` or `published` |
| `sources` | Provenance and certainty records referenced by exchanges/amendments |
| `messages` | Complete visible user and GPT messages in source chronology |
| `messages[].role` | `user` or `assistant`; hidden reasoning, system, and tool records are excluded |
| `messages[].sourceOrdinal` | Message position in its confirmed shared-conversation snapshot |
| `messages[].original` | Exact user source text; never rewritten |
| `messages[].corrected` | Optional typo-only display copy of a user message |
| `messages[].originalSha256` | SHA-256 of the complete UTF-8 user source message |
| `messages[].text` | One complete visible GPT commentary or final message without rewriting or shortening |
| `messages[].textSha256` | SHA-256 of the complete UTF-8 GPT source message |
| `messages[].channel` | `commentary`, `final`, or `unknown` for a GPT message |
| `messages[].references` | Links attached to that GPT message in the source metadata |
| `sourceVerified` | This complete message was compared with the confirmed source conversation |
| `sourceVerifiedAt` | Time the completeness comparison was performed |
| `fidelity` | User source is exact or has a separate typo-corrected display copy; GPT text is exact only |
| `amendments` | Later correction, clarification, or follow-up without overwriting history |
| `media` | Stable references to centrally registered media assets |
| `privacyReviewed` | Manual privacy review completed before publication |
