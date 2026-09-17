# Blind review protocol

## Preparation

1. Export every candidate and selected benchmark anchor to the same pixel dimensions.
2. Remove filenames, source-tool labels, workspace chrome, and metadata that reveal origin.
3. Randomize the order once and record it privately in `blind-order.json`.
4. Review the image at full size and at feed-preview size.
5. Do not show the concept brief until scoring is complete.

## Scoring

- Use the 1–5 definitions and weights in `../rubric.json`.
- `publishability` is one of `publish`, `minor-edit`, `major-edit`, or `reject`.
- `product_fidelity` and `claim_accuracy` are also hard pass/fail gates; a candidate cannot pass overall when either fails.
- `finishing_seconds` measures active human adjustment after the first complete candidate, excluding rendering or model wait time.
- Record concrete required changes as operations, such as `move packshot`, `reduce headline 8%`, or `change crop`; avoid vague notes such as `make it pop`.

## Review integrity

- At least two reviewers should score independently.
- Resolve factual disputes from the evidence ledger, not by averaging opinions.
- Preserve every original score. A consensus result is an additional record, not an overwrite.
- Only compare NoCanva candidates with references serving a similar communication job.
