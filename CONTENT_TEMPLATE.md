# İçerik Ekleme Formatı

Bu dosya, uygulamaya yeni kelime / kalıp / toplantı senaryosu eklemek için
kullanılacak şablonu tanımlar. Başka bir arayüzde (örn. başka bir AI sohbeti,
kendi notların) bu formatlara uygun içerik hazırlayıp Claude Code'a
yapıştırdığında, `data/words.json`, `data/patterns.json` veya
`data/meetings.json` içine eklenir ve `docs/data/` klasörüne senkronize edilir
(uygulamanın canlı GitHub Pages sürümü `docs/` klasöründen okunuyor).

Kısmi gönderim tamamen serbest — sadece kelime, sadece kalıp veya sadece
toplantı senaryosu da gönderebilirsin, hepsini birden göndermek zorunda değilsin.

## 1) Kelime (words.json) formatı

Kategoriler: `engineering` (mühendislik & boru hattı), `meeting` (toplantı
İngilizcesi), `daily` (günlük hayat). Yeni bir kategori de tanımlanabilir —
sadece adını söyle, ekranlarda otomatik görünmesi için Türkçe etiketini
ekleyeceğim.

```json
{
  "category": "engineering",
  "term": "İngilizce terim",
  "pronunciation": "okunuşu (örn: PRESH-er drop)",
  "translation": "Türkçe karşılığı",
  "sentences": [
    "Example sentence 1.",
    "Example sentence 2.",
    "Example sentence 3.",
    "Example sentence 4.",
    "Example sentence 5."
  ],
  "translations": [
    "Cümle 1 Türkçe çevirisi.",
    "Cümle 2 Türkçe çevirisi.",
    "Cümle 3 Türkçe çevirisi.",
    "Cümle 4 Türkçe çevirisi.",
    "Cümle 5 Türkçe çevirisi."
  ],
  "explanation": "Terimin anlamı ve cümle yapısı hakkında kısa Türkçe açıklama."
}
```

Kurallar:
- `id` alanı **gerekmiyor** — kategoriye göre sıradaki numarayı ben otomatik
  atıyorum (mühendislik → `eng`, toplantı → `mtg`, günlük → `day`).
- Aynı `term` zaten varsa (örn. tekrar "pressure drop" gönderirsen) yeni bir
  kart oluşturmam; gönderdiğin ek örnek cümleleri mevcut kartın üzerine
  otomatik eklerim. Yani aynı kelime için daha fazla pratik cümlesi
  göndermek de tamamen bu formatla, tekrar tekrar yapılabilir.
- `sentences` ve `translations` **aynı sırada, aynı uzunlukta** olmalı (1.
  cümlenin çevirisi 1. sırada vb.). 5 cümle idealdir, 3-6 arası kabul edilir.
- `term` sözlük/mastar hali olabilir ("to give someone a hand" gibi) — örnek
  cümlelerde çekimli haliyle geçmesi sorun değil, boşluk doldurma motoru bunu
  otomatik eşleştiriyor. Kısaltmalı terimlerde ("Finite Element Analysis
  (FEA)" gibi) parantez içindeki kısaltmayı da yazmayı unutma — cümlelerde
  sadece kısaltma geçse bile eşleşmeyi otomatik yapıyorum.

## 2) Günlük kalıp (patterns.json) formatı

Kategori yok, tek liste. Aynı alanlar (yine `id` gerekmiyor, `category` de yok):

```json
{
  "term": "Kalıp (İngilizce)",
  "pronunciation": "okunuşu",
  "translation": "Türkçe karşılığı",
  "explanation": "Kalıbın kullanım açıklaması + yapı notu",
  "sentences": ["...", "...", "...", "...", "..."],
  "translations": ["...", "...", "...", "...", "..."]
}
```

## 3) Toplantı senaryosu (meetings.json) formatı

`id` yine gerekmiyor. Her senaryoda **tam 5
soru**, her soruda **3 şık** (1 doğru + 2 yanlış), her şıkkın İngilizce metni
+ Türkçe çevirisi + (yanlışsa) neden yanlış olduğunu açıklayan not olmalı.

```json
{
  "title_tr": "Senaryo başlığı (Türkçe)",
  "title_en": "Scenario title (English)",
  "speaker_role": "Client / Vendor / Interviewer / HSE Manager ...",
  "questions": [
    {
      "prompt_en": "English question from the other side.",
      "prompt_tr": "Sorunun Türkçesi.",
      "options": [
        {"text": "Correct professional response.", "text_tr": "Türkçesi.", "correct": true, "note_tr": "Neden doğru olduğu."},
        {"text": "Wrong response 1.", "text_tr": "Türkçesi.", "correct": false, "note_tr": "Neden yanlış olduğu."},
        {"text": "Wrong response 2.", "text_tr": "Türkçesi.", "correct": false, "note_tr": "Neden yanlış olduğu."}
      ]
    }
  ]
}
```
(Yukarıdaki `questions` dizisinde toplam 5 soru olmalı — kısalık için 1 tanesi gösterildi.)

## Gönderim

Bu formatlardan istediğin kadarını doldurup mesaj olarak yapıştır — JSON
geçerliliğini kontrol eder, mevcut verilerle birleştirir, `data/` ve
`docs/data/` klasörlerini güncellerim. Değişiklikleri GitHub'a göndermek
(`git push`) için son onayı senden alırım.
