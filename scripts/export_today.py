import os, csv, base64, subprocess
from collections import defaultdict
from datetime import datetime, timedelta, time
from zoneinfo import ZoneInfo

from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From, Attachment, FileContent, FileName, FileType, Disposition

# ------------------ CONFIG ------------------
load_dotenv()

DB_NAME = "test"

MONGO_URI = os.environ.get("MONGO_URI")
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
EMAIL_FROM = os.environ.get("EMAIL_FROM")                 
EMAIL_TO = [e.strip() for e in os.environ.get("EMAIL_TO", "").split(",") if e.strip()] 

LOG_FILE = "export_today.log"

# ------------------ HELPERS ------------------
def log(msg: str):
    """Log to console and append to export_today.log with timestamp."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except:
        pass


def _est_bounds_today():
    """Return (start_utc, end_utc, date_label) for today in EST, converted to UTC."""
    est = ZoneInfo("America/New_York")
    today_est = datetime.now(est).date()
    start_est = datetime.combine(today_est, time.min, tzinfo=est)
    end_est = start_est + timedelta(days=1)
    return start_est.astimezone(ZoneInfo("UTC")), end_est.astimezone(ZoneInfo("UTC")), today_est.strftime("%Y-%m-%d")


def _master_fieldnames():
    fieldnames = [
        "preSurveyId", "surveyCode", "presurveyDate",
        "age", "gender", "race", "experience", "designExperience",
        "taskSequence", "overallLevel"
    ]

    for t in (1, 2):
        fieldnames.extend([
            f"task{t}Type", f"task{t}PatentCategory", f"task{t}PatentName", f"task{t}Level",
            f"task{t}_ideasRound1", f"task{t}_selectedIdea", f"task{t}_refinedIdea",
            f"task{t}UserChatCount", f"task{t}UserChatMessages",
            f"task{t}GPTChatCount", f"task{t}GPTChatMessages",
            f"task{t}Familiarity", f"task{t}Difficulty",
            f"task{t}AIExpansion", f"task{t}AIRefinement", f"task{t}AIHelpfulness", f"task{t}AIGroundedness",
        ])

    fieldnames.extend([
        "accuracy", "helpfulness", "inspiration", "expansion", "recombination", "problems", "improvements"
    ])
    return fieldnames


# ------------------ CORE EXPORT ------------------
def export_today_csv(db):
    start_utc, end_utc, date_lbl = _est_bounds_today()

    todays_presurveys = list(db.presurveys.find({
        "createdAt": {"$gte": start_utc, "$lt": end_utc}
    }))

    if not todays_presurveys:
        return None, date_lbl, 0

    presurvey_ids = [ps["_id"] for ps in todays_presurveys]

    patents = {}
    for p in db.patents.find({}, {"_id": 1, "patentName": 1, "category": 1}):
        patents[str(p["_id"])] = {"name": p.get("patentName", ""), "category": p.get("category", "")}

    selections = {str(d["preSurveyId"]): d for d in db.patentselections.find({"preSurveyId": {"$in": presurvey_ids}})}
    posts = {str(d["preSurveyId"]): d for d in db.postsurveys.find({"preSurveyId": {"$in": presurvey_ids}})}

    aut_baseline = defaultdict(list)
    for d in db.auts.find({"preSurveyId": {"$in": presurvey_ids}}):
        aut_baseline[str(d["preSurveyId"])].append(d)

    aut_gpt = defaultdict(list)
    for d in db.aut_gpts.find({"preSurveyId": {"$in": presurvey_ids}}):
        aut_gpt[str(d["preSurveyId"])].append(d)

    chats = defaultdict(list)
    for d in db.chatmessages.find({"preSurveyId": {"$in": presurvey_ids}}):
        chats[str(d["preSurveyId"])].append(d)
        
    task_posts = defaultdict(list)
    for d in db.taskpostsurveys.find({"preSurveyId": {"$in": presurvey_ids}}):
        task_posts[str(d["preSurveyId"])].append(d)

    rows = []
    
    for pre in todays_presurveys:
        pid = str(pre["_id"])
        
        row = {
            "preSurveyId": pid, 
            "presurveyDate": str(pre.get("createdAt", "")),
            "surveyCode": pre.get("surveyCode", ""),
            "age": pre.get("age", ""),
            "gender": pre.get("gender", ""),
            "race": pre.get("race", ""),
            "experience": pre.get("experience", ""),
            "designExperience": pre.get("designExperience", "")
        }

        sel = selections.get(pid, {})
        row["taskSequence"] = sel.get("taskSequence", "")
        row["overallLevel"] = sel.get("level", "")

        for t in (1, 2):
            pat_id = str(sel.get(f"task{t}Patent", ""))
            pat = patents.get(pat_id, {})
            
            row[f"task{t}PatentName"] = pat.get("name", "")
            row[f"task{t}PatentCategory"] = pat.get("category", "")
            row[f"task{t}Level"] = sel.get(f"task{t}Level", "")
            
            seq = row["taskSequence"]
            if seq == "baseline_first":
                is_ai = (t == 2)
            elif seq == "ai_first":
                is_ai = (t == 1)
            else:
                is_ai = False
                
            row[f"task{t}Type"] = "ai" if is_ai else "baseline"

            if is_ai:
                task_gpt_entries = [d for d in aut_gpt.get(pid, []) if d.get("task") == t]
                if task_gpt_entries:
                    task_gpt_entries.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
                    latest = task_gpt_entries[0]
                    ideas = latest.get("generatedIdeas", [])
                    row[f"task{t}_ideasRound1"] = " | ".join(ideas) if isinstance(ideas, list) else str(ideas)
                    row[f"task{t}_selectedIdea"] = latest.get("selectedIdea", "")
                    row[f"task{t}_refinedIdea"] = latest.get("refinedIdea", "")
            else:
                b_entries = aut_baseline.get(pid, [])
                if b_entries:
                    latest = b_entries[-1]
                    ideas = latest.get("generatedIdeas", [])
                    row[f"task{t}_ideasRound1"] = " | ".join(ideas) if isinstance(ideas, list) else str(ideas)
                    row[f"task{t}_selectedIdea"] = latest.get("selectedIdea", "")
                    row[f"task{t}_refinedIdea"] = latest.get("refinedIdea", "")

            if is_ai:
                user_msgs, gpt_msgs = [], []
                for doc in chats.get(pid, []):
                    if doc.get("task") == t:
                        for m in doc.get("chatMessages", []):
                            if m.get("sender") == "user" or m.get("direction") == "outgoing":
                                user_msgs.append(m.get("message", m.get("text", "")))
                            else:
                                gpt_msgs.append(m.get("message", m.get("text", "")))

                row[f"task{t}UserChatCount"] = len(user_msgs)
                row[f"task{t}UserChatMessages"] = " | ".join([str(msg) for msg in user_msgs])
                row[f"task{t}GPTChatCount"] = len(gpt_msgs)
                row[f"task{t}GPTChatMessages"] = " | ".join([str(msg) for msg in gpt_msgs])
            else:
                row[f"task{t}UserChatCount"] = 0
                row[f"task{t}UserChatMessages"] = ""
                row[f"task{t}GPTChatCount"] = 0
                row[f"task{t}GPTChatMessages"] = ""

            tpost = next((d for d in task_posts.get(pid, []) if d.get("taskNumber") == t), {})
            row[f"task{t}Familiarity"] = tpost.get("familiarity", "")
            row[f"task{t}Difficulty"] = tpost.get("difficulty", "")
            row[f"task{t}AIExpansion"] = tpost.get("aiPhase1Expansion", "")
            row[f"task{t}AIRefinement"] = tpost.get("aiPhase3Refinement", "")
            row[f"task{t}AIHelpfulness"] = tpost.get("aiPhaseHelpfulness", "")
            row[f"task{t}AIGroundedness"] = tpost.get("aiSuggestionsGroundedness", "")

        post = posts.get(pid, {})
        row.update({
            "accuracy": post.get("accuracy", ""),
            "helpfulness": post.get("helpfulness", ""),
            "inspiration": post.get("inspiration", ""),
            "expansion": post.get("expansion", ""),
            "recombination": post.get("recombination", ""),
            "problems": post.get("problems", ""),
            "improvements": post.get("improvements", "")
        })

        rows.append(row)

    fieldnames = _master_fieldnames()
    clean_rows = []
    for r in rows:
        clean_row = {fn: r.get(fn, "") for fn in fieldnames}
        clean_rows.append(clean_row)

    filename = f"consolidated_{date_lbl}.csv"
    with open(filename, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for cr in clean_rows:
            w.writerow(cr)

    return filename, date_lbl, len(rows)


# ------------------ EMAIL ------------------
def _send_with_attachments(filenames, date_lbl):
    if not EMAIL_FROM or not SENDGRID_API_KEY:
        log("Missing EMAIL_FROM or SENDGRID_API_KEY. Skipping email send.")
        return
        
    msg = Mail(
        from_email=From(EMAIL_FROM, "Daily Exports"),
        to_emails=EMAIL_TO,
        subject=f"Daily Consolidated CSV ({date_lbl})",
        plain_text_content="Attached are today's CSV and the full consolidated CSV."
    )

    attachments = []
    for fname in filenames:
        with open(fname, "rb") as f:
            data = f.read()
        encoded = base64.b64encode(data).decode()
        attachments.append(
            Attachment(
                FileContent(encoded),
                FileName(os.path.basename(fname)),
                FileType("text/csv"),
                Disposition("attachment"),
            )
        )
    msg.attachment = attachments
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(msg)
    except Exception as e:
        log(f"SendGrid Error: {str(e)}")

def _send_no_data(date_lbl):
    if not EMAIL_FROM or not SENDGRID_API_KEY:
        return
        
    msg = Mail(
        from_email=From(EMAIL_FROM, "Study Admin"),
        to_emails=EMAIL_TO,
        subject=f"Daily Consolidated CSV \u2013 No Data ({date_lbl})",
        plain_text_content="No new data was found today."
    )
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(msg)
    except Exception as e:
        log(f"SendGrid Error: {str(e)}")


# ------------------ RUN ------------------
if __name__ == "__main__":
    if not MONGO_URI:
        log("Missing MONGO_URI")
        exit(1)
        
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    filename, date_lbl, n = export_today_csv(db)
    if n > 0 and filename:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        merged_script = os.path.join(script_dir, "export_merged.py")
        
        try:
            subprocess.run(["python", merged_script], check=True)
            full_file = "consolidated.csv"
            
            _send_with_attachments([filename, full_file], date_lbl)
            log(f"Exported {n} rows for {date_lbl} -> {filename}")
            log(f"Attached full dataset: {full_file}")
            log(f"Sent to: {', '.join(EMAIL_TO)}")
        except subprocess.CalledProcessError as e:
            log(f"Failed to run export_merged.py: {e}")
    else:
        _send_no_data(date_lbl)
        log(f"No data for {date_lbl}. Email sent to: {', '.join(EMAIL_TO)}")
