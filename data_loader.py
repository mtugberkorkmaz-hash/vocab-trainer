"""
data_loader.py -- loads and filters the vocabulary bank.
"""
import json
import os

WORDS_FILE = os.path.join(os.path.dirname(__file__), "data", "words.json")
PATTERNS_FILE = os.path.join(os.path.dirname(__file__), "data", "patterns.json")
MEETINGS_FILE = os.path.join(os.path.dirname(__file__), "data", "meetings.json")

CATEGORY_LABELS = {
    "engineering": "Engineering & Piping",
    "meeting": "Professional / Meeting English",
    "daily": "Daily Life",
}


def load_all_words():
    with open(WORDS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    flat = []
    for category, words in data.items():
        for w in words:
            w = dict(w)
            w["category"] = category
            flat.append(w)
    return flat


def load_by_category(category):
    if category == "mixed":
        return load_all_words()
    return [w for w in load_all_words() if w["category"] == category]


def find_word(all_words, word_id):
    for w in all_words:
        if w["id"] == word_id:
            return w
    return None


def load_patterns():
    """Daily conversation patterns -- same schema as words, own category 'patterns'."""
    with open(PATTERNS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    for p in data:
        p["category"] = "patterns"
    return data


def load_meetings():
    with open(MEETINGS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)
