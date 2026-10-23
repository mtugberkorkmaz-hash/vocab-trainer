"""Merge and validate course content (lessons.json + review.json).

Usage (from the repo root):
    python tools/validate_content.py                 # validate only
    python tools/validate_content.py --add new.json  # merge, then validate + write

new.json format:
    {
      "lessons":     [ {lesson object, words WITHOUT ids} ],   # same id replaces
      "corrections": [ {id, page, wrong, correct, rule, rule_tr} ],
      "quiz":        [ {id, topic, question, answers} ]
    }

Checks: both copies identical, unique ids (also vs words.json/patterns.json),
sentences/translations lengths, every sentence gets an in-sentence blank
(Python port of buildBlank in docs/js/data.js), and no word-bank sentence
changes its blank compared with the committed data.js (IRREGULAR_VERBS edits).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEY_ORDER = ['id', 'term', 'pronunciation', 'translation', 'sentences', 'translations', 'explanation']


# ---------- port of buildBlank (docs/js/data.js) ----------
def parse_irregular(js_src):
    block = re.search(r'const IRREGULAR_VERBS = \{(.*?)\n\};', js_src.replace('\r\n', '\n'), re.S).group(1)
    return {k: re.findall(r"'([^']+)'", v) for k, v in re.findall(r"(\w+): \[([^\]]*)\]", block)}


def core_of(term):
    c = re.sub(r'^to\s+', '', term, flags=re.I)
    c = re.sub(r'^(?:get|be)\s+', '', c, flags=re.I)
    c = re.sub(r'\s*\([^)]*\)', '', c)
    c = re.sub(r'\.\.\.\??$', '', c)
    return re.sub(r'\?$', '', c).strip()


def extract_abbr(term):
    m = re.search(r'\(([A-Za-z0-9]{2,8})\)\s*$', term)
    return m.group(1) if m else None


def word_alt(word, irreg):
    forms = irreg.get(word.lower())
    if forms:
        return '(?:' + '|'.join(sorted(forms, key=len, reverse=True)) + ')'
    return re.escape(word) + r'\w*'


def is_placeholder(tok):
    return re.match(r"^someone'?s?$", tok, re.I) or re.match(r'^something$', tok, re.I)


def blank(term, sentence, irreg):
    """(blanked sentence, 'full' | 'keyword' | 'none')"""
    parts = []
    for tok in core_of(term).split():
        clean = re.sub(r"[^a-zA-Z'-]", '', tok)
        if not clean:
            continue
        parts.append(r"(?:[a-zA-Z']+(?:\s+[a-zA-Z']+){0,2})" if is_placeholder(clean) else word_alt(clean, irreg))
    if parts:
        pat = r'\s+'.join(parts)
        abbr = extract_abbr(term)
        if abbr:
            pat = '(?:' + pat + r'|\b' + re.escape(abbr) + r'\b)'
        m = re.compile(pat, re.I | re.A).search(sentence)
        if m:
            return sentence[:m.start()] + '_____' + sentence[m.end():], 'full'
    toks = [t for t in core_of(term).split() if not is_placeholder(t)]
    abbr = extract_abbr(term)
    for tok in ([abbr] if abbr else []) + (toks or [term]):
        clean = re.sub(r"[^a-zA-Z'-]", '', tok)
        if not clean:
            continue
        m = re.compile(word_alt(clean, irreg), re.I | re.A).search(sentence)
        if m:
            return sentence[:m.start()] + '_____' + sentence[m.end():], 'keyword'
    return sentence + ' (_____)', 'none'


# ---------- io ----------
def load(rel):
    return json.loads((ROOT / rel).read_text(encoding='utf-8'))


def dump(obj, name):
    # Match the existing files: 2-space indent, CRLF, no trailing newline.
    text = json.dumps(obj, ensure_ascii=False, indent=2).replace('\n', '\r\n')
    for base in ('data', 'docs/data'):
        (ROOT / base / name).write_bytes(text.encode('utf-8'))


def merge(lessons, review, new):
    for nl in new.get('lessons', []):
        prefix = 'b2l' + nl['id'][1:].lower()
        nl['words'] = [{k: dict(w, id=f'{prefix}{i:02d}')[k] for k in KEY_ORDER}
                       for i, w in enumerate(nl['words'], 1)]
        lessons = [l for l in lessons if l['id'] != nl['id']] + [nl]
    for key in ('corrections', 'quiz'):
        ids = {x['id'] for x in new.get(key, [])}
        review[key] = [x for x in review[key] if x['id'] not in ids] + new.get(key, [])
    return lessons, review


def main():
    add = sys.argv[sys.argv.index('--add') + 1] if '--add' in sys.argv else None
    lessons, review = load('data/lessons.json'), load('data/review.json')
    errors, warnings = [], []

    for name in ('lessons.json', 'review.json', 'words.json', 'patterns.json', 'meetings.json'):
        if (ROOT / 'data' / name).read_bytes() != (ROOT / 'docs/data' / name).read_bytes():
            errors.append(f'data/{name} and docs/data/{name} differ')

    if add:
        lessons, review = merge(lessons, review, json.loads(Path(add).read_text(encoding='utf-8')))

    irreg = parse_irregular((ROOT / 'docs/js/data.js').read_text(encoding='utf-8'))
    words = load('data/words.json')
    patterns = load('data/patterns.json')
    bank = [w for cat in words.values() for w in cat] + patterns

    ids = [w['id'] for l in lessons for w in l['words']]
    if len(ids) != len(set(ids)):
        errors.append('duplicate word ids in lessons')
    clash = set(ids) & {w['id'] for w in bank}
    if clash:
        errors.append(f'lesson ids clash with words/patterns: {clash}')
    if len({l['id'] for l in lessons}) != len(lessons):
        errors.append('duplicate lesson ids')
    terms = [w['term'].lower() for l in lessons for w in l['words']]
    dups = {t for t in terms if terms.count(t) > 1}
    if dups:
        errors.append(f'duplicate terms across lessons: {dups}')
    also = set(terms) & {w['term'].lower() for w in bank}
    if also:
        warnings.append(f'terms also in main word bank: {sorted(also)}')
    for key in ('corrections', 'quiz'):
        rid = [x['id'] for x in review[key]]
        if len(rid) != len(set(rid)):
            errors.append(f'duplicate ids in review.{key}')

    stats = {'full': 0, 'keyword': 0, 'none': 0}
    for l in lessons:
        for w in l['words']:
            if len(w['sentences']) != len(w['translations']):
                errors.append(f"{w['id']}: sentences/translations length mismatch")
            for s in w['sentences']:
                b, how = blank(w['term'], s, irreg)
                stats[how] += 1
                if how == 'none':
                    errors.append(f"{w['id']} '{w['term']}': no blank in: {s}")
                elif how == 'keyword' and ' / ' not in w['term']:
                    warnings.append(f"{w['id']} '{w['term']}': keyword-only blank: {b}")

    # Regression: word-bank blanks must not change versus the committed data.js.
    try:
        old_js = subprocess.run(['git', 'show', 'HEAD:docs/js/data.js'], cwd=ROOT, capture_output=True,
                                check=True).stdout.decode('utf-8')
        old = parse_irregular(old_js)
        changed = [(w['term'], s) for w in bank for s in w['sentences']
                   if blank(w['term'], s, old) != blank(w['term'], s, irreg)]
        if changed:
            warnings.append(f'{len(changed)} word-bank blanks changed vs HEAD, e.g. {changed[:3]}')
    except (subprocess.CalledProcessError, FileNotFoundError, AttributeError):
        warnings.append('regression check skipped (git/HEAD data.js unavailable)')

    print('lessons:', [(l['id'], len(l['words'])) for l in lessons])
    print('review:', len(review['corrections']), 'corrections,', len(review['quiz']), 'quiz')
    print('blanks:', stats)
    for w in warnings:
        print('WARN ', w)
    for e in errors:
        print('ERROR', e)

    if add and not errors:
        dump(lessons, 'lessons.json')
        dump(review, 'review.json')
        print('written: data/ + docs/data/ lessons.json, review.json')
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
