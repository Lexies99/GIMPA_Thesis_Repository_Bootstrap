import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('presentation_assets', exist_ok=True)
plt.rcParams['font.family'] = 'DejaVu Sans'

def draw_stick_figure(ax, x, y, name, color='#1E3F6D', scale=1.0):
    head = patches.Circle((x, y + 0.38 * scale), 0.13 * scale, facecolor='#FFFFFF', edgecolor=color, linewidth=2.2, zorder=5)
    ax.add_patch(head)
    ax.plot([x, x], [y + 0.25 * scale, y - 0.15 * scale], color=color, lw=2.4, zorder=5)
    ax.plot([x - 0.24 * scale, x + 0.24 * scale], [y + 0.12 * scale, y + 0.12 * scale], color=color, lw=2.4, zorder=5)
    ax.plot([x, x - 0.20 * scale], [y - 0.15 * scale, y - 0.48 * scale], color=color, lw=2.4, zorder=5)
    ax.plot([x, x + 0.20 * scale], [y - 0.15 * scale, y - 0.48 * scale], color=color, lw=2.4, zorder=5)
    ax.text(x, y - 0.72 * scale, name, fontsize=10, fontweight='bold', ha='center', va='top', 
            color=color, zorder=6, linespacing=1.1)

def draw_usecase_oval(ax, x, y, text, w=2.8, h=0.85, bg='#FFFFFF', border='#2A528A', text_color='#1E293B', font_size=9):
    oval = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.15,rounding_size=0.4",
                                 facecolor=bg, edgecolor=border, linewidth=1.8, zorder=4)
    ax.add_patch(oval)
    ax.text(x, y, text, fontsize=font_size, fontweight='bold', ha='center', va='center', 
            color=text_color, zorder=6, linespacing=1.2, multialignment='center')

def create_master_clean_usecase():
    fig, ax = plt.subplots(figsize=(18, 11), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')
    
    # Title Banner
    ax.text(9, 10.5, "GIMPA Thesis Repository — Master System Use Case Model", 
            fontsize=20, fontweight='bold', ha='center', va='center', color='#1E3F6D')
    ax.text(9, 10.1, "Standard UML 2.5 Use Case Diagram with Role Associations & System Boundary", 
            fontsize=12.5, style='italic', ha='center', va='center', color='#64748B')
    
    # System Boundary Box
    sys_box = patches.FancyBboxPatch((3.2, 0.4), 11.6, 9.4, boxstyle="square,pad=0.2", 
                                     edgecolor='#1E3F6D', facecolor='#FFFFFF', linewidth=2.5, linestyle='-')
    ax.add_patch(sys_box)
    
    header_tab = patches.Rectangle((3.2, 9.35), 6.5, 0.45, facecolor='#1E3F6D', edgecolor='none', zorder=3)
    ax.add_patch(header_tab)
    ax.text(3.4, 9.57, "System: GIMPA Thesis & Research Management Platform", 
            fontsize=11, fontweight='bold', ha='left', va='center', color='#FFFFFF', zorder=5)

    # Left Actors
    draw_stick_figure(ax, 1.4, 8.5, "Student /\nCandidate", color='#1E40AF', scale=1.0)
    draw_stick_figure(ax, 1.4, 6.0, "Project\nSupervisor", color='#6D28D9', scale=1.0)
    draw_stick_figure(ax, 1.4, 3.5, "Internal / External\nExaminer", color='#B45309', scale=1.0)
    draw_stick_figure(ax, 1.4, 1.2, "PhD Candidate\n(Doctoral Track)", color='#047857', scale=1.0)

    # Right Actors
    draw_stick_figure(ax, 16.6, 8.5, "Head of Dept.\n(HOD) / Coordinator", color='#B91C1C', scale=1.0)
    draw_stick_figure(ax, 16.6, 6.0, "Dean of\nFaculty", color='#4338CA', scale=1.0)
    draw_stick_figure(ax, 16.6, 3.5, "University\nLibrarian", color='#0E7490', scale=1.0)
    draw_stick_figure(ax, 16.6, 1.2, "System\nAdministrator", color='#334155', scale=1.0)

    # Use Cases (Clean spacing)
    # Row 1 (Y = 8.4)
    draw_usecase_oval(ax, 5.3, 8.4, "Submit Research\nProposal & Draft", w=2.7, h=0.75, bg='#EFF6FF', border='#1D4ED8', text_color='#1E40AF')
    draw_usecase_oval(ax, 9.0, 8.4, "Live In-App\nONLYOFFICE Editing", w=2.7, h=0.75, bg='#F5F3FF', border='#6D28D9', text_color='#5B21B6')
    draw_usecase_oval(ax, 12.7, 8.4, "Assign Internal &\nExternal Examiners", w=2.7, h=0.75, bg='#FEF2F2', border='#DC2626', text_color='#991B1B')

    # Row 2 (Y = 6.6)
    draw_usecase_oval(ax, 5.3, 6.6, "Track 6-Phase\nLifecycle Status", w=2.7, h=0.75, bg='#EFF6FF', border='#1D4ED8', text_color='#1E40AF')
    draw_usecase_oval(ax, 9.0, 6.6, "Annotate Document &\nInsert Margin Comments", w=2.7, h=0.75, bg='#F5F3FF', border='#6D28D9', text_color='#5B21B6')
    draw_usecase_oval(ax, 12.7, 6.6, "Schedule Defense &\nCompute Final Marks", w=2.7, h=0.75, bg='#FEF2F2', border='#DC2626', text_color='#991B1B')

    # Row 3 (Y = 4.8)
    draw_usecase_oval(ax, 5.3, 4.8, "Evaluate Thesis &\nSubmit Rubric Score", w=2.7, h=0.75, bg='#FFFBEB', border='#D97706', text_color='#92400E')
    draw_usecase_oval(ax, 9.0, 4.8, "Dual Sign-off &\nFaculty Clearance", w=2.7, h=0.75, bg='#EEF2FF', border='#4F46E5', text_color='#3730A3')
    draw_usecase_oval(ax, 12.7, 4.8, "Browse Public Catalog\n& Filter by Faculty", w=2.7, h=0.75, bg='#ECFEFF', border='#0891B2', text_color='#155E75')

    # Row 4 (Y = 3.0)
    draw_usecase_oval(ax, 5.3, 3.0, "Submit Post-Defense\nRevised Thesis", w=2.7, h=0.75, bg='#EFF6FF', border='#1D4ED8', text_color='#1E40AF')
    draw_usecase_oval(ax, 9.0, 3.0, "Curate, Embargo &\nPublish to Repository", w=2.7, h=0.75, bg='#ECFEFF', border='#0891B2', text_color='#155E75')
    draw_usecase_oval(ax, 12.7, 3.0, "Bulk CSV Student &\nStaff Onboarding", w=2.7, h=0.75, bg='#F8FAFC', border='#475569', text_color='#1E293B')

    # Row 5 (Y = 1.2)
    draw_usecase_oval(ax, 5.3, 1.2, "12-Stage Doctoral\nProgress Tracking", w=2.7, h=0.75, bg='#ECFDF5', border='#059669', text_color='#065F46')
    draw_usecase_oval(ax, 9.0, 1.2, "Log Supervision\nMeeting & Action Items", w=2.7, h=0.75, bg='#ECFDF5', border='#059669', text_color='#065F46')
    draw_usecase_oval(ax, 12.7, 1.2, "User Provisioning &\nBroadcast Engine", w=2.7, h=0.75, bg='#F8FAFC', border='#475569', text_color='#1E293B')

    def link(actor_pos, uc_pos, color='#94A3B8'):
        ax.plot([actor_pos[0], uc_pos[0]], [actor_pos[1], uc_pos[1]], color=color, lw=1.3, zorder=2)

    # Student
    link((1.7, 8.5), (3.9, 8.4), '#2563EB')
    link((1.7, 8.5), (3.9, 6.6), '#2563EB')
    link((1.7, 8.5), (7.6, 8.4), '#2563EB')
    link((1.7, 8.5), (3.9, 3.0), '#2563EB')

    # Supervisor
    link((1.7, 6.0), (7.6, 8.4), '#7C3AED')
    link((1.7, 6.0), (7.6, 6.6), '#7C3AED')
    link((1.7, 6.0), (7.6, 1.2), '#7C3AED')
    link((1.7, 6.0), (7.6, 4.8), '#7C3AED')

    # Examiner
    link((1.7, 3.5), (3.9, 4.8), '#D97706')
    link((1.7, 3.5), (7.6, 6.6), '#D97706')

    # PhD Candidate
    link((1.7, 1.2), (3.9, 1.2), '#059669')
    link((1.7, 1.2), (7.6, 1.2), '#059669')

    # HOD
    link((16.3, 8.5), (14.1, 8.4), '#DC2626')
    link((16.3, 8.5), (14.1, 6.6), '#DC2626')
    link((16.3, 8.5), (10.4, 4.8), '#DC2626')

    # Dean
    link((16.3, 6.0), (10.4, 4.8), '#4338CA')
    link((16.3, 6.0), (14.1, 4.8), '#4338CA')

    # Librarian
    link((16.3, 3.5), (14.1, 4.8), '#0891B2')
    link((16.3, 3.5), (10.4, 3.0), '#0891B2')

    # Admin
    link((16.3, 1.2), (14.1, 3.0), '#475569')
    link((16.3, 1.2), (14.1, 1.2), '#475569')

    ax.set_xlim(0, 18)
    ax.set_ylim(0, 11)
    ax.axis('off')
    
    plt.tight_layout()
    plt.savefig('presentation_assets/usecase_master_clean.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated usecase_master_clean.png")

def create_student_supervisor_usecase():
    fig, ax = plt.subplots(figsize=(16, 9.5), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')
    
    ax.text(8, 9.1, "UML Use Case Diagram: Student & Supervisor Lifecycle", 
            fontsize=18, fontweight='bold', ha='center', va='center', color='#1E3F6D')
    ax.text(8, 8.65, "Detailed Interactions: Proposal, In-App Word Supervision, and PhD Meeting Logs", 
            fontsize=11.5, style='italic', ha='center', va='center', color='#64748B')
    
    sys_box = patches.FancyBboxPatch((3.0, 0.5), 10.0, 7.8, boxstyle="square,pad=0.2", 
                                     edgecolor='#1E3F6D', facecolor='#FFFFFF', linewidth=2)
    ax.add_patch(sys_box)
    header_tab = patches.Rectangle((3.0, 7.85), 5.5, 0.45, facecolor='#1E3F6D', edgecolor='none', zorder=3)
    ax.add_patch(header_tab)
    ax.text(3.2, 8.07, "Sub-System: Student & Supervision Engine", 
            fontsize=10.5, fontweight='bold', ha='left', va='center', color='#FFFFFF', zorder=5)

    draw_stick_figure(ax, 1.4, 6.0, "Student /\nCandidate", color='#1E40AF', scale=1.1)
    draw_stick_figure(ax, 1.4, 2.2, "Project\nSupervisor", color='#6D28D9', scale=1.1)

    # Use cases
    draw_usecase_oval(ax, 5.5, 7.0, "UC-S1: Submit Research\nProposal & Draft", w=3.0, h=0.8, bg='#EFF6FF', border='#1D4ED8', text_color='#1E40AF')
    draw_usecase_oval(ax, 5.5, 5.2, "UC-S2: In-App ONLYOFFICE\nThesis Editing", w=3.0, h=0.8, bg='#F5F3FF', border='#6D28D9', text_color='#5B21B6')
    draw_usecase_oval(ax, 5.5, 3.4, "UC-S3: Submit Post-Defense\nCorrected Thesis", w=3.0, h=0.8, bg='#EFF6FF', border='#1D4ED8', text_color='#1E40AF')
    draw_usecase_oval(ax, 5.5, 1.6, "UC-S4: Log Supervision\nMeeting & Action Items", w=3.0, h=0.8, bg='#ECFDF5', border='#059669', text_color='#065F46')

    draw_usecase_oval(ax, 10.5, 7.0, "UC-SUP1: Supervise Candidate\n& Track Milestones", w=3.0, h=0.8, bg='#F5F3FF', border='#6D28D9', text_color='#5B21B6')
    draw_usecase_oval(ax, 10.5, 5.2, "UC-SUP2: In-Doc Annotations\n& Margin Comments", w=3.0, h=0.8, bg='#F5F3FF', border='#6D28D9', text_color='#5B21B6')
    draw_usecase_oval(ax, 10.5, 3.4, "UC-SUP3: Sign off on Defense\nReadiness & Corrections", w=3.0, h=0.8, bg='#EEF2FF', border='#4F46E5', text_color='#3730A3')
    draw_usecase_oval(ax, 10.5, 1.6, "UC-SUP4: Validate 12-Stage\nPhD Progress Logs", w=3.0, h=0.8, bg='#ECFDF5', border='#059669', text_color='#065F46')

    # Links
    def link(actor_pos, uc_pos, color='#94A3B8'):
        ax.plot([actor_pos[0], uc_pos[0]], [actor_pos[1], uc_pos[1]], color=color, lw=1.5, zorder=2)

    link((1.7, 6.0), (4.0, 7.0), '#2563EB')
    link((1.7, 6.0), (4.0, 5.2), '#2563EB')
    link((1.7, 6.0), (4.0, 3.4), '#2563EB')
    link((1.7, 6.0), (4.0, 1.6), '#2563EB')

    link((1.7, 2.2), (9.0, 7.0), '#7C3AED')
    link((1.7, 2.2), (9.0, 5.2), '#7C3AED')
    link((1.7, 2.2), (9.0, 3.4), '#7C3AED')
    link((1.7, 2.2), (9.0, 1.6), '#7C3AED')
    link((1.7, 2.2), (7.0, 5.2), '#7C3AED') # Supervisor to ONLYOFFICE

    # Include dependencies
    ax.annotate("<<include>>", xy=(5.5, 6.0), xytext=(5.5, 6.6),
                arrowprops=dict(arrowstyle="->", color="#6D28D9", lw=1.3, linestyle='dashed'),
                fontsize=8, fontweight='bold', color='#6D28D9', ha='center', va='center')

    ax.annotate("<<include>>", xy=(10.5, 6.0), xytext=(10.5, 6.6),
                arrowprops=dict(arrowstyle="->", color="#6D28D9", lw=1.3, linestyle='dashed'),
                fontsize=8, fontweight='bold', color='#6D28D9', ha='center', va='center')

    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9.8)
    ax.axis('off')
    
    plt.tight_layout()
    plt.savefig('presentation_assets/usecase_student_supervisor.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated usecase_student_supervisor.png")

create_master_clean_usecase()
create_student_supervisor_usecase()
