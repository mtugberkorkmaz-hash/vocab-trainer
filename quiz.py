"""
quiz.py -- Quiz modes: flashcards, multiple choice, fill-in-the-blank,
and a YDS-style cloze test (5-option sentence completion, closer to
Turkish national English exams).
"""
import random
import re


def _distractor_pool(all_words, exclude_id, n=4):
    """Pick n random 'translation' distractors from other words."""
    others = [w for w in all_words if w["id"] != exclude_id]
    random.shuffle(others)
    return [w["translation"] for w in others[:n]]


def flashcard_session(words, progress, srs):
    """Classic flashcard: show term, user tries to recall the meaning,
    then self-rates (1=forgot, 2=hard, 3=easy). Updates SRS box."""
    print("\n📇 FLASHCARD MODE")
    print("Press Enter to reveal the answer. Then rate yourself.\n")
    random.shuffle(words)
    for w in words:
        print(f"\n🔹 {w['term']}   ({w['pronunciation']})")
        input("   ...press Enter to reveal meaning & example sentences...")
        print(f"   ✅ Meaning: {w['translation']}")
        print("   📝 Example sentences:")
        for s in w["sentences"][:3]:
            print(f"      - {s}")
        while True:
            ans = input("   Did you know it? (1=No 2=Almost 3=Yes, q=quit): ").strip().lower()
            if ans == "q":
                print("Session ended early. Progress saved.")
                return
            if ans in ("1", "2", "3"):
                correct = ans in ("2", "3")
                srs.record_result(progress, w["id"], correct)
                break
            print("   Please answer 1, 2, 3 or q.")
    print("\n✅ Flashcard session complete! Great work.")


def multiple_choice_session(words, progress, srs, all_words, n_questions=10):
    """Term -> meaning multiple choice, 4 options."""
    print("\n🔤 MULTIPLE CHOICE MODE (term → meaning)\n")
    sample = random.sample(words, min(n_questions, len(words)))
    score = 0
    for i, w in enumerate(sample, 1):
        options = _distractor_pool(all_words, w["id"], 3) + [w["translation"]]
        random.shuffle(options)
        correct_letter = "ABCD"[options.index(w["translation"])]
        print(f"{i}. What does \"{w['term']}\" mean?")
        for letter, opt in zip("ABCD", options):
            print(f"   {letter}) {opt}")
        ans = input("   Your answer: ").strip().upper()
        is_correct = ans == correct_letter
        srs.record_result(progress, w["id"], is_correct)
        if is_correct:
            print("   ✅ Correct!\n")
            score += 1
        else:
            print(f"   ❌ Wrong. Correct answer: {correct_letter}) {w['translation']}\n")
    print(f"🏁 Score: {score}/{len(sample)}")


def fill_in_the_blank_session(words, progress, srs, n_questions=10):
    """Take a real example sentence, blank out the target word, user types it."""
    print("\n✍️  FILL-IN-THE-BLANK MODE\n")
    sample = random.sample(words, min(n_questions, len(words)))
    score = 0
    for i, w in enumerate(sample, 1):
        sentence = random.choice(w["sentences"])
        # Blank out the term (case-insensitive, handles multi-word terms)
        pattern = re.compile(re.escape(w["term"]), re.IGNORECASE)
        blanked = pattern.sub("_____", sentence, count=1)
        print(f"{i}. {blanked}")
        ans = input("   Fill in the blank: ").strip().lower()
        is_correct = ans == w["term"].lower()
        srs.record_result(progress, w["id"], is_correct)
        if is_correct:
            print("   ✅ Correct!\n")
            score += 1
        else:
            print(f"   ❌ Wrong. Correct word: \"{w['term']}\"\n")
    print(f"🏁 Score: {score}/{len(sample)}")


def yds_style_session(words, progress, srs, all_words, n_questions=10):
    """YDS/exam-style: sentence with a blank, 5 options (A-E),
    only one grammatically & semantically correct."""
    print("\n🎓 YDS-STYLE EXAM PREP (5-option cloze)\n")
    sample = random.sample(words, min(n_questions, len(words)))
    score = 0
    for i, w in enumerate(sample, 1):
        sentence = random.choice(w["sentences"])
        pattern = re.compile(re.escape(w["term"]), re.IGNORECASE)
        blanked = pattern.sub("_______", sentence, count=1)

        # Build 4 distractor terms from other words (same-ish category feel)
        others = [x for x in all_words if x["id"] != w["id"]]
        random.shuffle(others)
        distractor_terms = [x["term"] for x in others[:4]]
        options = distractor_terms + [w["term"]]
        random.shuffle(options)
        correct_letter = "ABCDE"[options.index(w["term"])]

        print(f"{i}. {blanked}")
        for letter, opt in zip("ABCDE", options):
            print(f"   {letter}) {opt}")
        ans = input("   Your answer: ").strip().upper()
        is_correct = ans == correct_letter
        srs.record_result(progress, w["id"], is_correct)
        if is_correct:
            print("   ✅ Correct!\n")
            score += 1
        else:
            print(f"   ❌ Wrong. Correct answer: {correct_letter}) {w['term']}\n")
    print(f"🏁 Score: {score}/{len(sample)}  (YDS-style)")
