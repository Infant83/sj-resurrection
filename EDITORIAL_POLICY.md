# Editorial and preservation policy

## 1. Three layers

- **Source archive:** selected exact messages and original attachments, kept read-only and eventually linked by hash.
- **Normalized record:** structured post metadata, exchanges, sources, amendments, and media references.
- **Rendered site:** the family-readable continuous feed generated from the normalized record.

Conversation summaries are discovery indexes, not original messages. Text recovered only from a summary must use `summary-reconstruction` and `needs-original-check`.

## 2. Original prompts and letters

- Severe-trauma and medical conversations preserve the exact user prompt and exact GPT answer.
- Letters in 「선진과 함께하는 삶」 display a typo-only corrected copy by default and retain the complete original behind “입력 당시 원문 보기”.
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

## 4. Time

- `eventAt` is when the event, observation, call, meeting, test, or treatment occurred.
- `recordedAt` is when it was recorded in the conversation.
- `precision` retains whether a minute, hour, day, range, or unknown time is available.
- Relative expressions such as “today”, “yesterday”, and “overnight” remain in the original text. They are converted to absolute dates only when the timestamp and context make the conversion certain.

## 5. Corrections

Past records are not silently rewritten when later information changes the interpretation. Add an `amendment` and link it to the target record. Use `correction`, `clarification`, or `follow-up` according to the change.

## 6. Medical limitation

This archive is a family record of observations, received explanations, and ChatGPT answers. It is not an official hospital medical record or a confirmed diagnosis. Current treatment decisions must rely on the clinical team and official test documents.

## 7. Privacy and media

- The repository and GitHub Pages preview are public by the user's explicit publication decision.
- The public preview may contain privacy-reviewed clinical timeline summaries with direct identifiers minimized, plus selected conversation excerpts. These are not guaranteed to be anonymous or non-reidentifiable.
- Full conversation exports, official medical records, patient numbers, contact details, and original media are not committed to the public repository.
- `robots.txt` and `noindex` reduce discovery but do not provide access control. Content intended for the private source archive must never be assumed safe to publish here.
- Original photos and documents are separated from web derivatives.
- Display copies remove EXIF/GPS and redact patient numbers, addresses, phone numbers, barcodes, and signatures.
- Git LFS is a capacity tool, not encryption or access control.
- Before full-source or original-media imports, the Pages deployment is disabled and the publishable subset is reviewed again.
- The planned long-term host is a Cloudflare-based dynamic site with authenticated access. That migration is a later design phase, not part of the current preview.
