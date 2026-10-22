# Data dictionary

| Field | Meaning |
|---|---|
| `recordId` | Permanent post identifier; never changed after publication |
| `board` | `trauma`, `life`, `medical`, `rehabilitation`, or `media` |
| `eventAt` | Optional actual event/observation time with explicit precision; never used to split a source message |
| `recordedAt` | Source conversation time used for feed grouping and sorting; for a handwritten letter, the confirmed receipt/transcription date with a provenance note, not an invented writing date |
| `status` | `draft` or `published` |
| `sources` | Provenance and certainty records referenced by exchanges/amendments |
| `messages` | Complete visible user and GPT messages in source chronology, or a complete source-verified embedded report or handwritten-letter transcript |
| `messages[].role` | `user` or `assistant`; a letter transcript uses `user` to identify the letter's author, not to claim a conversation input; hidden reasoning, system, and tool records are excluded |
| `messages[].sourceKind` | `conversation-message`, `voice-transcript`, `embedded-app-report`, or `letter-transcript`; the last is a complete original-checked handwritten-letter reading, explicitly labeled and publishable only with user role, letter entry type, and a confirmed user-recollection source |
| `messages[].sourceOrdinal` | Position in its confirmed shared-conversation snapshot, or stable ordinal of a complete embedded report/letter transcript within its canonical source |
| `messages[].original` | Exact user source text, or the first complete reviewed letter transcription with uncertain readings marked; never rewritten |
| `messages[].corrected` | Optional typo-only display copy of a user message |
| `messages[].originalSha256` | SHA-256 of the complete UTF-8 user source message or reviewed letter transcription; never a public hash of private original letter photos |
| `messages[].text` | One complete visible GPT commentary or final message without rewriting or shortening |
| `messages[].textSha256` | SHA-256 of the complete UTF-8 GPT source message |
| `messages[].channel` | `commentary`, `final`, or `unknown` for a GPT message |
| `messages[].references` | Links attached to that GPT message in the source metadata |
| `sourceVerified` | This complete message/report/transcript was compared with its canonical conversation, report or handwritten-letter original; not confirmation of every claim within the text |
| `sourceVerifiedAt` | Time the completeness comparison was performed |
| `fidelity` | User source is exact or has a separate typo-corrected display copy; GPT text is exact only |
| `amendments` | Later correction, clarification, or follow-up without overwriting history |
| `media` | Stable references to centrally registered media assets |
| `privacyReviewed` | Manual privacy review completed before publication |
