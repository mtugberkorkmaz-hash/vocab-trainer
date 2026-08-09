"""
weak_pool.py -- Persistent pool of words/patterns the user marked
"don't know". Known items are removed from the pool automatically.
"""
import json
import os

POOL_FILE = os.path.join(os.path.dirname(__file__), "data", "weak_pool.json")


def load_pool():
    if not os.path.exists(POOL_FILE):
        return []
    with open(POOL_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_pool(pool):
    os.makedirs(os.path.dirname(POOL_FILE), exist_ok=True)
    with open(POOL_FILE, "w", encoding="utf-8") as f:
        json.dump(pool, f, ensure_ascii=False, indent=2)


def mark_unknown(word_id):
    """Add a word/pattern id to the weak pool if not already there."""
    pool = load_pool()
    if word_id not in pool:
        pool.append(word_id)
        save_pool(pool)
    return pool


def mark_known(word_id):
    """Remove a word/pattern id from the weak pool if present."""
    pool = load_pool()
    if word_id in pool:
        pool.remove(word_id)
        save_pool(pool)
    return pool


def get_pool_items(all_items):
    """Given a list of word/pattern dicts, return only the ones
    whose id is currently in the weak pool."""
    pool = set(load_pool())
    return [item for item in all_items if item["id"] in pool]
