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

- The repository remains private and public deployment remains disabled.
- Original photos and documents are separated from web derivatives.
- Display copies remove EXIF/GPS and redact patient numbers, addresses, phone numbers, barcodes, and signatures.
- Git LFS is a capacity tool, not encryption or access control.
- Public sharing, if later requested, is created from a separate sanitized export rather than changing the original archive's visibility.
