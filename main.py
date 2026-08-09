#!/usr/bin/env python3
"""
Personal Engineering English Trainer
--------------------------------------
A CLI vocabulary + quiz tool for B1-level learners focused on:
  - Engineering & Piping terminology
  - Professional / Meeting English
  - Daily life English
With spaced repetition (Leitner system), multiple quiz modes,
and a YDS-style exam prep module.

Run with:  python3 main.py
"""
import sys
import data_loader
import srs
import quiz

CATEGORY_MENU = {
    "1": "engineering",
    "2": "meeting",
    "3": "daily",
    "4": "mixed",
}

MODE_MENU = {
    "1": "flashcard",
    "2": "multiple_choice",
    "3": "fill_blank",
    "4": "yds",
    "5": "due_review",
}


def print_header():
    print("=" * 55)
    print("   🛠️  PERSONAL ENGINEERING ENGLISH TRAINER  🛠️")
    print("=" * 55)


def choose_category():
    print("\nChoose a word category:")
    print("  1) Engineering & Piping")
    print("  2) Professional / Meeting English")
    print("  3) Daily Life")
    print("  4) Mixed (all categories)")
    choice = input("Your choice [1-4]: ").strip()
    return CATEGORY_MENU.get(choice, "mixed")


def choose_mode():
    print("\nChoose a study mode:")
    print("  1) Flashcards (learn/recall + self-rating)")
    print("  2) Multiple Choice Quiz (term → meaning)")
    print("  3) Fill-in-the-Blank (from real sentences)")
    print("  4) YDS-style Exam Prep (5-option cloze)")
    print("  5) Due for Review Today (spaced repetition)")
    choice = input("Your choice [1-5]: ").strip()
    return MODE_MENU.get(choice, "flashcard")


def show_stats(progress, all_words):
    stats = srs.stats_summary(progress, all_words)
    print("\n📊 Your Progress")
    print(f"   Total words:   {stats['total']}")
    print(f"   🌱 New:         {stats['new']}")
    print(f"   📘 Learning:    {stats['learning']}")
    print(f"   ⭐ Mastered:    {stats['mastered']}")


def main():
    print_header()
    all_words = data_loader.load_all_words()
    progress = srs.load_progress()

    while True:
        show_stats(progress, all_words)
        category = choose_category()
        words = data_loader.load_by_category(category)

        mode = choose_mode()

        if mode == "due_review":
            due = srs.due_words(progress, words)
            if not due:
                print("\n🎉 Nothing is due for review right now. Try flashcards to learn new words!")
            else:
                print(f"\n{len(due)} word(s) due for review.")
                quiz.flashcard_session(due, progress, srs)
        elif mode == "flashcard":
            quiz.flashcard_session(words, progress, srs)
        elif mode == "multiple_choice":
            quiz.multiple_choice_session(words, progress, srs, all_words)
        elif mode == "fill_blank":
            quiz.fill_in_the_blank_session(words, progress, srs)
        elif mode == "yds":
            quiz.yds_style_session(words, progress, srs, all_words)

        again = input("\nStudy again? (y/n): ").strip().lower()
        if again != "y":
            print("\n👋 See you next time! Progress has been saved.")
            break


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Session interrupted. Progress saved. Goodbye!")
        sys.exit(0)
