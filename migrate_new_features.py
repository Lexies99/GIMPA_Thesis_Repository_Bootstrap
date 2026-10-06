import sqlite3
import os

def migrate_db(db_path: str):
    if not os.path.exists(db_path):
        print(f"Skipping non-existent DB: {db_path}")
        return
    print(f"Migrating database: {db_path}")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. users table
    cur.execute("PRAGMA table_info(users)")
    user_cols = {c[1] for c in cur.fetchall()}
    
    if "specialization" not in user_cols:
        cur.execute("ALTER TABLE users ADD COLUMN specialization VARCHAR(500)")
        print("  Added specialization to users")
    if "research_interests" not in user_cols:
        cur.execute("ALTER TABLE users ADD COLUMN research_interests VARCHAR(1000)")
        print("  Added research_interests to users")
    if "max_student_ceiling" not in user_cols:
        cur.execute("ALTER TABLE users ADD COLUMN max_student_ceiling INTEGER NOT NULL DEFAULT 5")
        print("  Added max_student_ceiling to users")

    # 2. papers table
    cur.execute("PRAGMA table_info(papers)")
    paper_cols = {c[1] for c in cur.fetchall()}

    if "plagiarism_score" not in paper_cols:
        cur.execute("ALTER TABLE papers ADD COLUMN plagiarism_score FLOAT")
        print("  Added plagiarism_score to papers")
    if "plagiarism_status" not in paper_cols:
        cur.execute("ALTER TABLE papers ADD COLUMN plagiarism_status VARCHAR(32) NOT NULL DEFAULT 'pending'")
        print("  Added plagiarism_status to papers")
    if "plagiarism_report_json" not in paper_cols:
        cur.execute("ALTER TABLE papers ADD COLUMN plagiarism_report_json TEXT")
        print("  Added plagiarism_report_json to papers")
    if "plagiarism_checked_at" not in paper_cols:
        cur.execute("ALTER TABLE papers ADD COLUMN plagiarism_checked_at DATETIME")
        print("  Added plagiarism_checked_at to papers")

    # 3. theses table
    try:
        cur.execute("PRAGMA table_info(theses)")
        thesis_cols = {c[1] for c in cur.fetchall()}
        if "plagiarism_score" not in thesis_cols:
            cur.execute("ALTER TABLE theses ADD COLUMN plagiarism_score FLOAT")
            print("  Added plagiarism_score to theses")
        if "plagiarism_status" not in thesis_cols:
            cur.execute("ALTER TABLE theses ADD COLUMN plagiarism_status VARCHAR(32) NOT NULL DEFAULT 'pending'")
            print("  Added plagiarism_status to theses")
        if "plagiarism_report_json" not in thesis_cols:
            cur.execute("ALTER TABLE theses ADD COLUMN plagiarism_report_json TEXT")
            print("  Added plagiarism_report_json to theses")
        if "plagiarism_checked_at" not in thesis_cols:
            cur.execute("ALTER TABLE theses ADD COLUMN plagiarism_checked_at DATETIME")
            print("  Added plagiarism_checked_at to theses")
    except Exception as e:
        print("  theses table note:", e)

    conn.commit()
    conn.close()
    print("Migration finished successfully.")

if __name__ == "__main__":
    migrate_db("gimpa_thesis.db")
