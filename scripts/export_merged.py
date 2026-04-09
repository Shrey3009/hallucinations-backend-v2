import os, csv
from collections import defaultdict
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()
DB_NAME = "hallucinations_v2"

def main():
    uri = os.environ.get("MONGO_URI")
    if not uri:
        print("Missing MONGO_URI")
        return

    cx = MongoClient(uri)
    db = cx[DB_NAME]

    # ----- Patent lookup -----
    patents = {}
    for p in db.patents.find():
        patents[str(p["_id"])] = {
            "name": p.get("patentName", ""),
            "category": p.get("category", "")
        }

    # ----- Index collections by preSurveyId -----
    selections = {str(d["preSurveyId"]): d for d in db.patentselections.find()}
    posts = {str(d["preSurveyId"]): d for d in db.postsurveys.find()}
    
    aut_baseline = defaultdict(list)
    for d in db.auts.find():
        aut_baseline[str(d["preSurveyId"])].append(d)
        
    aut_gpt = defaultdict(list)
    for d in db.aut_gpts.find():
        aut_gpt[str(d["preSurveyId"])].append(d)
        
    chats = defaultdict(list)
    for d in db.chatmessages.find():
        chats[str(d["preSurveyId"])].append(d)
        
    task_posts = defaultdict(list)
    for d in db.taskpostsurveys.find():
        task_posts[str(d["preSurveyId"])].append(d)

    # ----- Rows -----
    rows = []

    for pre in db.presurveys.find():
        pid = str(pre["_id"])
        
        # 1. Demographics & Configuration
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

        # Process Tasks 1 and 2
        for t in (1, 2):
            pat_id = str(sel.get(f"task{t}Patent", ""))
            pat = patents.get(pat_id, {})
            
            row[f"task{t}PatentName"] = pat.get("name", "")
            row[f"task{t}PatentCategory"] = pat.get("category", "")
            row[f"task{t}Level"] = sel.get(f"task{t}Level", "")
            
            # Figure out if this task was baseline or ai
            seq = row["taskSequence"]
            if seq == "baseline_first":
                is_ai = (t == 2)
            elif seq == "ai_first":
                is_ai = (t == 1)
            else:
                is_ai = False
                
            row[f"task{t}Type"] = "ai" if is_ai else "baseline"

            # ---------------- IDEAS ----------------
            if is_ai:
                # Get the latest AUT_gpt entry for this task
                task_gpt_entries = [d for d in aut_gpt.get(pid, []) if d.get("task") == t]
                if task_gpt_entries:
                    # Sort by round or creation date to get final payload
                    task_gpt_entries.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
                    latest = task_gpt_entries[0]
                    ideas = latest.get("generatedIdeas", [])
                    row[f"task{t}_ideasRound1"] = " | ".join(ideas) if isinstance(ideas, list) else str(ideas)
                    row[f"task{t}_selectedIdea"] = latest.get("selectedIdea", "")
                    row[f"task{t}_refinedIdea"] = latest.get("refinedIdea", "")
            else:
                # Baseline
                b_entries = aut_baseline.get(pid, [])
                if b_entries:
                    # Baseline usually only has one entry per user
                    latest = b_entries[-1]
                    ideas = latest.get("generatedIdeas", [])
                    row[f"task{t}_ideasRound1"] = " | ".join(ideas) if isinstance(ideas, list) else str(ideas)
                    row[f"task{t}_selectedIdea"] = latest.get("selectedIdea", "")
                    row[f"task{t}_refinedIdea"] = latest.get("refinedIdea", "")

            # ---------------- CHATS ----------------
            if is_ai:
                p1_user_msgs, p1_gpt_msgs = [], []
                p3_user_msgs, p3_gpt_msgs = [], []
                for doc in chats.get(pid, []):
                    if doc.get("task") == t:
                        r = doc.get("round")
                        for m in doc.get("chatMessages", []):
                            msg_text = str(m.get("message", m.get("text", "")))
                            is_user = (m.get("sender") == "user" or m.get("direction") == "outgoing")
                            if r == 1:
                                p1_user_msgs.append(msg_text) if is_user else p1_gpt_msgs.append(msg_text)
                            elif r == 3:
                                p3_user_msgs.append(msg_text) if is_user else p3_gpt_msgs.append(msg_text)

                row[f"task{t}Phase1UserChatCount"] = len(p1_user_msgs)
                row[f"task{t}Phase1UserChatMessages"] = " | ".join(p1_user_msgs)
                row[f"task{t}Phase1GPTChatCount"] = len(p1_gpt_msgs)
                row[f"task{t}Phase1GPTChatMessages"] = " | ".join(p1_gpt_msgs)
                
                row[f"task{t}Phase3UserChatCount"] = len(p3_user_msgs)
                row[f"task{t}Phase3UserChatMessages"] = " | ".join(p3_user_msgs)
                row[f"task{t}Phase3GPTChatCount"] = len(p3_gpt_msgs)
                row[f"task{t}Phase3GPTChatMessages"] = " | ".join(p3_gpt_msgs)
            else:
                row[f"task{t}Phase1UserChatCount"] = 0
                row[f"task{t}Phase1UserChatMessages"] = ""
                row[f"task{t}Phase1GPTChatCount"] = 0
                row[f"task{t}Phase1GPTChatMessages"] = ""
                row[f"task{t}Phase3UserChatCount"] = 0
                row[f"task{t}Phase3UserChatMessages"] = ""
                row[f"task{t}Phase3GPTChatCount"] = 0
                row[f"task{t}Phase3GPTChatMessages"] = ""

            # ---------------- TASK POST SURVEY ----------------
            tpost = next((d for d in task_posts.get(pid, []) if d.get("taskNumber") == t), {})
            row[f"task{t}Familiarity"] = tpost.get("familiarity", "")
            row[f"task{t}Difficulty"] = tpost.get("difficulty", "")
            row[f"task{t}AIExpansion"] = tpost.get("aiPhase1Expansion", "")
            row[f"task{t}AIRefinement"] = tpost.get("aiPhase3Refinement", "")
            row[f"task{t}AIHelpfulness"] = tpost.get("aiPhaseHelpfulness", "")
            row[f"task{t}AIGroundedness"] = tpost.get("aiSuggestionsGroundedness", "")

        # ---- Final PostSurvey ----
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

    # ----- Ordered Fieldnames -----
    fieldnames = [
        "preSurveyId", "surveyCode", "presurveyDate",
        "age", "gender", "race", "experience", "designExperience",
        "taskSequence", "overallLevel"
    ]

    for t in (1, 2):
        fieldnames.extend([
            f"task{t}Type", f"task{t}PatentCategory", f"task{t}PatentName", f"task{t}Level",
            f"task{t}Phase1UserChatCount", f"task{t}Phase1UserChatMessages",
            f"task{t}Phase1GPTChatCount", f"task{t}Phase1GPTChatMessages",
            f"task{t}Phase3UserChatCount", f"task{t}Phase3UserChatMessages",
            f"task{t}Phase3GPTChatCount", f"task{t}Phase3GPTChatMessages",
            f"task{t}Familiarity", f"task{t}Difficulty",
            f"task{t}AIExpansion", f"task{t}AIRefinement", f"task{t}AIHelpfulness", f"task{t}AIGroundedness",
        ])

    fieldnames.extend([
        "accuracy", "helpfulness", "inspiration", "expansion", "recombination", "problems", "improvements"
    ])

    # Ensure all fieldnames exist in all rows
    clean_rows = []
    for r in rows:
        clean_row = {fn: r.get(fn, "") for fn in fieldnames}
        clean_rows.append(clean_row)

    # ----- Write CSV -----
    with open("consolidated.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for cr in clean_rows:
            w.writerow(cr)

if __name__ == "__main__":
    main()
