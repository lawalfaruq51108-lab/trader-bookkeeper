# Speech test spike

## Device and results

- Device: Infinix Smart 7
- Model load time: 1,020 ms
- Transcription time: 11,025 ms
- Audio chunks: 47
- Spoken: “sold 3 bags of rice at 40k each”
- Heard: “So do the bugs of rice as for the key each.”

## Parser recognition errors to handle

- `sold` may be heard as “so do”
- `bags` may be heard as “bugs”
- `at` may be heard as “as”
- `40k` may be heard as “the key”

## Recommendation

Use a typed-first experience and offer voice as a clearly labeled beta feature. In this test, transcription took over 11 seconds for one short sentence and lost the numbers and units, making the result unreliable without correction.
