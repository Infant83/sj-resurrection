# Repository operating rules

These rules apply to every agent or contributor updating this archive.

1. The user's named target board always overrides automatic classification.
2. Never reconstruct an unavailable original prompt from memory or a summary and label it exact.
3. Preserve the original user message and original GPT reply. Add later corrections as amendments.
4. For `life` letters, change only unambiguous spelling and spacing in `corrected`; preserve voice, repetition, rhythm, and emotion.
5. Keep `eventAt` separate from `recordedAt`. Do not invent an exact time.
6. Label each claim as medical record, physician/nurse report, caregiver observation, recollection, external reference, or GPT analysis.
7. Never promote a caregiver observation or GPT inference to a confirmed clinical fact.
8. Do not commit patient numbers, resident numbers, addresses, signatures, access tokens, temporary attachment URLs, or raw unreviewed medical documents.
9. Use stable `recordId`, exchange IDs, source IDs, and media IDs. Do not reuse IDs.
10. Update `src/data/import-ledger.json` for every source import so repeated runs remain idempotent.
11. Run `npm run privacy:check`, `npm run check`, and `npm run build` before committing.
12. Keep GitHub Pages and any public deployment disabled unless the user makes a new explicit publication decision.

## Update workflow

When the user says “재활준비 게시판을 업데이트하자” or names another board:

1. Read this file and `EDITORIAL_POLICY.md`.
2. Compare the requested conversation/messages with `import-ledger.json`.
3. Create one dated post per coherent event or letter.
4. Store the exact message in `exchanges[].user.original`; add `corrected` only when the board policy allows it.
5. Store the corresponding GPT answer in `exchanges[].assistant.text` without rewriting it.
6. Add source and certainty labels, related posts, amendments, and media IDs.
7. Validate, build, commit atomically, and report what was added, corrected, or held for source verification.
