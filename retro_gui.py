#!/usr/bin/env python3
"""
retro_gui.py -- Retro arcade-style GUI trainer (Tkinter, standard library only).
Opens in its OWN window (not a console app).

Modes:
  1. KELIME KARTLARI  -- flashcards: term + 3 example sentences, "OGREN"
                          (explanation), "BILIYORUM" / "BILMIYORUM".
                          Unknown words go into a persistent weak pool;
                          known words are removed from it.
  2. TEST              -- exam-style multiple choice with CLOSE distractors
                          (same category), "OGREN" / "GEC" on wrong answers.
  3. BOSLUK DOLDURMA    -- fill-in-the-blank from real example sentences.
  4. MEETING MODU       -- 12 realistic meeting scenarios, 5 Q&A each,
                          close-option responses, bilingual transcript
                          at the end.
  5. GUNLUK KALIPLAR    -- daily conversation patterns, teach + repeat,
                          same know/don't-know pool mechanic.
  6. HIZLI TUR          -- bonus scored round alternating hard/easy.

Run:   python3 retro_gui.py
"""
import random
import re
import tkinter as tk
from tkinter import font as tkfont

import data_loader
import srs
import weak_pool

ROUNDS_PER_SESSION = 10  # HIZLI TUR: alternates hard/easy -> 5 of each

# ---------- Retro color palette ----------
BG        = "#0b0b12"
PANEL_BG  = "#14141f"
BTN_BG    = "#1e1e2e"
FG_MAIN   = "#39ff14"   # neon green
FG_DIM    = "#1f8a0f"
EASY_COL  = "#00e5ff"   # neon cyan
HARD_COL  = "#ff3860"   # neon red/pink
GOLD      = "#ffd60a"
WHITE     = "#e8e8e8"
LEARN_COL = "#b967ff"   # neon purple for "learn"

CATEGORY_LABELS_TR = {
    "engineering": "MUHENDISLIK",
    "meeting": "TOPLANTI",
    "daily": "GUNLUK",
    "mixed": "KARISIK",
    "weak": "ZAYIF HAVUZ",
}


class RetroTrainer(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("RETRO ENGLISH TRAINER")
        self.geometry("760x620")
        self.resizable(False, False)
        self.configure(bg=BG)

        self.mono_s = tkfont.Font(family="Courier New", size=10, weight="bold")
        self.mono = tkfont.Font(family="Courier New", size=12, weight="bold")
        self.mono_big = tkfont.Font(family="Courier New", size=19, weight="bold")
        self.mono_title = tkfont.Font(family="Courier New", size=25, weight="bold")

        self.all_words = data_loader.load_all_words()
        self.all_patterns = data_loader.load_patterns()
        self.all_meetings = data_loader.load_meetings()
        self.progress = srs.load_progress()  # legacy score/level tracker (HIZLI TUR)

        # HIZLI TUR bonus-round state
        self.session_score = 0
        self.session_correct = 0
        self.session_wrong = 0
        self.streak = 0
        self.round_no = 0
        self.current_is_hard = True
        self.current_word = None
        self.current_correct_answer = None

        self._build_main_menu()

    # ============================================================
    #  Shared helpers
    # ============================================================
    def _clear(self):
        for widget in self.winfo_children():
            widget.destroy()

    def _back_button(self, parent, command, text="< GERI"):
        b = tk.Button(parent, text=text, font=self.mono_s, fg=WHITE, bg=BTN_BG,
                      relief="ridge", bd=2, command=command)
        b.place(x=10, y=10)
        return b

    def _pool_by_category(self, category, source="words"):
        """source: 'words' or 'patterns'. category: engineering/meeting/daily/mixed/weak."""
        base = self.all_patterns if source == "patterns" else self.all_words
        if category == "weak":
            return weak_pool.get_pool_items(base)
        if category == "mixed" or source == "patterns":
            return list(base)
        return [w for w in base if w["category"] == category]

    def _category_select_screen(self, title, on_pick, source="words"):
        self._clear()
        self._back_button(self, self._build_main_menu)
        frame = tk.Frame(self, bg=BG)
        frame.pack(expand=True, fill="both")

        tk.Label(frame, text=title, font=self.mono_title, fg=FG_MAIN, bg=BG).pack(pady=(60, 30))

        cats = ["engineering", "meeting", "daily", "mixed", "weak"]
        labels = {
            "engineering": "MUHENDISLIK & BORU HATTI",
            "meeting": "TOPLANTI INGILIZCESI",
            "daily": "GUNLUK HAYAT",
            "mixed": "KARISIK (HEPSI)",
            "weak": f"ZAYIF HAVUZ ({len(weak_pool.get_pool_items(self.all_words))} kelime)",
        }
        for cat in cats:
            n = len(self._pool_by_category(cat, source))
            state = "normal" if n > 0 else "disabled"
            b = tk.Button(frame, text=f"{labels[cat]}  [{n}]", font=self.mono,
                          fg="black" if state == "normal" else FG_DIM,
                          bg=FG_MAIN if state == "normal" else PANEL_BG,
                          relief="ridge", bd=4, width=32, state=state,
                          command=lambda c=cat: on_pick(c))
            b.pack(pady=8)

    # ============================================================
    #  MAIN MENU
    # ============================================================
    def _build_main_menu(self):
        self._clear()
        frame = tk.Frame(self, bg=BG)
        frame.pack(expand=True, fill="both")

        tk.Label(frame, text="* RETRO ENGLISH TRAINER *", font=self.mono_title,
                 fg=FG_MAIN, bg=BG).pack(pady=(30, 4))
        stats = self.progress
        weak_n = len(weak_pool.load_pool())
        info = (f"LEVEL {srs.stats_summary(self.progress, self.all_words)['mastered']*0+ (self.progress.get('total_correct',0)//20+1)}"
                f"   |   ZAYIF HAVUZ: {weak_n}   |   TOPLAM DOGRU: {self.progress.get('total_correct', 0)}")
        tk.Label(frame, text=info, font=self.mono_s, fg=GOLD, bg=BG).pack(pady=(0, 16))

        menu_items = [
            ("1) KELIME KARTLARI", self._flashcards_menu, FG_MAIN),
            ("2) TEST (sinav modu)", self._test_menu, HARD_COL),
            ("3) BOSLUK DOLDURMA", self._fillblank_menu, EASY_COL),
            ("4) MEETING MODU", self._meeting_list_screen, GOLD),
            ("5) GUNLUK KALIPLAR", self._patterns_menu, LEARN_COL),
            ("6) HIZLI TUR (skor)", self._start_hizli_tur, WHITE),
        ]
        for label, cmd, color in menu_items:
            tk.Button(frame, text=label, font=self.mono, fg="black", bg=color,
                      activebackground=GOLD, relief="ridge", bd=4, width=30, pady=6,
                      command=cmd).pack(pady=6)

        tk.Label(frame, text="Kelime havuzunu (words.json / patterns.json / meetings.json)\n"
                             "kendi listenle genisletebilirsin -- README'ye bak.",
                 font=self.mono_s, fg=FG_DIM, bg=BG, justify="center").pack(side="bottom", pady=16)

    # ============================================================
    #  MODE 1: KELIME KARTLARI (flashcards, know / don't know)
    # ============================================================
    def _flashcards_menu(self):
        self._category_select_screen("KELIME KARTLARI", self._start_flashcards, source="words")

    def _start_flashcards(self, category):
        pool = self._pool_by_category(category, source="words")
        random.shuffle(pool)
        self._fc_queue = pool
        self._fc_index = 0
        self._fc_source = "words"
        self._show_flashcard()

    def _show_flashcard(self):
        if self._fc_index >= len(self._fc_queue):
            self._flashcard_done_screen()
            return
        self._clear()
        self._back_button(self, self._build_main_menu)
        w = self._fc_queue[self._fc_index]

        outer = tk.Frame(self, bg=BG)
        outer.pack(expand=True, fill="both", padx=24, pady=24)

        tk.Label(outer, text=f"KART {self._fc_index + 1}/{len(self._fc_queue)}",
                 font=self.mono_s, fg=WHITE, bg=BG).pack(anchor="e")

        panel = tk.Frame(outer, bg=PANEL_BG, highlightbackground=FG_MAIN, highlightthickness=3)
        panel.pack(expand=True, fill="both", pady=16)

        tk.Label(panel, text=w["term"], font=self.mono_title, fg=FG_MAIN, bg=PANEL_BG,
                 wraplength=650).pack(pady=(24, 4))
        tk.Label(panel, text=f"[{w['pronunciation']}]", font=self.mono_s, fg=FG_DIM,
                 bg=PANEL_BG).pack()

        sent_frame = tk.Frame(panel, bg=PANEL_BG)
        sent_frame.pack(pady=16, padx=20, fill="x")
        for s in random.sample(w["sentences"], min(3, len(w["sentences"]))):
            tk.Label(sent_frame, text=f"- {s}", font=self.mono_s, fg=WHITE, bg=PANEL_BG,
                     wraplength=650, justify="left", anchor="w").pack(fill="x", pady=2)

        self._fc_explain_label = tk.Label(panel, text="", font=self.mono_s, fg=LEARN_COL,
                                           bg=PANEL_BG, wraplength=660, justify="left")
        self._fc_explain_label.pack(pady=(6, 10), padx=20)

        btns = tk.Frame(outer, bg=BG)
        btns.pack(pady=10)
        tk.Button(btns, text="OGREN (anlam + yapi)", font=self.mono_s, fg="black", bg=LEARN_COL,
                  relief="ridge", bd=3, command=lambda: self._reveal_explanation(w)
                  ).grid(row=0, column=0, columnspan=2, pady=6)
        tk.Button(btns, text="BILMIYORUM", font=self.mono, fg="black", bg=HARD_COL,
                  relief="ridge", bd=4, width=16,
                  command=lambda: self._flashcard_answer(w, False)).grid(row=1, column=0, padx=8)
        tk.Button(btns, text="BILIYORUM", font=self.mono, fg="black", bg=FG_MAIN,
                  relief="ridge", bd=4, width=16,
                  command=lambda: self._flashcard_answer(w, True)).grid(row=1, column=1, padx=8)

    def _reveal_explanation(self, w):
        text = w.get("explanation", "(Aciklama bulunamadi)")
        self._fc_explain_label.config(text=f"Anlam: {w['translation']}\n{text}")

    def _flashcard_answer(self, w, known):
        if known:
            weak_pool.mark_known(w["id"])
        else:
            weak_pool.mark_unknown(w["id"])
        self._fc_index += 1
        self._show_flashcard()

    def _flashcard_done_screen(self):
        self._clear()
        self._back_button(self, self._build_main_menu)
        frame = tk.Frame(self, bg=BG)
        frame.pack(expand=True, fill="both")
        tk.Label(frame, text="*** KART SETI TAMAMLANDI ***", font=self.mono_title,
                 fg=GOLD, bg=BG).pack(pady=(80, 20))
        n = len(weak_pool.load_pool())
        tk.Label(frame, text=f"Zayif havuzunda su an {n} kelime/kalip var.",
                 font=self.mono, fg=WHITE, bg=BG).pack(pady=10)
        tk.Button(frame, text="ANA MENU", font=self.mono_big, fg="black", bg=FG_MAIN,
                  relief="ridge", bd=6, command=self._build_main_menu).pack(pady=30)

    # ============================================================
    #  MODE 5: GUNLUK KALIPLAR (reuses flashcard engine, patterns pool)
    # ============================================================
    def _patterns_menu(self):
        self._clear()
        self._back_button(self, self._build_main_menu)
        frame = tk.Frame(self, bg=BG)
        frame.pack(expand=True, fill="both")
        tk.Label(frame, text="GUNLUK KALIPLAR", font=self.mono_title, fg=LEARN_COL,
                 bg=BG).pack(pady=(60, 30))
        n_all = len(self.all_patterns)
        n_weak = len(weak_pool.get_pool_items(self.all_patterns))
        tk.Button(frame, text=f"TUM KALIPLAR  [{n_all}]", font=self.mono, fg="black",
                  bg=LEARN_COL, relief="ridge", bd=4, width=28,
                  command=lambda: self._start_patterns("mixed")).pack(pady=8)
        tk.Button(frame, text=f"ZAYIF HAVUZ (KALIPLAR)  [{n_weak}]", font=self.mono,
                  fg="black" if n_weak else FG_DIM, bg=LEARN_COL if n_weak else PANEL_BG,
                  relief="ridge", bd=4, width=28, state="normal" if n_weak else "disabled",
                  command=lambda: self._start_patterns("weak")).pack(pady=8)

    def _start_patterns(self, category):
        pool = self._pool_by_category(category, source="patterns")
        random.shuffle(pool)
        self._fc_queue = pool
        self._fc_index = 0
        self._fc_source = "patterns"
        self._show_flashcard()

    # ============================================================
    #  MODE 2: TEST (multiple choice, close distractors, learn/skip)
    # ============================================================
    def _test_menu(self):
        self._category_select_screen("TEST MODU", self._start_test, source="words")

    def _start_test(self, category):
        pool = self._pool_by_category(category, source="words")
        random.shuffle(pool)
        self._q_queue = pool[:12]
        self._q_index = 0
        self._q_score = 0
        self._show_test_question()

    def _close_distractors(self, word, n=3):
        """Prefer distractors from the SAME category so options look/feel similar."""
        same_cat = [w for w in self.all_words if w["category"] == word["category"] and w["id"] != word["id"]]
        random.shuffle(same_cat)
        chosen = same_cat[:n]
        if len(chosen) < n:
            rest = [w for w in self.all_words if w["id"] != word["id"] and w not in chosen]
            random.shuffle(rest)
            chosen += rest[: n - len(chosen)]
        return chosen

    def _show_test_question(self):
        if self._q_index >= len(self._q_queue):
            self._quiz_summary_screen("TEST", self._q_score, len(self._q_queue), self._test_menu)
            return
        self._clear()
        self._back_button(self, self._build_main_menu)
        w = self._q_queue[self._q_index]
        distractors = self._close_distractors(w, 3)
        options = [(d["translation"], False) for d in distractors] + [(w["translation"], True)]
        random.shuffle(options)

        outer = tk.Frame(self, bg=BG)
        outer.pack(expand=True, fill="both", padx=24, pady=24)
        tk.Label(outer, text=f"SORU {self._q_index + 1}/{len(self._q_queue)}   SKOR {self._q_score}",
                 font=self.mono_s, fg=GOLD, bg=BG).pack(anchor="e")

        panel = tk.Frame(outer, bg=PANEL_BG, highlightbackground=HARD_COL, highlightthickness=3)
        panel.pack(expand=True, fill="both", pady=16)
        tk.Label(panel, text=f'"{w["term"]}" ne anlama gelir?', font=self.mono_big,
                 fg=FG_MAIN, bg=PANEL_BG, wraplength=650, justify="center").pack(pady=(30, 20))

        self._test_feedback = tk.Label(panel, text="", font=self.mono_s, fg=LEARN_COL,
                                        bg=PANEL_BG, wraplength=650, justify="left")

        btn_frame = tk.Frame(panel, bg=PANEL_BG)
        btn_frame.pack(pady=6)
        self._test_option_buttons = []
        for letter, (text, is_correct) in zip("ABCD", options):
            b = tk.Button(btn_frame, text=f"{letter}) {text}", font=self.mono_s, anchor="w",
                          fg=WHITE, bg=BTN_BG, relief="ridge", bd=3, width=52, justify="left",
                          command=lambda t=text, c=is_correct: self._answer_test(w, t, c))
            b.pack(pady=3)
            self._test_option_buttons.append(b)

        self._test_panel = panel
        self._test_word = w

    def _answer_test(self, w, chosen_text, is_correct):
        for b in self._test_option_buttons:
            b.config(state="disabled")
        self._test_feedback.pack(pady=(4, 10), padx=16)
        if is_correct:
            self._q_score += 1
            self._test_feedback.config(text="DOGRU!", fg=FG_MAIN)
            self.after(700, self._advance_test)
        else:
            self._test_feedback.config(
                text=f"YANLIS. Dogru cevap: {w['translation']}", fg=HARD_COL)
            action_frame = tk.Frame(self._test_panel, bg=PANEL_BG)
            action_frame.pack(pady=6)
            tk.Button(action_frame, text="OGREN", font=self.mono_s, fg="black", bg=LEARN_COL,
                      relief="ridge", bd=3,
                      command=lambda: self._test_feedback.config(
                          text=w.get("explanation", ""), fg=LEARN_COL)
                      ).pack(side="left", padx=6)
            tk.Button(action_frame, text="GEC (sonraki soru)", font=self.mono_s, fg="black",
                      bg=GOLD, relief="ridge", bd=3,
                      command=self._advance_test).pack(side="left", padx=6)

    def _advance_test(self):
        self._q_index += 1
        self._show_test_question()

    # ============================================================
    #  MODE 3: BOSLUK DOLDURMA (fill-in-the-blank)
    # ============================================================
    def _fillblank_menu(self):
        self._category_select_screen("BOSLUK DOLDURMA", self._start_fillblank, source="words")

    def _start_fillblank(self, category):
        pool = self._pool_by_category(category, source="words")
        random.shuffle(pool)
        self._q_queue = pool[:12]
        self._q_index = 0
        self._q_score = 0
        self._show_fillblank_question()

    def _show_fillblank_question(self):
        if self._q_index >= len(self._q_queue):
            self._quiz_summary_screen("BOSLUK DOLDURMA", self._q_score, len(self._q_queue), self._fillblank_menu)
            return
        self._clear()
        self._back_button(self, self._build_main_menu)
        w = self._q_queue[self._q_index]
        sentence = random.choice(w["sentences"])
        pattern = re.compile(re.escape(w["term"]), re.IGNORECASE)
        blanked = pattern.sub("_____", sentence, count=1)

        outer = tk.Frame(self, bg=BG)
        outer.pack(expand=True, fill="both", padx=24, pady=24)
        tk.Label(outer, text=f"SORU {self._q_index + 1}/{len(self._q_queue)}   SKOR {self._q_score}",
                 font=self.mono_s, fg=GOLD, bg=BG).pack(anchor="e")

        panel = tk.Frame(outer, bg=PANEL_BG, highlightbackground=EASY_COL, highlightthickness=3)
        panel.pack(expand=True, fill="both", pady=16)
        tk.Label(panel, text=blanked, font=self.mono_big, fg=FG_MAIN, bg=PANEL_BG,
                 wraplength=650, justify="center").pack(pady=(30, 20), padx=20)

        entry = tk.Entry(panel, font=self.mono, width=30, justify="center")
        entry.pack(pady=10)
        entry.focus_set()
        entry.bind("<Return>", lambda e: self._answer_fillblank(w, entry.get()))

        self._fb_feedback = tk.Label(panel, text="", font=self.mono_s, fg=LEARN_COL,
                                      bg=PANEL_BG, wraplength=650, justify="left")

        self._fb_check_btn = tk.Button(panel, text="KONTROL ET", font=self.mono, fg="black",
                                        bg=EASY_COL, relief="ridge", bd=4,
                                        command=lambda: self._answer_fillblank(w, entry.get()))
        self._fb_check_btn.pack(pady=10)

        self._fb_panel = panel
        self._fb_word = w

    def _answer_fillblank(self, w, typed):
        is_correct = typed.strip().lower() == w["term"].lower()
        self._fb_check_btn.config(state="disabled")
        self._fb_feedback.pack(pady=(4, 10), padx=16)
        if is_correct:
            self._q_score += 1
            self._fb_feedback.config(text="DOGRU!", fg=FG_MAIN)
            self.after(700, self._advance_fillblank)
        else:
            self._fb_feedback.config(text=f"YANLIS. Dogru kelime: \"{w['term']}\"", fg=HARD_COL)
            action_frame = tk.Frame(self._fb_panel, bg=PANEL_BG)
            action_frame.pack(pady=6)
            tk.Button(action_frame, text="OGREN", font=self.mono_s, fg="black", bg=LEARN_COL,
                      relief="ridge", bd=3,
                      command=lambda: self._fb_feedback.config(
                          text=w.get("explanation", ""), fg=LEARN_COL)
                      ).pack(side="left", padx=6)
            tk.Button(action_frame, text="GEC (sonraki soru)", font=self.mono_s, fg="black",
                      bg=GOLD, relief="ridge", bd=3,
                      command=self._advance_fillblank).pack(side="left", padx=6)

    def _advance_fillblank(self):
        self._q_index += 1
        self._show_fillblank_question()

    # ---- shared quiz summary for TEST / BOSLUK DOLDURMA ----
    def _quiz_summary_screen(self, mode_name, score, total, retry_command):
        self._clear()
        self._back_button(self, self._build_main_menu)
        frame = tk.Frame(self, bg=BG)
        frame.pack(expand=True, fill="both")
        tk.Label(frame, text=f"*** {mode_name} TAMAMLANDI ***", font=self.mono_title,
                 fg=GOLD, bg=BG).pack(pady=(70, 20))
        tk.Label(frame, text=f"SKOR: {score}/{total}", font=self.mono_big, fg=FG_MAIN,
                 bg=BG).pack(pady=10)
        tk.Button(frame, text="TEKRAR", font=self.mono, fg="black", bg=FG_MAIN,
                  relief="ridge", bd=4, command=retry_command).pack(pady=20)
        tk.Button(frame, text="ANA MENU", font=self.mono, fg=WHITE, bg=BTN_BG,
                  relief="ridge", bd=3, command=self._build_main_menu).pack()

    # ============================================================
    #  MODE 4: MEETING MODU
    # ============================================================
    def _meeting_list_screen(self):
        self._clear()
        self._back_button(self, self._build_main_menu)
        frame = tk.Frame(self, bg=BG)
        frame.pack(expand=True, fill="both")
        tk.Label(frame, text="MEETING MODU", font=self.mono_title, fg=GOLD, bg=BG).pack(pady=(30, 4))
        tk.Label(frame, text="Bir toplanti senaryosu sec:", font=self.mono_s, fg=WHITE,
                 bg=BG).pack(pady=(0, 10))

        canvas_frame = tk.Frame(frame, bg=BG)
        canvas_frame.pack(expand=True, fill="both", padx=20)
        canvas = tk.Canvas(canvas_frame, bg=BG, highlightthickness=0)
        scrollbar = tk.Scrollbar(canvas_frame, orient="vertical", command=canvas.yview)
        inner = tk.Frame(canvas, bg=BG)
        inner.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=inner, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        for m in self.all_meetings:
            tk.Button(inner, text=f"{m['title_tr']}  ({m['title_en']})", font=self.mono_s,
                      fg="black", bg=GOLD, relief="ridge", bd=3, width=58, anchor="w",
                      command=lambda mid=m["id"]: self._start_meeting(mid)).pack(pady=3, padx=4)

    def _start_meeting(self, meeting_id):
        meeting = next(m for m in self.all_meetings if m["id"] == meeting_id)
        self._meeting = meeting
        self._meeting_q_index = 0
        self._meeting_transcript = []  # list of (speaker_en, speaker_tr, answer_en, answer_tr)
        self._show_meeting_question()

    def _show_meeting_question(self):
        if self._meeting_q_index >= len(self._meeting["questions"]):
            self._meeting_transcript_screen()
            return
        self._clear()
        self._back_button(self, self._build_main_menu)
        q = self._meeting["questions"][self._meeting_q_index]

        outer = tk.Frame(self, bg=BG)
        outer.pack(expand=True, fill="both", padx=24, pady=24)
        tk.Label(outer, text=f"{self._meeting['title_tr']}  --  SORU {self._meeting_q_index + 1}/5",
                 font=self.mono_s, fg=GOLD, bg=BG).pack(anchor="w")

        panel = tk.Frame(outer, bg=PANEL_BG, highlightbackground=GOLD, highlightthickness=3)
        panel.pack(expand=True, fill="both", pady=14)

        role = self._meeting.get("speaker_role", "Client")
        tk.Label(panel, text=f"{role}:", font=self.mono_s, fg=HARD_COL, bg=PANEL_BG).pack(
            anchor="w", padx=20, pady=(18, 0))
        tk.Label(panel, text=q["prompt_en"], font=self.mono, fg=FG_MAIN, bg=PANEL_BG,
                 wraplength=660, justify="left", anchor="w").pack(anchor="w", padx=20)
        tk.Label(panel, text=q["prompt_tr"], font=self.mono_s, fg=FG_DIM, bg=PANEL_BG,
                 wraplength=660, justify="left", anchor="w").pack(anchor="w", padx=20, pady=(2, 14))

        options = list(q["options"])
        random.shuffle(options)
        self._meeting_feedback = tk.Label(panel, text="", font=self.mono_s, fg=LEARN_COL,
                                           bg=PANEL_BG, wraplength=660, justify="left")

        btn_frame = tk.Frame(panel, bg=PANEL_BG)
        btn_frame.pack(pady=4, padx=20, fill="x")
        self._meeting_option_buttons = []
        for letter, opt in zip("ABC", options):
            b = tk.Button(btn_frame, text=f"{letter}) {opt['text']}", font=self.mono_s,
                          anchor="w", fg=WHITE, bg=BTN_BG, relief="ridge", bd=3,
                          wraplength=640, justify="left",
                          command=lambda o=opt, q=q: self._answer_meeting(o, q))
            b.pack(fill="x", pady=3)
            self._meeting_option_buttons.append(b)

        self._meeting_panel = panel

    def _answer_meeting(self, option, q):
        for b in self._meeting_option_buttons:
            b.config(state="disabled")
        self._meeting_feedback.pack(pady=(6, 10), padx=20, anchor="w")
        if option["correct"]:
            self._meeting_feedback.config(text="DOGRU CEVAP! Sonraki soruya geciliyor...", fg=FG_MAIN)
            self._meeting_transcript.append(
                (q["prompt_en"], q["prompt_tr"], option["text"], option["note_tr"]))
            self.after(900, self._advance_meeting)
        else:
            self._meeting_feedback.config(text=option["note_tr"], fg=HARD_COL)
            action_frame = tk.Frame(self._meeting_panel, bg=PANEL_BG)
            action_frame.pack(pady=6, padx=20, anchor="w")
            tk.Button(action_frame, text="TEKRAR DENE", font=self.mono_s, fg="black",
                      bg=EASY_COL, relief="ridge", bd=3,
                      command=lambda: self._show_meeting_question()).pack(side="left", padx=6)

            def _skip():
                correct_opt = next(o for o in q["options"] if o["correct"])
                self._meeting_transcript.append(
                    (q["prompt_en"], q["prompt_tr"], correct_opt["text"], correct_opt["note_tr"]))
                self._advance_meeting()

            tk.Button(action_frame, text="GEC (cevabi goster)", font=self.mono_s, fg="black",
                      bg=GOLD, relief="ridge", bd=3, command=_skip).pack(side="left", padx=6)

    def _advance_meeting(self):
        self._meeting_q_index += 1
        self._show_meeting_question()

    def _meeting_transcript_screen(self):
        self._clear()
        self._back_button(self, self._build_main_menu)
        frame = tk.Frame(self, bg=BG)
        frame.pack(expand=True, fill="both", padx=20, pady=(50, 20))

        tk.Label(frame, text=f"TOPLANTI TAMAMLANDI: {self._meeting['title_tr']}",
                 font=self.mono, fg=GOLD, bg=BG, wraplength=700).pack(pady=(0, 10))

        text_frame = tk.Frame(frame, bg=BG)
        text_frame.pack(expand=True, fill="both")
        text = tk.Text(text_frame, font=self.mono_s, bg=PANEL_BG, fg=WHITE, wrap="word",
                        relief="flat", padx=14, pady=12)
        scroll = tk.Scrollbar(text_frame, command=text.yview)
        text.configure(yscrollcommand=scroll.set)
        text.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

        role = self._meeting.get("speaker_role", "Client")
        text.insert("end", f"=== {self._meeting['title_en']} / {self._meeting['title_tr']} ===\n\n")
        for i, (p_en, p_tr, a_en, a_tr) in enumerate(self._meeting_transcript, 1):
            text.insert("end", f"[{i}] {role}: {p_en}\n")
            text.insert("end", f"    ({p_tr})\n\n")
            text.insert("end", f"    SEN: {a_en}\n")
            text.insert("end", f"    ({a_tr})\n\n")
            text.insert("end", "-" * 60 + "\n\n")
        text.configure(state="disabled")

        tk.Button(frame, text="ANA MENU", font=self.mono_big, fg="black", bg=FG_MAIN,
                  relief="ridge", bd=6, command=self._build_main_menu).pack(pady=14)

    # ============================================================
    #  MODE 6: HIZLI TUR (bonus scored round, alternating hard/easy)
    # ============================================================
    def _start_hizli_tur(self):
        self.session_score = 0
        self.session_correct = 0
        self.session_wrong = 0
        self.streak = 0
        self.round_no = 0
        easy_pool = [w for w in self.all_words if w["category"] == "daily"]
        hard_pool = [w for w in self.all_words if w["category"] in ("engineering", "meeting")]
        self._ht_easy = easy_pool
        self._ht_hard = hard_pool
        self._next_ht_question()

    def _next_ht_question(self):
        self.round_no += 1
        if self.round_no > ROUNDS_PER_SESSION:
            self._ht_summary()
            return
        self.current_is_hard = (self.round_no % 2 == 1)
        pool = self._ht_hard if self.current_is_hard else self._ht_easy
        self.current_word = random.choice(pool)
        self._build_ht_screen()

    def _build_ht_screen(self):
        self._clear()
        self._back_button(self, self._build_main_menu)
        w = self.current_word
        is_hard = self.current_is_hard
        accent = HARD_COL if is_hard else EASY_COL
        label = "HARD" if is_hard else "EASY"

        outer = tk.Frame(self, bg=BG)
        outer.pack(expand=True, fill="both", padx=20, pady=20)
        top = tk.Frame(outer, bg=BG)
        top.pack(fill="x")
        tk.Label(top, text=f"ROUND {self.round_no}/{ROUNDS_PER_SESSION}", font=self.mono,
                 fg=WHITE, bg=BG).pack(side="left")
        tk.Label(top, text=f"* {label}", font=self.mono, fg=accent, bg=BG).pack(side="left", padx=20)
        tk.Label(top, text=f"SCORE {self.session_score:04d}   STREAK x{self.streak}",
                 font=self.mono, fg=GOLD, bg=BG).pack(side="right")

        panel = tk.Frame(outer, bg=PANEL_BG, highlightbackground=accent, highlightthickness=3)
        panel.pack(expand=True, fill="both", pady=20)

        if is_hard:
            sentence = random.choice(w["sentences"])
            pattern = re.compile(re.escape(w["term"]), re.IGNORECASE)
            blanked = pattern.sub("_______", sentence, count=1)
            question_text = blanked
            others = [x for x in self.all_words if x["id"] != w["id"]]
            random.shuffle(others)
            options = [x["term"] for x in others[:4]] + [w["term"]]
            self.current_correct_answer = w["term"]
        else:
            question_text = f'What does "{w["term"]}" mean?'
            others = [x for x in self.all_words if x["id"] != w["id"]]
            random.shuffle(others)
            options = [x["translation"] for x in others[:3]] + [w["translation"]]
            self.current_correct_answer = w["translation"]

        random.shuffle(options)
        tk.Label(panel, text=question_text, font=self.mono_big, fg=FG_MAIN, bg=PANEL_BG,
                 wraplength=600, justify="center").pack(pady=(40, 30), padx=20)

        btn_frame = tk.Frame(panel, bg=PANEL_BG)
        btn_frame.pack(pady=10)
        letters = "ABCDE" if is_hard else "ABCD"
        for letter, opt in zip(letters, options):
            b = tk.Button(btn_frame, text=f"{letter})  {opt}", font=self.mono, anchor="w",
                          fg=WHITE, bg=BTN_BG, activebackground=accent,
                          relief="ridge", bd=3, width=44, justify="left",
                          command=lambda o=opt: self._answer_ht(o))
            b.pack(pady=4)

        self.feedback_label = tk.Label(outer, text=" ", font=self.mono_big, bg=BG)
        self.feedback_label.pack(pady=10)

    def _answer_ht(self, chosen):
        correct = chosen == self.current_correct_answer
        if correct:
            self.session_correct += 1
            self.streak += 1
            gained = 10 + (2 * self.streak if self.current_is_hard else self.streak)
            self.session_score += gained
            self.progress["total_correct"] = self.progress.get("total_correct", 0) + 1
            self.progress["best_streak"] = max(self.progress.get("best_streak", 0), self.streak)
            self.feedback_label.config(text=f"CORRECT! +{gained}", fg=FG_MAIN)
        else:
            self.session_wrong += 1
            self.streak = 0
            self.progress["total_wrong"] = self.progress.get("total_wrong", 0) + 1
            self.feedback_label.config(
                text=f"WRONG -- correct answer: {self.current_correct_answer}", fg=HARD_COL)
        srs.save_progress(self.progress)
        self.after(1100, self._next_ht_question)

    def _ht_summary(self):
        self.progress["sessions"] = self.progress.get("sessions", 0) + 1
        srs.save_progress(self.progress)
        self._clear()
        self._back_button(self, self._build_main_menu)
        frame = tk.Frame(self, bg=BG)
        frame.pack(expand=True, fill="both")
        tk.Label(frame, text="*** HIZLI TUR TAMAMLANDI ***", font=self.mono_title,
                 fg=GOLD, bg=BG).pack(pady=(60, 20))
        total = self.session_correct + self.session_wrong
        acc = round(100 * self.session_correct / total) if total else 0
        for line in [
            f"SKOR: {self.session_score}",
            f"DOGRU / YANLIS: {self.session_correct} / {self.session_wrong}",
            f"ISABET: {acc}%",
        ]:
            tk.Label(frame, text=line, font=self.mono_big, fg=FG_MAIN, bg=BG).pack(pady=5)
        tk.Button(frame, text="TEKRAR", font=self.mono_big, fg="black", bg=FG_MAIN,
                  relief="ridge", bd=6, command=self._start_hizli_tur).pack(pady=20)
        tk.Button(frame, text="ANA MENU", font=self.mono, fg=WHITE, bg=BTN_BG,
                  relief="ridge", bd=3, command=self._build_main_menu).pack()


if __name__ == "__main__":
    app = RetroTrainer()
    app.mainloop()
