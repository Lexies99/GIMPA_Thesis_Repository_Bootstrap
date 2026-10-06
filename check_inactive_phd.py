import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('46.62.214.146', port=22, username='root', password='ANCugiE4jL3q', timeout=30)
cmd = """
docker exec $(docker ps -q -f name=postgres) psql -U postgres -d thesis -c "
SELECT u.id, u.email, u.full_name, u.role, u.program, u.department, u.school,
  (SELECT MAX(meeting_date) FROM phd_supervision_logs WHERE student_id = u.id) as last_meeting
FROM users u
WHERE (lower(u.program) LIKE '%phd%' OR lower(u.program) LIKE '%doctor%' OR u.id IN (SELECT student_id FROM phd_supervision_logs))
  AND u.role IN ('student', 'member');
"
"""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8'))
client.close()
