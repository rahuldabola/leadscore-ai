# Video Walkthrough Script (~90 seconds)

Covers both the "2-minute design rationale" ask (Section 1.3) and the "1-2 minute video
walkthrough" submission requirement (Section 2) in one recording.

**How to record on Windows:** Win+G opens Xbox Game Bar (built-in screen recorder), or use
Loom/OBS. Start the server (`npm start`), open `http://localhost:3000`, then record.

---

**[0:00–0:15] Hook + business framing**
"SaaSquatch Leads finds and exports B2B leads and has an 'AI Company Scoring' feature — but
it's a black box. Reps see a number, not why. I built LeadScore AI: an explainable scoring
and outreach layer that sits on top of any lead export."

**[0:15–0:40] Live demo — import & clean**
- Click "Import leads" → "Load sample dataset" → Import.
- Point at the result line: "X new leads imported, Y duplicates auto-removed, Z flagged for
  bad emails." *"It dedupes by email or by name+domain, and validates contact info on the
  way in — the reference tool doesn't show you that at all."*

**[0:40–1:05] Live demo — scoring & tuning**
- Sort by score, click a hot lead to open the detail panel. *"Every score breaks down into
  four weighted factors — industry match, company size fit, seniority, data completeness —
  so a rep can see exactly why a lead ranks where it does."*
- Open "Scoring rules," tweak a weight or the target industries, save. *"This isn't a fixed
  algorithm — sales ops can tune it to their actual ICP, and everything re-scores instantly."*

**[1:05–1:20] Live demo — action**
- Click "Generate outreach draft" on a lead. *"One click turns a scored lead into a
  personalized first-touch email."*
- Click "Export CSV." *"And the prioritized list exports straight into whatever CRM they're
  already using."*

**[1:20–1:30] Close — stack + rationale**
"Built with Node/Express and SQLite, zero external AI API cost since the scoring is
transparent and rule-based rather than a model call. Full architecture and production
deployment plan — including the Postgres/AWS path for scaling this past a single-tenant
demo — are in the README. This was the highest-leverage feature I could ship well in five
hours: not a wider clone, but a piece the original tool is missing entirely."

---

**Recording checklist**
- [ ] Server running, sample data loaded before you hit record (or show the import live — both work, importing live is a stronger demo)
- [ ] Zoom browser to ~110% so table text reads clearly on screen recording
- [ ] Keep under 2 minutes total
- [ ] Export as MP4, filename: `LeadScoreAI_Walkthrough_[YourName].mp4`
