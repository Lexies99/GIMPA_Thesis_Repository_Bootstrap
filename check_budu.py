import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=30)

remote_code = """
import sqlite3
conn = sqlite3.connect('/home/admin/web/thesis.manamatechnologies.com/app/gimpa_thesis.db')
cur = conn.cursor()

# Find Joseph Budu user ID
cur.execute("SELECT id, email, full_name, role, department, school FROM users WHERE email LIKE '%josbudu%' OR full_name LIKE '%Budu%'")
budu = cur.fetchall()
print('Joseph Budu User Record:', budu)

if budu:
    budu_id = budu[0][0]
    # Check papers where supervisor_id = budu_id
    cur.execute("SELECT id, title, publication_type, created_by_id, supervisor_id FROM papers WHERE supervisor_id = ?", (budu_id,))
    print('Supervised Papers:', cur.fetchall())

    # Check supervision logs
    cur.execute("SELECT id, student_id, supervisor_id, research_stage, meeting_date FROM phd_supervision_logs WHERE supervisor_id = ?", (budu_id,))
    print('Supervision Logs:', cur.fetchall())

    # Check teaching requirements
    cur.execute("SELECT id, student_id, supervising_faculty_id FROM phd_teaching_requirements WHERE supervising_faculty_id = ?", (budu_id,))
    print('Teaching Requirements:', cur.fetchall())

    # Check progress evaluations
    cur.execute("SELECT id, student_id, evaluator_id FROM phd_progress_evaluations WHERE evaluator_id = ?", (budu_id,))
    print('Progress Evaluations:', cur.fetchall())

    # Check GBS faculty
    cur.execute('''
        SELECT id, email, full_name, role, department, school 
        FROM users 
        WHERE school LIKE '%Business%' AND role IN ('lecturer', 'project_supervisor', 'dean', 'hod')
    ''')
    print('\\nGIMPA Business School Faculty:')
    for f in cur.fetchall():
        print(' ', f)
"""


sftp = client.open_sftp()
with sftp.file('/tmp/check_budu.py', 'w') as f:
    f.write(remote_code)
sftp.close()

stdin, stdout, stderr = client.exec_command('python3 /tmp/check_budu.py')
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
client.close()
