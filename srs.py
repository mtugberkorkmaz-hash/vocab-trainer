"""
srs.py -- Simple Leitner-style Spaced Repetition System.

Boxes 1-5. Box 1 = review every day, Box 5 = review every 16 days.
Correct answer -> move up a box (review later).
Wrong answer   -> move back to box 1 (review sooner).
"""
import json
import os
from datetime import datetime, timedelta

PROGRESS_FILE = os.path.join(os.path.dirname(__file__), "data", "progress.json")

BOX_INTERVALS = {
    1: 0,   # review again today / immediately
    2: 1,   # 1 day
    3: 3,   # 3 days
    4: 7,   # 7 days
    5: 16,  # 16 days
}

MAX_BOX = 5


def _today_str():
    return datetime.now().strftime("%Y-%m-%d")


def load_progress():
    if not os.path.exists(PROGRESS_FILE):
        return {}
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_progress(progress):
    os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def get_word_state(progress, word_id):
    """Return (box, next_review_date, correct_count, wrong_count) for a word,
    creating a default entry if it doesn't exist yet."""
    if word_id not in progress:
        progress[word_id] = {
            "box": 1,
            "next_review": _today_str(),
            "correct": 0,
            "wrong": 0,
            "last_seen": None,
        }
    return progress[word_id]


def is_due(progress, word_id):
    state = get_word_state(progress, word_id)
    next_review = datetime.strptime(state["next_review"], "%Y-%m-%d")
    return next_review <= datetime.now()


def record_result(progress, word_id, correct: bool):
    """Update a word's box and next review date based on whether the
    user answered correctly."""
    state = get_word_state(progress, word_id)
    if correct:
        state["box"] = min(state["box"] + 1, MAX_BOX)
        state["correct"] += 1
    else:
        state["box"] = 1
        state["wrong"] += 1

    interval_days = BOX_INTERVALS[state["box"]]
    next_review = datetime.now() + timedelta(days=interval_days)
    state["next_review"] = next_review.strftime("%Y-%m-%d")
    state["last_seen"] = _today_str()
    progress[word_id] = state
    save_progress(progress)
    return state


def due_words(progress, all_words):
    """Given a list of word dicts, return only the ones that are due for review."""
    return [w for w in all_words if is_due(progress, w["id"])]


def stats_summary(progress, all_words):
    """Return simple stats: total words, mastered (box 5), learning, new."""
    total = len(all_words)
    mastered = 0
    learning = 0
    new = 0
    for w in all_words:
        wid = w["id"]
        if wid not in progress:
            new += 1
        else:
            box = progress[wid]["box"]
            if box >= MAX_BOX:
                mastered += 1
            else:
                learning += 1
    return {"total": total, "mastered": mastered, "learning": learning, "new": new}
