# Editorial and preservation policy

## 1. Three layers

- **Source archive:** selected exact messages, complete embedded reports, and original attachments, kept read-only and eventually linked by hash.
- **Normalized record:** structured post metadata, chronological messages, sources, amendments, and media references.
- **Rendered site:** the family-readable continuous feed generated from the normalized record.

Conversation summaries are discovery indexes, not publishable records. Text recovered only from a summary is never rendered on the site and is not committed as a substitute for the source message.

Posts have no narrative summary field. Titles identify a date or source thread; they do not replace, condense, or reinterpret the conversation.

The existing repository history is retained as a record of the project's development. Earlier summary-draft commits are not restored to `main` or the rendered site, and history is not rewritten unless the user explicitly changes this decision.

## 2. Original prompts and letters

- Every board preserves every included visible user prompt, GPT commentary, and GPT final answer from the source conversation. A complete external or embedded report may also stand alone when it is source-verified, hashed, and clearly labeled as a report rather than a conversation reply.
- A complete handwritten-letter transcript may also stand alone after the original pages have been checked and privacy-reviewed. It uses `sourceKind: letter-transcript`, a user role, `entryType: letter`, and a confirmed `user-recollection` source. The display identifies it as a handwritten-letter reading, not a historical conversation input or GPT reply; no GPT reply is required or invented for it.
- Letter transcripts preserve the wording, repetition, emotion and page order. Uncertain readings are marked explicitly, for example `[판독 불명]`, and any editorial explanation is separate from the transcribed words. A typo-only display copy may be added without replacing the first reviewed transcription.
- A source message remains one message. It is never split, merged, shortened, or reordered to fit event-based sections.
- When a user adds information before the final GPT answer, the intervening user and GPT messages remain in their actual order; they are not forced into artificial one-to-one pairs.
- User-authored prompts and letters display a typo-and-spacing-only corrected copy by default and retain the complete input text behind “입력 당시 원문 보기”.
- Ambiguous medical terms, dates, numbers, units, drug names, and anatomical terms are never silently corrected.
- A stylistic rewrite, if ever requested, is stored as a separate proposal and never replaces the letter.

## 3. Provenance

Every post distinguishes:

- official medical record or test document
- physician explanation
- nurse or staff report
- caregiver direct observation
- user recollection
- external reference
- GPT analysis or inference

Exact quotes use quotation marks only when the exact wording is available. A remembered clinician explanation is labeled as a caregiver's recollection of that explanation.

Before publication, each visible message is checked against its confirmed source conversation, complete embedded report or original handwritten letter. The source message or transcript ID, source ordinal, UTF-8 SHA-256 text hash, and verification time are stored with the record. A letter transcript's hash identifies its reviewed text, not the original image or proof of every clinical claim in the letter.

If the shared source omits or redacts a reply, the missing reply is never reconstructed. Detailed identifiers and hash evidence remain in private audit material; the public import ledger records only aggregate withheld counts and reasons. The incomplete exchange remains off the public feed until a complete source is supplied.

## 4. Time

- `eventAt` is when the event, observation, call, meeting, test, or treatment occurred.
- `recordedAt` is when it was recorded in the conversation.
- The feed is grouped and sorted by `recordedAt`. `eventAt` is optional supporting metadata and never causes a source message to be split or rearranged.
- `precision` retains whether a second, minute, hour, day, range, or unknown time is available.
- Relative expressions such as “today”, “yesterday”, and “overnight” remain in the original text. They are converted to absolute dates only when the timestamp and context make the conversion certain.
- A letter's confirmed receipt or transcription date may be used as `recordedAt` with an explicit provenance note. Do not infer an exact writing or delivery date for `eventAt` from an undated letter, photo filename or recollection; leave it unknown or omit it.

## 5. Corrections

Past records are not silently rewritten when later information changes the interpretation. Add an `amendment` and link it to the target record. Use `correction`, `clarification`, or `follow-up` according to the change.

## 6. Medical limitation

This archive is a family record of observations, received explanations, and ChatGPT answers. It is not an official hospital medical record or a confirmed diagnosis. Current treatment decisions must rely on the clinical team and official test documents.

## 7. Privacy and media

- The repository and GitHub Pages preview are public by the user's explicit publication decision.
- The public preview may contain only privacy-reviewed, source-verified complete conversation exchanges, complete embedded reports, or complete handwritten-letter transcripts checked against the originals. It does not present summaries or reconstructions as historical records.
- Official medical records, patient numbers, contact details, and original media are not committed to the public repository.
- Original handwritten-letter photographs, signatures and private image identifiers remain outside the public repository. Publish only the reviewed text with any privacy redactions and uncertain readings explicitly disclosed; do not embed or link the raw photos.
- `robots.txt` and `noindex` reduce discovery but do not provide access control. Content intended for the private source archive must never be assumed safe to publish here.
- Original photos and documents are separated from web derivatives.
- Display copies remove EXIF/GPS and redact patient numbers, addresses, phone numbers, barcodes, and signatures.
- Git LFS is a capacity tool, not encryption or access control.
- Before original-media imports, the Pages deployment is disabled and the publishable subset is reviewed again.
- The planned long-term host is a Cloudflare-based dynamic site with authenticated access. That migration is a later design phase, not part of the current preview.
