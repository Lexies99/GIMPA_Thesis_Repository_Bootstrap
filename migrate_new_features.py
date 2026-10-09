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

    # 4. institutions table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS institutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # 5. departments table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            hod_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            dean_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute("PRAGMA table_info(departments)")
    dept_cols = {c[1] for c in cur.fetchall()}
    if "hod_user_id" not in dept_cols:
        cur.execute("ALTER TABLE departments ADD COLUMN hod_user_id INTEGER NULL")
    if "dean_user_id" not in dept_cols:
        cur.execute("ALTER TABLE departments ADD COLUMN dean_user_id INTEGER NULL")

    # 6. department_supervisors table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS department_supervisors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
            supervisor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_dept_supervisor UNIQUE (department_id, supervisor_user_id)
        )
        """
    )

    # 7. Seed GIMPA institutions and departments
    GIMPA_DATA = {
        "GIMPA Business School": [
            "Accounting and Finance",
            "Business Management",
            "Management Science",
        ],
        "School of Public Service and Governance": [
            "Development Policy",
            "Public Management & International Relations",
        ],
        "Faculty of Law": [
            "Law",
        ],
        "School of Technology and Social Sciences (SOTSS)": [
            "Computer Science and Information Systems",
            "Economics and Applied Mathematics",
            "Liberal Arts and Hospitality Studies",
        ],
    }

    for school_name, dept_names in GIMPA_DATA.items():
        cur.execute("SELECT id FROM institutions WHERE name = ?", (school_name,))
        row = cur.fetchone()
        if not row:
            cur.execute("INSERT INTO institutions (name) VALUES (?)", (school_name,))
            inst_id = cur.lastrowid
        else:
            inst_id = row[0]

        for dept_name in dept_names:
            cur.execute("SELECT id FROM departments WHERE institution_id = ? AND name = ?", (inst_id, dept_name))
            if not cur.fetchone():
                cur.execute("INSERT INTO departments (institution_id, name) VALUES (?, ?)", (inst_id, dept_name))

    # 8. Auto-link deans from users table
    cur.execute("SELECT id, school FROM users WHERE role = 'dean'")
    deans = cur.fetchall()
    for dean_id, school in deans:
        if school:
            cur.execute("SELECT id FROM institutions WHERE LOWER(name) LIKE ? OR ? LIKE ('%' || LOWER(name) || '%')", (f"%{school.lower().strip()}%", school.lower().strip()))
            inst_rows = cur.fetchall()
            for (inst_id,) in inst_rows:
                cur.execute("UPDATE departments SET dean_user_id = ? WHERE institution_id = ?", (dean_id, inst_id))

    conn.commit()
    conn.close()
    print("Migration finished successfully.")

if __name__ == "__main__":
    for p in [
        "gimpa_thesis.db",
        "/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db",
        "/home/admin/web/thesis.manamatechnologies.com/public_html/gimpa_thesis.db"
    ]:
        migrate_db(p)
