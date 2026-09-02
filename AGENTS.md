# Repository operating rules

These rules apply to every agent or contributor updating this archive.

1. The user's named target board always overrides automatic classification.
2. Never reconstruct an unavailable original prompt from memory or a summary and label it exact.
3. Preserve every visible source user or GPT message as one complete chronological message. Never split, merge, shorten, reassign, or reorder a source message, even when several user inputs occur before a final GPT answer. Add later corrections as amendments.
4. For every user-authored prompt or letter, display only a typo-and-spacing correction in `corrected`; preserve the complete input text in `original` and preserve voice, repetition, rhythm, and emotion.
5. Group and sort posts by `recordedAt`, the source conversation time. Keep optional `eventAt` separate and never invent an exact time.
6. Label each claim as medical record, physician/nurse report, caregiver observation, recollection, external reference, or GPT analysis.
7. Never promote a caregiver observation or GPT inference to a confirmed clinical fact.
8. Do not commit patient numbers, resident numbers, addresses, signatures, access tokens, temporary attachment URLs, or raw unreviewed medical documents.
9. Use stable `recordId`, exchange IDs, source IDs, and media IDs. Do not reuse IDs.
10. Update `src/data/import-ledger.json` for every source import so repeated runs remain idempotent. The public ledger contains aggregate counts, record IDs, and public-content hashes only; never add shared-conversation locators, source message IDs, conversation node IDs, raw-snapshot hashes, or withheld-message hashes.
11. Run `npm run privacy:check`, `npm run check`, and `npm run build` before committing.
12. GitHub Pages is currently public by explicit user decision. A post may be public only when it contains either a complete source-verified conversation exchange or a complete source-verified embedded report. Every included message or report must have a canonical source, source ID and ordinal, verification time, and content hash. Embedded reports must be explicitly labeled and may not be presented as GPT replies. Never publish or commit summaries, reconstructions, excerpts, hidden reasoning, tool output, or unavailable replies as substitutes for visible source material.
13. Preserve the existing Git history, including earlier commits that contained summary drafts. Do not rewrite history or force-push to remove them unless the user gives a new explicit instruction.

## Update workflow

When the user says “재활준비 게시판을 업데이트하자” or names another board:

1. Read this file and `EDITORIAL_POLICY.md`.
2. Compare the requested conversation/messages with `import-ledger.json`.
3. Create one post per source conversation date. Preserve the original message order within that date; do not regroup text by clinical event.
4. Store each complete source message in the chronological `messages` array. Put user source text in `original`; add `corrected` only for unambiguous typos and spacing.
5. Store each complete visible GPT commentary or final message separately in `text`, without rewriting, merging, or generating a preview summary.
6. Record source message IDs, source ordinals, and SHA-256 hashes, then mark completeness verified only after comparing every included message with the source.
7. Add source and certainty labels, related posts, amendments, and media IDs.
8. Imported posts remain drafts unless the manual privacy review is complete. Only then use the explicit `--publish-reviewed=true` import flag.
9. Run `npm run ledger:refresh`, then validate, build, commit atomically, and report what was added, corrected, or held for source verification. Legacy full-source import scripts intentionally refuse to write into the public aggregate ledger.
