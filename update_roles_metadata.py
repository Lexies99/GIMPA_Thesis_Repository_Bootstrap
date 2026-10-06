import sqlite3

conn = sqlite3.connect('d:/NSS/GIMPA_Thesis_Repository_Bootstrap/gimpa_thesis.db')
c = conn.cursor()
c.execute("UPDATE users SET school = 'GIMPA Business School' WHERE email IN ('dean@gimpa.edu.gh', 'eadaku@gimpa.edu.gh')")
c.execute("UPDATE users SET school = 'School of Technology and Social Sciences (SOTSS)' WHERE email = 'kofi.mensah@gimpa.edu.gh'")
c.execute("UPDATE users SET school = 'School of Technology and Social Sciences (SOTSS)', department = 'Computer Science' WHERE email IN ('kwame.boadu@adj.gimpa.edu.gh', 'yaw.asante@gimpa.edu.gh')")
conn.commit()
print("Local DB updated:", c.execute("SELECT email, role, school, department FROM users WHERE role IN ('dean', 'hod', 'project_coordinator')").fetchall())
conn.close()
