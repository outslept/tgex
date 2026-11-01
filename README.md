# chatlyzer

Zero-dependency CLI tool for analyzing Telegram JSON exports (`result.json`). Supports both single-chat and full-account exports.

## Usage

1. Export your chat or account data in **Telegram Desktop**:  
   `Settings → Advanced → Export Telegram data` → select **Machine-readable JSON**.
2. Run `chatlyzer` in the directory containing `result.json`:

```bash
npx chatlyzer
# or directly with Node >= 22.6:
node src/index.ts
```

## Example Output

```text
Total 4820

Alice
  messages     2651  55.0%
  Photos        142  5.4%
  Voice          89  3.4%
  Stickers      210  7.9%

Bob
  messages     2169  45.0%
  Video msgs     34  1.6%
  Animations     65  3.0%
  Stickers      120  5.5%

Peak Friday 21:00–22:00  184
```

- **messages**: user's share of all messages in the export (service events like joins/pins are excluded).
- **media rows**: share of that specific user's messages (zero-count media types are hidden).
- **Peak**: the single weekday + 1-hour window with the highest message volume.
