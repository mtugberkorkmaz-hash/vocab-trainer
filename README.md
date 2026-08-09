# 🛠️ Personal Engineering English Trainer

A personal, offline Python vocabulary trainer built for **B1-level engineers**
who want to:
- Master **engineering & piping** terminology
- Speak confidently in **professional meetings**
- Use English more naturally in **daily life**
- Prepare for exams like **YDS** with 5-option cloze questions

## How to run

Requires only Python 3 (no extra packages needed).

**Console version (menus in the terminal):**
```bash
cd vocab_trainer
python3 main.py
```

**🕹️ Retro GUI version (opens its own window, no console interaction):**
```bash
cd vocab_trainer
python3 retro_gui.py
```
This opens a separate, retro arcade-style window with a main menu and full
back (`< GERI`) navigation on every screen:

1. **KELIME KARTLARI** — flashcards: term + 3 random example sentences.
   Press **OGREN** to reveal the meaning and a short explanation of the
   word/sentence structure. Then mark **BILIYORUM** (I know it) or
   **BILMIYORUM** (I don't know it). Unknown items go into a persistent
   **weak pool** (`data/weak_pool.json`); marking something known removes
   it from that pool. You can study "ZAYIF HAVUZ" (the weak pool) as its
   own category any time.
2. **TEST** — exam-style multiple choice. Distractor options are chosen
   from the **same category** as the correct answer, so they look and
   feel similar (harder, closer to real exam conditions). On a wrong
   answer you get **OGREN** (show the explanation) and **GEC** (skip to
   the next question) instead of being forced to guess again.
3. **BOSLUK DOLDURMA** — type the missing word from a real example
   sentence. Same OGREN / GEC options on a wrong answer.
4. **MEETING MODU** — 12 realistic meeting scenarios (kick-off, piping
   90% model review, hydraulic analysis design review, recruitment
   interview, weekly progress, HSE, cost review, schedule review, vendor
   clarification call, issue resolution, contract negotiation, closeout).
   Each has 5 exchanges: the client/interviewer/vendor asks something in
   English, you pick the most professional response from 3 close options.
   Wrong answers show why (in Turkish) with **TEKRAR DENE** (retry) or
   **GEC** (reveal the correct answer and move on). At the end you get a
   full **bilingual transcript** (English + Turkish) of the whole
   conversation, scrollable on screen.
5. **GUNLUK KALIPLAR** — 25 common everyday English patterns (*I was
   wondering if..., Would you mind...?, The thing is..., To be honest...*
   etc.), taught the same way as flashcards (meaning + structure
   explanation + 3 examples + know/don't-know), with their own weak-pool
   tracking.
6. **HIZLI TUR** — bonus scored round, alternates HARD/EASY questions
   automatically, tracks score/streak/level (same as the original version).

> Tip (Windows): if a console window still flashes behind the GUI, rename
> the file to `retro_gui.pyw` and double-click it — `.pyw` files run with
> `pythonw.exe`, which has no console at all.

### On the "1000 examples" request

Hand-authoring 1,000 genuinely good example sentences per category isn't
realistic to do with real quality in one pass — that would be tens of
thousands of lines of content with no way to check accuracy. Instead the
whole system is **data-driven**: every word, pattern, and meeting scenario
lives in a plain JSON file (`data/words.json`, `data/patterns.json`,
`data/meetings.json`). Send your own word list any time and it can be
merged in — the engine doesn't care whether there are 30 words or 3,000,
it just reads whatever is in the JSON files.

You'll get a menu:

1. Pick a **category**: Engineering & Piping / Meeting English / Daily Life / Mixed
2. Pick a **mode**:
   - **Flashcards** — see the word, try to recall it, reveal the meaning + 3 example sentences, then rate yourself
   - **Multiple Choice** — term → meaning, 4 options
   - **Fill-in-the-Blank** — a real sentence with the word removed; you type the missing word
   - **YDS-style Exam Prep** — 5-option cloze test, similar to Turkish national English exams
   - **Due for Review Today** — spaced-repetition review queue

Your progress is saved automatically to `data/progress.json`.

## Spaced repetition (how it works)

This uses a simple **Leitner system** with 5 boxes:

| Box | Review again in |
|-----|------------------|
| 1   | today |
| 2   | 1 day |
| 3   | 3 days |
| 4   | 7 days |
| 5   | 16 days (mastered) |

- Answer **correctly** → word moves up a box (you'll see it less often)
- Answer **wrong** → word drops back to box 1 (you'll see it again soon)

## Adding your own words

Open `data/words.json` and add a new entry under `engineering`, `meeting`,
or `daily`:

```json
{
  "id": "eng013",
  "term": "your new term",
  "pronunciation": "how-to-say-it",
  "translation": "Türkçe karşılığı",
  "sentences": [
    "Example sentence 1.",
    "Example sentence 2.",
    "Example sentence 3.",
    "Example sentence 4.",
    "Example sentence 5."
  ]
}
```

Keep the `id` unique. That's it — it will show up automatically in every mode.

## Project structure

```
vocab_trainer/
├── main.py           # CLI entry point / menus
├── data_loader.py     # loads & filters words.json
├── quiz.py            # all quiz modes
├── srs.py              # Leitner spaced-repetition engine
├── data/
│   ├── words.json      # your vocabulary bank
│   └── progress.json   # auto-generated, tracks your learning progress
└── README.md
```
