# Homie — תוכנית ליצירת סיורי וידאו באורך 25–40 שניות

## 1. המטרה

Homie תהפוך אוסף תמונות של נכס לסיור וידאו מוכן לפרסום, בלי שהמשתמש יצטרך לכתוב פרומפט. המשתמש יבחר נכס, טמפלייט ואורך; המערכת תבחר תמונות, תבנה מסלול, תיצור מספר שוטים ב-AI, תחבר אותם, ותציג גרסה לאישור.

האורכים הראשונים:

- **Quick Tour — 25s**: שלושה או ארבעה שוטים, מתאים ל-Story ולמודעות קצרות.
- **Signature Tour — 30s**: ארבעה או חמישה שוטים, ברירת המחדל ל-Reels ו-TikTok.
- **Full Walkthrough — 40s**: חמישה או שישה שוטים, מתאים לנכס עשיר בתמונות ול-Zillow.

## 2. העיקרון החשוב ביותר

לא מבקשים ממודל וידאו ליצור סרטון רציף של 25–40 שניות בפרומפט אחד. בונים את הסרטון כצירוף של שוטים קצרים, שכל אחד מהם מתאר מעבר אחד ברור:

```text
Listing photos
  → photo analysis and room classification
  → route planning
  → shot plan
  → AI clip generation
  → quality checks
  → editing and branding
  → user approval
  → export
```

כל שוט צריך לכלול:

- תפקיד בסיפור: Hook, Arrival, Interior, Feature, Lifestyle או Closing.
- תמונת התחלה.
- תמונת סיום, כאשר המודל תומך בכך.
- תמונות ייחוס נוספות רק כאשר הן עוזרות לשמור על המבנה.
- תנועת מצלמה אחת מרכזית.
- משך מדויק.
- כללי שימור: גאומטריה, ריהוט, פתחים, תאורה ומפלסים.

## 3. סט הכלים המומלץ

### 3.1 יצירת וידאו — Higgsfield

נשתמש בשכבת Adapter פנימית ב-Homie, כדי שהמוצר לא יהיה תלוי בשם מודל מסוים.

המודלים הראשונים:

- **Seedance 2.0**: הבחירה המועדפת ל-multi-shot, מספר תמונות ייחוס, Start/End Frame, ויצוא עד 1080p/4K. דורש תוכנית Higgsfield מתאימה.
- **Kling 3.0**: בחירה טובה לשוטים קצרים ונקיים עם Start/End Frame. מתאים לבדיקות ולשוטים עם תנועה אחת ברורה.
- **Seedance 2.5**: שימוש עתידי לעריכה והמשכיות בעזרת reference arrays; מוגבל ל-720p ולכן אינו ברירת המחדל ליצוא איכותי.

בשלב הפיתוח נשתמש ב-Higgsfield CLI. לפני Production צריך לאשר מול Higgsfield גישה מסחרית ל-API, מגבלות שימוש, Webhooks, קצב בקשות ותמחור.

### 3.2 ניתוח וסידור תמונות

שכבת Vision תבצע:

- זיהוי סוג החדר.
- Interior/Exterior/Aerial.
- הערכת איכות, חדות וחשיפה.
- זיהוי תמונות כפולות.
- זיהוי Watermarks וטקסטים מיותרים.
- הערכת כיוון צילום ופתחים אפשריים.
- דירוג Hero Image ו-Money Shots.

ל-MVP אפשר להתחיל בחוקים ובתיוג ידני למחצה. לאחר מכן נוסיף מודל Vision שמחזיר JSON מובנה לכל תמונה.

### 3.3 תכנון המסלול

Route Planner יקבל את התמונות המסווגות ויבנה מסלול סביר:

```text
Street/front exterior
→ entrance
→ foyer/stairs
→ living room
→ kitchen/dining
→ primary bedroom
→ backyard/pool
→ aerial or hero closing
```

המערכת לא תמציא מעבר בין שני חדרים שאין ביניהם קשר חזותי. כאשר חסרות תמונות מעבר, נשתמש ב-Cut או Dissolve במקום ב-FPV מעבר-דרך-דלת.

### 3.4 הרכבה ועריכה

ל-MVP: **FFmpeg** בצד השרת.

תפקידים:

- חיבור הקליפים.
- Cross-dissolve קצר במקומות שבהם אין המשכיות טבעית.
- התאמת משך.
- Normalize של frame rate, codec ורזולוציה.
- מוזיקה, Ducking ו-Fade.
- לוגו Homie, כתובת, מחיר ו-CTA.
- יצוא `9:16`, `16:9` ו-`1:1`.

בעתיד אפשר להשתמש ב-Remotion כאשר נרצה טקסטים ואנימציות מורכבות שמוגדרים כ-React components. מנוע ה-AI יוצר את הווידאו; FFmpeg/Remotion אחראי על העריכה והמיתוג.

### 3.5 Backend ונתונים

- **Supabase Auth**: משתמשים וצוותים.
- **Postgres**: נכסים, תמונות, טמפלייטים, גרסאות פרומפט, פרויקטים, שוטים ומשימות יצירה.
- **Supabase Storage**: תמונות מקור, קליפים, Thumbnails ויצוא סופי.
- **Supabase Realtime**: עדכון UI בזמן יצירה.
- **Worker/Queue**: הגשת משימות ל-Higgsfield, Polling, Retry והרכבה. אין להחזיק בקשת דפדפן פתוחה במשך כל זמן היצירה.

## 4. מבנה טמפלייט

טמפלייט אינו רק סרטון דוגמה. הוא מתכון גרסאי.

```json
{
  "slug": "signature-luxury-walkthrough",
  "name": "Signature Luxury Walkthrough",
  "duration": 30,
  "format": "9:16",
  "minPhotos": 8,
  "recommendedPhotos": 14,
  "musicMood": "modern-luxury",
  "shots": [
    {
      "role": "arrival",
      "duration": 6,
      "startType": "front_exterior",
      "endType": "entrance_or_foyer",
      "motion": "stable_push_in"
    },
    {
      "role": "interior_reveal",
      "duration": 7,
      "startType": "foyer",
      "endType": "living_room",
      "motion": "smooth_forward_glide"
    }
  ]
}
```

יש לשמור בנפרד:

- Template metadata.
- Shot definitions.
- Prompt version.
- Model configuration.
- Example video URL.
- Thumbnail URL.
- QA score וסטטוס פרסום.

כך נוכל לשפר פרומפט בלי לשבור פרויקטים ישנים, לבצע A/B testing ולהחליף מודל בעתיד.

## 5. שפת הפרומפטים

### 5.1 Base prompt קבוע

כל טמפלייט יקבל Base Prompt קצר, עד כ-200 tokens, המתאר תנועה ולא מתאר מחדש את התמונה:

```text
Polished cinematic real-estate walkthrough. Smooth controlled camera movement,
stable level horizon, realistic architectural geometry, consistent furniture and
openings, natural spatial continuity, warm balanced light, tack-sharp luxury-listing
cinematography. Finish on a composed hero frame.
```

### 5.2 Shot prompt

לכל שוט מוסיפים רק את הפעולה:

```text
Begin with a slow push toward the front entrance. Pass naturally through the
doorway into the foyer, easing to a stop as the staircase is revealed.
```

### 5.3 כללים

- תנועת מצלמה אחת או שתיים בלבד בכל שוט.
- ניסוח חיובי: `stable horizon`, `realistic geometry`, `tack sharp`.
- לא להעמיס רשימות של חדרים על קליפ אחד.
- להגדיר במפורש נקודת סיום.
- לשמור Prompt Version לכל יצירה.

## 6. הטמפלייטים הראשונים שניצור

### A. Signature Luxury Walkthrough — 30s

- 6s Front exterior → entrance.
- 6s Foyer → stairs.
- 7s Living room → dining.
- 5s Primary bedroom reveal.
- 6s Pool/backyard hero closing.

אופי: רגוע, יוקרתי, תנועה חלקה, מוזיקה מודרנית מינימלית.

### B. Golden Hour Lifestyle — 25s

- 5s Exterior hook.
- 6s Living/fireplace reveal.
- 6s Pool and deck.
- 5s Fire pit at sunset.
- 3s Aerial closing with address.

אופי: רגשי, חם ומהיר יותר; מתאים ל-Reels.

### C. Architectural Flow — 40s

- 7s Front facade.
- 7s Entry and staircase.
- 7s Upstairs landing.
- 7s Living room and view.
- 6s Bedroom.
- 6s Rear exterior and pool.

אופי: מדויק ואדריכלי, מינימום טקסט, מתאים לנכס גדול.

### D. Social Fast Tour — 25s

- 1.5–3s לכל Beat.
- שילוב AI motion עם Cuts מהירים.
- כותרות קצרות: `Designer interior`, `Private pool`, `Sunset views`.

אופי: אנרגטי; פחות FPV רציף ויותר עריכה קצבית.

## 7. תהליך יצירת דוגמה

לכל טמפלייט:

1. בוחרים סט תמונות אחד קבוע כנכס Benchmark.
2. מסדרים את התמונות ידנית לפי מסלול אמיתי.
3. מייצרים Shot Plan.
4. מריצים כל שוט בנפרד ב-Higgsfield.
5. שומרים כל Job, מודל, הגדרות ו-Prompt Version.
6. מדרגים כל שוט.
7. מייצרים מחדש רק שוטים שנכשלו.
8. מחברים את הקליפים ומוסיפים מיתוג.
9. צופים בסרטון מלא במובייל ובדסקטופ.
10. מאשרים ומפרסמים ל-Explore.

## 8. בקרת איכות

כל שוט יקבל ציון 0–100:

- **Architecture preservation — 30%**: קירות, חלונות, דלתות ומפלסים.
- **Continuity — 20%**: התאמה בין Start/End ובין שוטים סמוכים.
- **Camera quality — 20%**: יציבות, מהירות ואופק.
- **Visual quality — 15%**: חדות, תאורה וארטיפקטים.
- **Story value — 10%**: האם השוט מקדם את הסיור.
- **Brand safety — 5%**: ללא טקסטים מומצאים או Watermarks חדשים.

כללי פרסום:

- שוט מתחת ל-75 נפסל.
- סרטון עם שוט שנכשל בגאומטריה אינו מתפרסם.
- כל דוגמת Explore דורשת צפייה ואישור אנושי.

## 9. UX ב-Homie

### יצירת סרטון

1. המשתמש בוחר Listing.
2. Homie מציגה את התמונות שנבחרו ואת סדר המסלול.
3. המשתמש בוחר Template.
4. המשתמש בוחר 25, 30 או 40 שניות.
5. Homie מציגה הערכת Credits לפני יצירה.
6. המשתמש לוחץ Generate.
7. מסך התקדמות מציג: Planning → Generating shots → Editing → Ready for review.
8. המשתמש מאשר, מוריד או מבקש גרסה אחרת.

### Explore

כל כרטיס יציג:

- Preview video אמיתי שמתנגן ב-Hover/לחיצה.
- שם וסגנון.
- משך ופורמט.
- מספר תמונות מינימלי.
- עלות Credits משוערת.
- Favorite.
- `Use template`.

בדף פרטי הטמפלייט יוצגו Shot Timeline, תמונות נדרשות ודוגמת סרטון מלאה.

## 10. מודל הנתונים המוצע

טבלאות חדשות/מורחבות:

- `video_templates`: metadata, preview, thumbnail, duration, format, status.
- `template_versions`: model, base prompt, model params, version, published_at.
- `template_shots`: order, role, duration, start/end photo types, motion prompt.
- `video_projects`: selected template version, target duration, state.
- `video_project_shots`: selected photos, prompt snapshot, provider job ID, output URL, QA state.
- `media_assets`: storage path, kind, duration, dimensions and ownership.
- `generation_events`: status history, error category and retry count.

Provider job IDs נשמרים רק בצד השרת. מפתחות Higgsfield לעולם אינם נשלחים לדפדפן.

## 11. אמינות ועלויות

- Retry רק לשוט שנכשל, לא לכל הסרטון.
- Idempotency key לכל Shot Generation.
- הגבלת ניסיונות אוטומטיים.
- שמירת Prompt ו-Params מדויקים לצורך שחזור.
- יצירת Preview ב-720p; יצוא איכותי רק לאחר אישור המשתמש.
- Cache לתוצאה כאשר אותם Inputs והגדרות כבר נוצרו.
- הצגת Credits לפני Generate והחזר אוטומטי על Job שנכשל טכנית.

## 12. שלבי הביצוע

### Phase 1 — Benchmark ידני

- ליצור את ארבעת הטמפלייטים על סט תמונות הבית שסופק.
- לבדוק Kling 3.0 מול Seedance 2.0 כאשר התוכנית מאפשרת.
- למדוד הצלחה לכל סוג מעבר.
- לבחור את שלושת הטמפלייטים הטובים ביותר.

### Phase 2 — Template Engine

- להוסיף Template Versions ו-Shot Definitions למסד.
- לבנות Route Planner ראשוני מבוסס חוקים.
- לבנות Higgsfield Adapter ו-Job state machine.
- להוסיף FFmpeg assembly.

### Phase 3 — Product UX

- מסך בחירת תמונות וסידור מסלול.
- מסך התקדמות בזמן יצירה.
- Review, Regenerate shot, Approve ו-Download.
- Preview videos בעמוד Explore.

### Phase 4 — Automation and scale

- Vision classification אוטומטי.
- QA אוטומטי עם אישור אנושי לדוגמאות ציבוריות.
- Queue, retries, rate limits ו-observability.
- A/B testing של Prompt Versions ו-Thumbnails.

## 13. סדר הפעולות המיידי

1. לשדרג/לאפשר תוכנית Higgsfield שתומכת ב-Seedance 2.0, או לאשר Kling 3.0 כמודל Benchmark ראשון.
2. ליצור חמישה שוטים ל-`Signature Luxury Walkthrough` מהתמונות שסופקו.
3. לחבר גרסת 30 שניות ולבצע QA.
4. לחזור על התהליך ל-`Golden Hour Lifestyle` ול-`Architectural Flow`.
5. לבחור שלוש דוגמאות מאושרות.
6. להעלות את הסרטונים וה-Thumbnails ל-Storage.
7. להוסיף את הטמפלייטים ל-Supabase ולהציג אותם ב-Explore.

