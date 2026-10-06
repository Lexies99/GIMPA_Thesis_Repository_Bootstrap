import os, glob, shutil
from PIL import Image

media_dir = r'C:\Users\15406\.gemini\antigravity-ide\brain\c17f9551-ed51-4756-98c8-a4ec77876fc6\.tempmediaStorage'
dest_dir = r'd:\NSS\GIMPA_Thesis_Repository_Bootstrap\presentation_assets\screens'
os.makedirs(dest_dir, exist_ok=True)

# Select key representative high-res screenshots
# We can copy specific well-known screenshots to descriptive names
selections = {
    "public_catalog.png": "media_1790195935778.png", # Public Catalog
    "search_discovery.png": "media_1790198124276.png", # Search & Discovery
    "login_screen.png": "media_1790200090288.png", # Login Screen
    "student_dashboard.png": "media_1790197541688.png", # Student Dashboard
    "phd_hub_dossiers.png": "media_1790200323920.png", # PhD Hub Dossiers
    "phd_supervision_logs.png": "media_1790200664568.png", # PhD Supervision Logs
    "approval_workflow.png": "media_1790199578271.png", # Examiner / Supervisor Approval
    "admin_management.png": "media_1790200781291.png", # Administration Management
    "document_comments.png": "media_1790197376662.png", # Document Comments / ONLYOFFICE
    "bulk_csv_import.png": "media_1790200851558.png", # Bulk CSV Import
}

for name, src in selections.items():
    src_path = os.path.join(media_dir, src)
    if os.path.exists(src_path):
        shutil.copy(src_path, os.path.join(dest_dir, name))
        print(f"Copied {src} -> {name}")
    else:
        print(f"Not found: {src}")

print("Screenshot assets prepared!")
