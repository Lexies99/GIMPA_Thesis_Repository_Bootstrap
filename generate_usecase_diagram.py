import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('presentation_assets', exist_ok=True)
plt.rcParams['font.family'] = 'DejaVu Sans'

def create_master_usecase_diagram():
    fig, ax = plt.subplots(figsize=(16, 9.5), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')
    
    # Title Banner
    ax.text(8, 9.5, "GIMPA Thesis & Research Repository System — Master Role Use Case Architecture", 
            fontsize=17, fontweight='bold', ha='center', va='center', color='#1E3F6D')
    ax.text(8, 9.15, "Role-Based Interaction Matrix & Academic Lifecycle Boundary", 
            fontsize=11.5, style='italic', ha='center', va='center', color='#64748B')
    
    # System boundary box
    sys_box = patches.FancyBboxPatch((3.2, 0.4), 9.6, 8.4, boxstyle="round,pad=0.2", 
                                     edgecolor='#2A528A', facecolor='#FFFFFF', linewidth=2, linestyle='--')
    ax.add_patch(sys_box)
    ax.text(8, 8.55, "SYSTEM BOUNDARY: GIMPA Thesis & Research Management Platform", 
            fontsize=11, fontweight='bold', ha='center', color='#2A528A')

    # Roles (Left & Right)
    left_roles = [
        ("Student", 7.5, "#2563EB", "STU"),
        ("Supervisor", 5.5, "#7C3AED", "SUP"),
        ("Examiner\n(Internal / External)", 3.5, "#D97706", "EXM"),
        ("PhD Candidate", 1.5, "#059669", "PHD")
    ]
    
    right_roles = [
        ("HOD / Coordinator", 7.5, "#DC2626", "HOD"),
        ("Dean of Faculty", 5.5, "#4338CA", "DEAN"),
        ("Librarian", 3.5, "#0891B2", "LIB"),
        ("System Administrator", 1.5, "#334155", "ADM")
    ]
    
    for name, y, color, code in left_roles:
        circle = patches.Circle((1.5, y), 0.5, facecolor=color, edgecolor='#1E293B', linewidth=1.5, zorder=4)
        ax.add_patch(circle)
        ax.text(1.5, y, code, fontsize=11, fontweight='bold', ha='center', va='center', color='#FFFFFF', zorder=5)
        ax.text(1.5, y - 0.72, name, fontsize=10.5, fontweight='bold', ha='center', va='top', color='#1E293B')

    for name, y, color, code in right_roles:
        circle = patches.Circle((14.5, y), 0.5, facecolor=color, edgecolor='#1E293B', linewidth=1.5, zorder=4)
        ax.add_patch(circle)
        ax.text(14.5, y, code, fontsize=11, fontweight='bold', ha='center', va='center', color='#FFFFFF', zorder=5)
        ax.text(14.5, y - 0.72, name, fontsize=10.5, fontweight='bold', ha='center', va='top', color='#1E293B')

    # Use Cases (Ovals in center)
    use_cases = [
        ("UC1: Submit Proposal & Dissertation Files", 5.2, 7.8, 2.6, 0.62, "#EFF6FF", "#1D4ED8"),
        ("UC2: Live ONLYOFFICE Revision & Corrections", 8.0, 7.8, 2.6, 0.62, "#F5F3FF", "#6D28D9"),
        ("UC3: Supervise & Track 12-Stage Milestones", 10.8, 7.8, 2.6, 0.62, "#ECFDF5", "#047857"),
        
        ("UC4: Evaluate Thesis & Submit Rubric Score", 5.2, 6.2, 2.6, 0.62, "#FEF3C7", "#B45309"),
        ("UC5: Qualitative In-Doc Feedback Annotation", 8.0, 6.2, 2.6, 0.62, "#F5F3FF", "#6D28D9"),
        ("UC6: Assign Internal & External Examiners", 10.8, 6.2, 2.6, 0.62, "#FEE2E2", "#B91C1C"),
        
        ("UC7: Schedule Defense & Compute Final Marks", 5.2, 4.6, 2.6, 0.62, "#FEE2E2", "#B91C1C"),
        ("UC8: Dual Sign-off & Faculty Clearance", 8.0, 4.6, 2.6, 0.62, "#EEF2FF", "#3730A3"),
        ("UC9: Public Research Catalog & Search", 10.8, 4.6, 2.6, 0.62, "#E0F2FE", "#0369A1"),
        
        ("UC10: Archival, Embargo & Publishing", 5.2, 3.0, 2.6, 0.62, "#E0F2FE", "#0369A1"),
        ("UC11: Bulk Student/Staff CSV Onboarding", 8.0, 3.0, 2.6, 0.62, "#F1F5F9", "#334155"),
        ("UC12: System Diagnostics & Broadcast Engine", 10.8, 3.0, 2.6, 0.62, "#F1F5F9", "#334155"),
        
        ("UC13: 12-Stage PhD Dossier & Inactivity Alert", 8.0, 1.4, 3.2, 0.62, "#ECFDF5", "#047857"),
    ]
    
    for text, x, y, w, h, bg, border in use_cases:
        ellipse = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.15", 
                                         facecolor=bg, edgecolor=border, linewidth=1.5, zorder=3)
        ax.add_patch(ellipse)
        ax.text(x, y, text, fontsize=9, fontweight='bold', ha='center', va='center', color=border, zorder=5)

    # Connections
    lines = [
        ((1.5, 7.5), (3.9, 7.8)),
        ((1.5, 7.5), (6.7, 7.8)),
        ((1.5, 7.5), (9.5, 4.6)),
        ((1.5, 5.5), (6.7, 7.8)),
        ((1.5, 5.5), (9.5, 7.8)),
        ((1.5, 5.5), (6.7, 6.2)),
        ((1.5, 3.5), (3.9, 6.2)),
        ((1.5, 3.5), (6.7, 6.2)),
        ((1.5, 1.5), (6.4, 1.4)),
        ((1.5, 1.5), (9.5, 7.8)),
        ((14.5, 7.5), (12.1, 6.2)),
        ((14.5, 7.5), (6.5, 4.6)),
        ((14.5, 7.5), (9.3, 4.6)),
        ((14.5, 5.5), (9.3, 4.6)),
        ((14.5, 3.5), (12.1, 4.6)),
        ((14.5, 3.5), (6.5, 3.0)),
        ((14.5, 1.5), (9.3, 3.0)),
        ((14.5, 1.5), (12.1, 3.0)),
    ]
    
    for (x1, y1), (x2, y2) in lines:
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#94A3B8", lw=1.2, shrinkA=5, shrinkB=5), zorder=2)

    ax.set_xlim(0, 16)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    plt.tight_layout()
    plt.savefig('presentation_assets/usecase_master.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated usecase_master.png")

def create_phd_stages_diagram():
    fig, ax = plt.subplots(figsize=(16, 8.5), dpi=300)
    ax.set_facecolor('#F8FAFC')
    fig.patch.set_facecolor('#F8FAFC')
    
    ax.text(8, 8.0, "GIMPA PhD Hub — 12-Stage Doctoral Progression Framework", 
            fontsize=17, fontweight='bold', ha='center', va='center', color='#1E3F6D')
    ax.text(8, 7.55, "From Admission Concept Paper to Final Institutional Archival", 
            fontsize=11.5, style='italic', ha='center', va='center', color='#64748B')
    
    stages = [
        ("Stage 1", "Concept Paper\nApproval", "#2563EB", 1.2, 5.8),
        ("Stage 2", "Proposal\nDevelopment", "#2563EB", 3.4, 5.8),
        ("Stage 3", "Proposal\nDefense", "#7C3AED", 5.6, 5.8),
        ("Stage 4", "Ethical\nClearance", "#7C3AED", 7.8, 5.8),
        ("Stage 5", "Fieldwork &\nData Collection", "#059669", 10.0, 5.8),
        ("Stage 6", "1st Journal\nPublication", "#059669", 12.2, 5.8),
        
        ("Stage 7", "2nd Journal\nPublication", "#D97706", 1.2, 3.0),
        ("Stage 8", "3rd Journal\nPublication", "#D97706", 3.4, 3.0),
        ("Stage 9", "Draft Dissertation\nCompilation", "#DC2626", 5.6, 3.0),
        ("Stage 10", "Final Oral\nDefense (Viva)", "#DC2626", 7.8, 3.0),
        ("Stage 11", "Post-Defense\nRevisions", "#4338CA", 10.0, 3.0),
        ("Stage 12", "Final Archival &\nGraduation", "#0891B2", 12.2, 3.0),
    ]
    
    for stg_num, title, color, x, y in stages:
        box = patches.FancyBboxPatch((x-0.9, y-0.9), 1.8, 1.8, boxstyle="round,pad=0.1",
                                     facecolor='#FFFFFF', edgecolor=color, linewidth=2)
        ax.add_patch(box)
        
        # Header strip inside box
        header = patches.FancyBboxPatch((x-0.9, y+0.4), 1.8, 0.5, boxstyle="round,pad=0.05",
                                        facecolor=color, edgecolor='none')
        ax.add_patch(header)
        ax.text(x, y+0.65, stg_num, fontsize=9.5, fontweight='bold', color='#FFFFFF', ha='center', va='center')
        ax.text(x, y-0.2, title, fontsize=9, fontweight='bold', color='#1E293B', ha='center', va='center')

    # Arrows for row 1
    for i in range(5):
        ax.annotate("", xy=(stages[i+1][3]-0.95, 5.8), xytext=(stages[i][3]+0.95, 5.8),
                    arrowprops=dict(arrowstyle="->", color="#64748B", lw=2, shrinkA=0, shrinkB=0))
        
    # Curve arrow from stage 6 to stage 7
    ax.annotate("", xy=(stages[6][3]-0.5, 3.0), xytext=(stages[5][3]+0.5, 5.0),
                arrowprops=dict(arrowstyle="->", color="#64748B", lw=2, connectionstyle="angle3,angleA=0,angleB=-90"))

    # Arrows for row 2
    for i in range(6, 11):
        ax.annotate("", xy=(stages[i+1][3]-0.95, 3.0), xytext=(stages[i][3]+0.95, 3.0),
                    arrowprops=dict(arrowstyle="->", color="#64748B", lw=2, shrinkA=0, shrinkB=0))

    ax.set_xlim(0, 14)
    ax.set_ylim(1.0, 8.8)
    ax.axis('off')
    
    plt.tight_layout()
    plt.savefig('presentation_assets/phd_12stages_diagram.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Generated phd_12stages_diagram.png")

create_master_usecase_diagram()
create_phd_stages_diagram()
