import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # 16:9 Widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    
    # Colors
    NAVY_DARK = RGBColor(30, 63, 109)      # #1E3F6D
    NAVY_LIGHT = RGBColor(42, 82, 138)     # #2A528A
    ROYAL_BLUE = RGBColor(93, 110, 199)    # #5D6EC7
    PURPLE = RGBColor(124, 58, 237)        # #7C3AED
    GOLD = RGBColor(200, 157, 60)          # #C89D3C
    BG_LIGHT = RGBColor(248, 250, 252)     # #F8FAFC
    TEXT_MAIN = RGBColor(30, 41, 59)       # #1E293B
    TEXT_MUTED = RGBColor(100, 116, 139)   # #64748B
    CARD_BG = RGBColor(255, 255, 255)      # #FFFFFF
    CARD_BORDER = RGBColor(226, 232, 240)  # #E2E8F0
    EMERALD = RGBColor(5, 150, 105)        # #059669
    AMBER = RGBColor(217, 119, 6)          # #D97706
    ROSE = RGBColor(225, 29, 72)           # #E11D48

    blank_layout = prs.slide_layouts[6]
    
    def set_slide_background(slide, color):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = color

    def add_header(slide, title_text, category="GIMPA THESIS & DISSERTATION REPOSITORY"):
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(1.1))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p_cat = tf.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.name = "Inter"
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = GOLD
        p_cat.space_after = Pt(3)
        
        p_title = tf.add_paragraph()
        p_title.text = title_text
        p_title.font.name = "Inter"
        p_title.font.size = Pt(21)
        p_title.font.bold = True
        p_title.font.color.rgb = NAVY_DARK

    def add_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=CARD_BORDER):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1)
        return shape

    # =========================================================================
    # SLIDE 1: Title Slide (Hero Dark Theme)
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1, NAVY_DARK)
    
    bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.4), Inches(7.5))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GOLD
    bar.line.fill.background()

    title_box = slide1.shapes.add_textbox(Inches(1.2), Inches(1.4), Inches(11.0), Inches(4.8))
    tf1 = title_box.text_frame
    tf1.word_wrap = True
    
    p1 = tf1.paragraphs[0]
    p1.text = "GHANA INSTITUTE OF MANAGEMENT AND PUBLIC ADMINISTRATION"
    p1.font.name = "Inter"
    p1.font.size = Pt(13)
    p1.font.bold = True
    p1.font.color.rgb = GOLD
    p1.space_after = Pt(14)
    
    p2 = tf1.add_paragraph()
    p2.text = "GIMPA Thesis & Dissertation\nRepository Management System"
    p2.font.name = "Inter"
    p2.font.size = Pt(36)
    p2.font.bold = True
    p2.font.color.rgb = CARD_BG
    p2.space_after = Pt(16)
    
    p3 = tf1.add_paragraph()
    p3.text = "Complete System Walkthrough: What Every Role Sees (Student, Supervisor, HOD, Dean, Examiner, Librarian, Admin) & Exact Page Capabilities"
    p3.font.name = "Inter"
    p3.font.size = Pt(15)
    p3.font.color.rgb = RGBColor(203, 213, 225)
    p3.space_after = Pt(28)
    
    p4 = tf1.add_paragraph()
    p4.text = "🏛️ Live Production URL: https://thesis.manamatechnologies.com  |  Role-by-Role Visual Presentation"
    p4.font.name = "Inter"
    p4.font.size = Pt(12)
    p4.font.bold = True
    p4.font.color.rgb = ROYAL_BLUE

    # =========================================================================
    # SLIDE 2: Objectives & Strategic Purpose
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2, BG_LIGHT)
    add_header(slide2, "Strategic Objectives & Problem Statement", "1. System Objective & Overview")
    
    add_card(slide2, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0))
    tb_l = slide2.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(5.0), Inches(4.5))
    tfl = tb_l.text_frame
    tfl.word_wrap = True
    
    p = tfl.paragraphs[0]
    p.text = "⚠️ Challenges of Legacy Paper System"
    p.font.name = "Inter"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = ROSE
    p.space_after = Pt(10)
    
    bottlenecks = [
        "Fragmented Submissions: Printed thesis drafts scattered across physical offices, risking lost feedback and unverified versions.",
        "Delayed Feedback Loops: Exchange between candidates, supervisors, and external examiners took weeks via manual drop-offs.",
        "Examiner Discrepancies: Lack of automated rubric calculation and separate rules for Undergraduate (1 examiner) vs Postgraduate (2 examiners).",
        "Zero Milestone Tracking: No centralized mechanism to monitor PhD progression, meeting frequency, or dormant candidacies.",
        "Unindexed Archival: Approved research dissertations stayed in filing cabinets instead of a searchable global catalog."
    ]
    for b in bottlenecks:
        pb = tfl.add_paragraph()
        pb.text = "• " + b
        pb.font.name = "Inter"
        pb.font.size = Pt(10.5)
        pb.font.color.rgb = TEXT_MAIN
        pb.space_after = Pt(6)

    add_card(slide2, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0))
    tb_r = slide2.shapes.add_textbox(Inches(7.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tfr = tb_r.text_frame
    tfr.word_wrap = True
    
    p = tfr.paragraphs[0]
    p.text = "🎯 Core Objectives & Solutions Delivered"
    p.font.name = "Inter"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p.space_after = Pt(10)
    
    solutions = [
        "100% Digital Lifecycle: 6-Phase state machine governing proposals, draft reviews, examination defenses, revisions, and archival.",
        "In-Browser ONLYOFFICE Editing: Real-time collaborative DOCX editing with margin comments and track changes.",
        "Automated Defense Rubrics: Standardized rubric engine computing final marks with strict dual sign-offs (Supervisor + HOD).",
        "12-Stage PhD Governance Hub: Milestone matrix with automatic inactivity alerts, meeting logs, and publication tracking.",
        "Public Institutional Repository: Open-access search catalog organized by faculty portals (GBS, SPSG, Law, SOTSS)."
    ]
    for s in solutions:
        ps = tfr.add_paragraph()
        ps.text = "✔ " + s
        ps.font.name = "Inter"
        ps.font.size = Pt(10.5)
        ps.font.color.rgb = TEXT_MAIN
        ps.space_after = Pt(6)

    # =========================================================================
    # SLIDE 3: Role-Based Access Control Hierarchy
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3, BG_LIGHT)
    add_header(slide3, "Role-Based Access Control (RBAC) & User Accounts", "2. Role Architecture")
    
    roles_data = [
        ("Student (John Smith)", "john.smith@st.gimpa.edu.gh", "Submit proposals, upload drafts, edit thesis in ONLYOFFICE, review examiner marks, log PhD meetings.", NAVY_LIGHT),
        ("Supervisor (Abena Osei)", "abena.osei@gimpa.edu.gh", "Supervise assigned candidates, annotate thesis in ONLYOFFICE, track 12-stage milestones, sign off on defense.", ROYAL_BLUE),
        ("Examiner (Int / Ext)", "Designated Academic Staff", "Evaluate assigned dissertations, fill structured rubric criteria, provide in-doc feedback, submit pass verdicts.", AMBER),
        ("HOD (Kwame Boadu)", "kwame.boadu@adj.gimpa.edu.gh", "Departmental pipeline oversight, allocate examiners, schedule oral defenses, grant primary Phase 5 sign-offs.", ROSE),
        ("Coordinator (Yaw Asante)", "yaw.asante@gimpa.edu.gh", "Coordinate defense dates, track examiner script submissions, compile composite marks, coordinate revisions.", PURPLE),
        ("Dean (Kofi Mensah)", "kofi.mensah@gimpa.edu.gh", "Faculty-wide completion analytics, review cross-department defense results, grant final institutional clearance.", EMERALD),
        ("System Administrator", "admin@gimpa.edu.gh", "User account governance, bulk CSV student onboarding, system broadcast announcements, database backups.", TEXT_MAIN),
    ]
    
    y_start = Inches(1.65)
    row_height = Inches(0.72)
    for i, (r_name, r_email, r_desc, r_col) in enumerate(roles_data):
        y_pos = y_start + i * (row_height + Inches(0.08))
        add_card(slide3, Inches(0.8), y_pos, Inches(11.7), row_height)
        
        badge = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), y_pos + Inches(0.12), Inches(2.6), Inches(0.48))
        badge.fill.solid()
        badge.fill.fore_color.rgb = r_col
        badge.line.fill.background()
        
        tb_b = slide3.shapes.add_textbox(Inches(1.0), y_pos + Inches(0.14), Inches(2.6), Inches(0.44))
        tf_b = tb_b.text_frame
        p_b = tf_b.paragraphs[0]
        p_b.text = r_name
        p_b.alignment = PP_ALIGN.CENTER
        p_b.font.name = "Inter"
        p_b.font.size = Pt(9.5)
        p_b.font.bold = True
        p_b.font.color.rgb = CARD_BG
        
        tb_d = slide3.shapes.add_textbox(Inches(3.8), y_pos + Inches(0.08), Inches(8.5), Inches(0.56))
        tf_d = tb_d.text_frame
        tf_d.word_wrap = True
        
        p_em = tf_d.paragraphs[0]
        p_em.text = f"Email: {r_email}"
        p_em.font.name = "Inter"
        p_em.font.size = Pt(9)
        p_em.font.bold = True
        p_em.font.color.rgb = r_col
        
        p_d = tf_d.add_paragraph()
        p_d.text = r_desc
        p_d.font.name = "Inter"
        p_d.font.size = Pt(10)
        p_d.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 4: Master UML Use Case Architecture Diagram
    # =========================================================================
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4, BG_LIGHT)
    add_header(slide4, "Master Role Use Case Architecture Diagram", "2. Use Case Architecture")
    
    img_master = 'presentation_assets/usecase_master_clean.png'
    if os.path.exists(img_master):
        slide4.shapes.add_picture(img_master, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.5))

    # =========================================================================
    # SLIDE 5: Student & Supervisor Dedicated Use Case Diagram
    # =========================================================================
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide5, BG_LIGHT)
    add_header(slide5, "UML Use Case Diagram: Student & Supervisor Lifecycle", "2. Use Case Architecture")
    
    img_stu_sup = 'presentation_assets/usecase_student_supervisor.png'
    if os.path.exists(img_stu_sup):
        slide5.shapes.add_picture(img_stu_sup, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.5))

    # =========================================================================
    # HELPER FOR ROLE-BY-ROLE WALKTHROUGH SLIDES
    # =========================================================================
    def add_role_page_slide(role_name, user_email, page_title, screen_filename, what_they_see_bullets, what_page_does_bullets):
        s = prs.slides.add_slide(blank_layout)
        set_slide_background(s, BG_LIGHT)
        add_header(s, page_title, f"3. Role Walkthrough: {role_name}")
        
        # Left side: Desktop Screenshot Container
        add_card(s, Inches(0.8), Inches(1.6), Inches(7.4), Inches(5.3))
        
        # Check in role_screens first, then desktop_screens, then screens
        scr_path = os.path.join('presentation_assets/role_screens', screen_filename)
        if not os.path.exists(scr_path):
            scr_path = os.path.join('presentation_assets/desktop_screens', screen_filename)
        if not os.path.exists(scr_path):
            scr_path = os.path.join('presentation_assets/screens', screen_filename)
            
        if os.path.exists(scr_path):
            s.shapes.add_picture(scr_path, Inches(0.9), Inches(1.7), Inches(7.2), Inches(5.1))
        
        # Right side: Explanatory Breakdown Card
        add_card(s, Inches(8.4), Inches(1.6), Inches(4.1), Inches(5.3))
        tb = s.shapes.add_textbox(Inches(8.6), Inches(1.75), Inches(3.7), Inches(5.0))
        tf = tb.text_frame
        tf.word_wrap = True
        
        # User Header
        p_u = tf.paragraphs[0]
        p_u.text = f"👤 Role: {role_name}"
        p_u.font.name = "Inter"
        p_u.font.size = Pt(11)
        p_u.font.bold = True
        p_u.font.color.rgb = ROYAL_BLUE
        
        p_em = tf.add_paragraph()
        p_em.text = f"Account: {user_email}"
        p_em.font.name = "Inter"
        p_em.font.size = Pt(9.5)
        p_em.font.color.rgb = TEXT_MUTED
        p_em.space_after = Pt(6)
        
        # Section 1: What They See
        p1 = tf.add_paragraph()
        p1.text = "👀 What They See on This Screen:"
        p1.font.name = "Inter"
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = NAVY_DARK
        p1.space_after = Pt(3)
        
        for b in what_they_see_bullets:
            p = tf.add_paragraph()
            p.text = "• " + b
            p.font.name = "Inter"
            p.font.size = Pt(9.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(2)
            
        # Section 2: What That Page Does
        p2 = tf.add_paragraph()
        p2.text = "\n⚙️ What This Page Does:"
        p2.font.name = "Inter"
        p2.font.size = Pt(12)
        p2.font.bold = True
        p2.font.color.rgb = EMERALD
        p2.space_after = Pt(3)
        
        for b in what_page_does_bullets:
            p = tf.add_paragraph()
            p.text = "✔ " + b
            p.font.name = "Inter"
            p.font.size = Pt(9.5)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(2)
            
        return s

    # =========================================================================
    # SLIDE 6: Public Catalog (Unauthenticated View)
    # =========================================================================
    add_role_page_slide(
        "Public / Visitor Portal",
        "Open to all students, faculty, and public",
        "Page 1: Public Research Catalog & Faculty Portals",
        "public_catalog_desktop.png",
        [
            "The top navigation bar with institutional branding.",
            "Four summary publication tabs: Trending, Highest Rated, Most Downloaded, and All Publications.",
            "Faculty Portal exploration cards: GIMPA Business School (GBS), Public Service (SPSG), Law, and Technology (SOTSS).",
            "Direct 'Sign In' button to access student/staff portals."
        ],
        [
            "Allows open-access discovery of GIMPA's approved dissertations.",
            "Enables full-text title and abstract searches across disciplines.",
            "Tracks global downloads and citation metrics.",
            "Routes registered university members to secure login."
        ]
    )

    # =========================================================================
    # SLIDE 7: Search & Discovery Engine
    # =========================================================================
    add_role_page_slide(
        "Public / Visitor Portal",
        "Open to all students, faculty, and public",
        "Page 2: Advanced Search & Multi-Field Discovery",
        "search_discovery_desktop.png",
        [
            "Dynamic search input with real-time text matching.",
            "Faceted filtering sidebar (Degree Level, Year, Faculty, Department).",
            "Results listing with title, author, supervisor, and year badges.",
            "Publication details drawer with complete abstract preview."
        ],
        [
            "Executes multi-field boolean search across thousands of works.",
            "Filters research output by academic programme type.",
            "Provides instant PDF script download and citation copying.",
            "Enables academic researchers to review prior works."
        ]
    )

    # =========================================================================
    # SLIDE 8: Authentication & Role Login
    # =========================================================================
    add_role_page_slide(
        "All Institutional Roles",
        "Students, Supervisors, HODs, Deans, Examiners, Librarians, Admin",
        "Page 3: Institutional Authentication & Login Portal",
        "login_screen_desktop.png",
        [
            "Left desktop branding panel displaying GIMPA institutional repository stats.",
            "Right login form with Email Address / Student ID and Password fields.",
            "Remember-me checkbox and password reset links.",
            "Clear role security alert banners."
        ],
        [
            "Validates user credentials against hashed password database (bcrypt).",
            "Generates secure stateless JWT session tokens.",
            "Automatically detects the user's role and redirects to their dashboard.",
            "Protects all internal routes from unauthorized access."
        ]
    )

    # =========================================================================
    # SLIDE 9: Student Role — John Smith (Dashboard)
    # =========================================================================
    add_role_page_slide(
        "Student",
        "john.smith@st.gimpa.edu.gh",
        "Student View: Dashboard & Submissions Pipeline",
        "student_dashboard.png",
        [
            "Top 4 KPI metric cards: Total Submissions (0), Active In Review (0), Paper Downloads (0), Views (0).",
            "My Submissions & Workflow pipeline area.",
            "Phase 1: 'Submit Your Thesis Topic' action box with purple button: 'Submit Thesis Topic (Phase 1)'.",
            "Left sidebar showing Dashboard, PhD Hub, and My Profile."
        ],
        [
            "Allows students to submit thesis topics, proposals, and drafts.",
            "Tracks the 6-phase academic lifecycle from topic to library archival.",
            "Provides one-click access to the ONLYOFFICE in-browser editor.",
            "Displays supervisor and examiner feedback notes upon review."
        ]
    )

    # =========================================================================
    # SLIDE 10: Student Role — John Smith (PhD Hub)
    # =========================================================================
    add_role_page_slide(
        "Student (Doctoral Track)",
        "john.smith@st.gimpa.edu.gh",
        "Student View: PhD Programme Hub & Supervision",
        "student_phd_hub.png",
        [
            "Banner: GIMPA Business School — PhD Programme Hub.",
            "4 Doctoral Summary Boxes: Enrolled PhD Students (0), Doctoral Candidates (0), 60-Day Inactivity Flag (0), Reaccreditation Folders (18 Standard).",
            "7 Sub-Tab Navigation Buttons: PhD Student Dossiers, 12-Stage Supervision Logs, Seminars, Comp Exams, Teaching Practice, 6-Month Reviews, 18 Folders.",
            "Search box to find students and specialization."
        ],
        [
            "Tracks progression through the mandatory 12 PhD stages.",
            "Logs supervisory meetings, discussion notes, and action plans.",
            "Monitors candidate activity to prevent dormancy (>30 / >60 days).",
            "Stores verified doctoral journal publications for graduation."
        ]
    )

    # =========================================================================
    # SLIDE 11: Student Role — John Smith (My Profile)
    # =========================================================================
    add_role_page_slide(
        "Student",
        "john.smith@st.gimpa.edu.gh",
        "Student View: Account Profile & Security",
        "student_profile.png",
        [
            "Account Information card with Full Name (John Smith), Email Address, Department (Accounting and Finance), Account Type (Student), and User ID (5).",
            "Action buttons: 'Edit Profile' and 'Change Password'.",
            "Security Tips section with institutional guidance.",
            "Sidebar with active user avatar and logout button."
        ],
        [
            "Allows students to manage their personal account settings.",
            "Enables changing and updating secure passwords.",
            "Displays assigned academic department and student ID.",
            "Provides safe session termination with instant token revocation."
        ]
    )

    # =========================================================================
    # SLIDE 12: ONLYOFFICE In-App Live DOCX Editor
    # =========================================================================
    add_role_page_slide(
        "Student & Supervisor & Examiner",
        "Shared Collaborative Environment",
        "In-App Feature: ONLYOFFICE Collaborative Word Editor",
        "document_comments.png",
        [
            "Full Microsoft Word (.docx) interface embedded inside the browser.",
            "Document comment sidebar displaying examiner remarks and line-specific annotations.",
            "Track-changes markup showing suggested additions and deletions.",
            "Dual-button panel: 'Edit in ONLYOFFICE' and 'View Comments'."
        ],
        [
            "Enables students to apply corrections directly in the browser.",
            "Allows supervisors and examiners to annotate drafts in real-time.",
            "Automatically saves and commits modified DOCX files to the repository.",
            "Eliminates the need for external desktop software or email attachments."
        ]
    )

    # =========================================================================
    # SLIDE 13: Supervisor Role — Abena Osei (Dashboard)
    # =========================================================================
    add_role_page_slide(
        "Supervisor / Lecturer",
        "abena.osei@gimpa.edu.gh",
        "Supervisor View: Supervisees & Review Workflow",
        "supervisor_dashboard.png",
        [
            "Active supervisees table listing student names, topics, and degree levels.",
            "Status chips indicating draft submissions (Phase 1 Topic, Phase 2 Draft).",
            "Direct action buttons: 'Open in ONLYOFFICE' to annotate student drafts.",
            "Defense Readiness Sign-Off button to approve thesis for examination."
        ],
        [
            "Allows faculty supervisors to monitor all assigned student candidates.",
            "Provides in-doc annotation tools to guide student research drafts.",
            "Validates student meeting logs and milestone progress.",
            "Authorizes student advancement to oral defense (Phase 3)."
        ]
    )

    # =========================================================================
    # SLIDE 14: Examiner Role — Defense Evaluation & Rubrics
    # =========================================================================
    add_role_page_slide(
        "Examiner (Internal / External)",
        "Assigned Academic Faculty",
        "Examiner View: Thesis Evaluation & Defense Rubrics",
        "approval_workflow.png",
        [
            "Assigned examination queue listing student dissertations.",
            "Standardized 5-part rubric scoring form (Problem, Literature, Methodology, Analysis, Defense).",
            "Auto-calculating total score box and qualitative remarks editor.",
            "Verdict selector: Pass, Minor Corrections, Major Corrections, Resubmit, Fail."
        ],
        [
            "Enforces standardized institutional grading criteria.",
            "Computes weighted numerical marks automatically.",
            "Records detailed examiner feedback for the defense committee.",
            "Automatically distinguishes Undergrad (1 examiner) vs Postgrad (2 examiners)."
        ]
    )

    # =========================================================================
    # SLIDE 15: Head of Department (HOD) Role — Kwame Boadu
    # =========================================================================
    add_role_page_slide(
        "Head of Department (HOD)",
        "kwame.boadu@adj.gimpa.edu.gh",
        "HOD View: Departmental Pipeline & Examiner Allocation",
        "hod_dashboard.png",
        [
            "Departmental thesis pipeline overview across all undergraduate and postgraduate cohorts.",
            "Examiner Allocation Modal: Assign Internal and External examiners to candidates.",
            "Defense score compiler: Aggregates Internal (S1) + External (S2) marks.",
            "Phase 5 Dual Sign-off authorization button."
        ],
        [
            "Gives HODs complete oversight of all department research projects.",
            "Manages examiner assignments and defense committee appointments.",
            "Calculates composite final scores: (S1 + S2) / 2.",
            "Issues primary departmental clearance for Dean review."
        ]
    )

    # =========================================================================
    # SLIDE 16: Project Coordinator Role — Yaw Asante
    # =========================================================================
    add_role_page_slide(
        "Project Coordinator",
        "yaw.asante@gimpa.edu.gh",
        "Coordinator View: Defense Logistics & Compilation",
        "coordinator_dashboard.png",
        [
            "Departmental defense scheduling queue and candidate lists.",
            "Examiner submission progress tracker showing received and pending scripts.",
            "Defense score aggregation matrix and grade compiler.",
            "Post-defense correction verification tracker."
        ],
        [
            "Coordinates oral defense dates and panel allocations.",
            "Tracks timely submission of examiner rubric evaluation forms.",
            "Verifies that candidates have addressed all required post-defense corrections.",
            "Prepares graduation clearance documentation for the HOD and Dean."
        ]
    )

    # =========================================================================
    # SLIDE 17: Dean of Faculty Role — Kofi Mensah
    # =========================================================================
    add_role_page_slide(
        "Dean of Faculty",
        "kofi.mensah@gimpa.edu.gh",
        "Dean View: Faculty Oversight & Completion Analytics",
        "dean_dashboard.png",
        [
            "Faculty-wide completion analytics across all academic departments.",
            "Comprehensive review table of approved defense results and examiner verdicts.",
            "Final Faculty Clearance authorization button for graduating cohorts.",
            "Cross-departmental PhD progression and supervisor distribution metrics."
        ],
        [
            "Provides high-level institutional governance for the Dean.",
            "Audits defense outcomes and ensures grading integrity.",
            "Grants final institutional clearance for library catalog publishing.",
            "Exports faculty-wide accreditation reports."
        ]
    )

    # =========================================================================
    # SLIDE 18: System Administrator Role (User Management & Role Elevation)
    # =========================================================================
    add_role_page_slide(
        "System Administrator & Leadership",
        "admin@gimpa.edu.gh",
        "Admin View: User Management & Broadcast Announcements Hub",
        "admin_users.png",
        [
            "User accounts directory table with instant filtering by name, email, role, and student ID.",
            "Inline role switcher dropdown (Student, Supervisor, HOD, Coordinator, Dean, Admin).",
            "Bulk Broadcast Messaging Hub with Target Directory Filters & Custom Recipient CSV Upload.",
            "File & Document Attachment uploader (PDF, Word, Guidelines) with dual in-app & email delivery."
        ],
        [
            "Allows administrators to provision and manage all institutional user accounts.",
            "Enables immediate role elevation, department mapping, and permission matrix updates.",
            "Dispatches targeted broadcast announcements with attached guidelines to specific student/staff cohorts.",
            "Supports uploading custom CSV email lists to broadcast urgent notices with download links."
        ]
    )

    # =========================================================================
    # SLIDE 19: System Administrator Role (Bulk CSV Importer)
    # =========================================================================
    add_role_page_slide(
        "System Administrator",
        "admin@gimpa.edu.gh",
        "Admin View: Bulk CSV Student & Staff Onboarding",
        "bulk_csv_import.png",
        [
            "Drag-and-drop CSV file uploader with automated schema validation.",
            "Real-time import progress bar and batch statistics summary.",
            "Detailed record validation preview: Name, Student ID, Email, Dept, Degree Level.",
            "Error reporting and duplicate record resolution panel."
        ],
        [
            "Onboards entire student cohorts (hundreds of accounts) in a single click.",
            "Automatically generates secure hashed passwords and accounts.",
            "Dispatches welcome credential emails to students via SMTP mailer.",
            "Assigns default academic tracks (Undergraduate / Masters / PhD)."
        ]
    )

    # =========================================================================
    # SLIDE 20: 12-Stage PhD Progression Framework Diagram
    # =========================================================================
    slide20 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide20, BG_LIGHT)
    add_header(slide20, "PhD Hub: 12-Stage Doctoral Progression Framework", "4. Technical Excellence & Governance")
    
    img_phd = 'presentation_assets/phd_12stages_diagram.png'
    if os.path.exists(img_phd):
        slide20.shapes.add_picture(img_phd, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.4))

    # =========================================================================
    # SLIDE 21: Security, Compliance & Audit Trails
    # =========================================================================
    slide21 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide21, BG_LIGHT)
    add_header(slide21, "Enterprise Security, Compliance & Audit Trails", "4. Technical Excellence & Governance")
    
    sec_pillars = [
        ("Cryptographic Security", 
         "• JWT Stateless Tokens with SHA-256 signatures.\n• bcrypt password hashing with salt rounds.\n• HTTPS / TLS encryption on all API endpoints.\n• Document server callback authentication.", 
         NAVY_DARK, Inches(0.8)),
        ("Academic Integrity & Compliance", 
         "• Strict defense gate clearance before grade release.\n• Dual sign-off requirement (Supervisor + HOD).\n• Immutable examiner scoring records.\n• Anti-tamper PDF publication watermarking.", 
         ROYAL_BLUE, Inches(4.8)),
        ("Audit Logs & Data Protection", 
         "• Complete timestamped audit trail of all grade changes.\n• Automated database backup snapshots.\n• Role-scoped data isolation across departments.\n• GDPR & Institutional data privacy compliance.", 
         EMERALD, Inches(8.8)),
    ]
    
    for title, desc, col, l in sec_pillars:
        add_card(slide21, l, Inches(1.8), Inches(3.7), Inches(5.0))
        strip = slide21.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, Inches(1.8), Inches(3.7), Inches(0.12))
        strip.fill.solid()
        strip.fill.fore_color.rgb = col
        strip.line.fill.background()
        
        tb = slide21.shapes.add_textbox(l + Inches(0.25), Inches(2.1), Inches(3.2), Inches(4.4))
        tf = tb.text_frame
        tf.word_wrap = True
        
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.name = "Inter"
        pt.font.size = Pt(15)
        pt.font.bold = True
        pt.font.color.rgb = col
        pt.space_after = Pt(14)
        
        for line in desc.split("\n"):
            pd = tf.add_paragraph()
            pd.text = line
            pd.font.name = "Inter"
            pd.font.size = Pt(11)
            pd.font.color.rgb = TEXT_MAIN
            pd.space_after = Pt(8)

    # =========================================================================
    # SLIDE 22: Live Server Deployment & Operations
    # =========================================================================
    slide22 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide22, BG_LIGHT)
    add_header(slide22, "Live Production Deployment & Infrastructure", "4. Technical Excellence & Governance")
    
    deploy_items = [
        ("Production Host", "Ubuntu 22.04 LTS (VPS IP: 46.62.214.146)\nManaged under /home/admin/web/thesis.manamatechnologies.com/app", NAVY_LIGHT),
        ("Public Domain", "https://thesis.manamatechnologies.com\nProxied via Cloudflare CDN with automated SSL/TLS termination", ROYAL_BLUE),
        ("Backend Daemon", "gimpa-backend.service (Systemd Managed)\nFastAPI running on Uvicorn ASGI with multi-worker concurrency", EMERALD),
        ("Frontend Daemon", "gimpa-frontend.service (Systemd Managed)\nNode.js production server hosting optimized React 19 / Vite build bundles", PURPLE),
        ("DocServer Container", "onlyoffice-documentserver (Docker Managed)\nIsolated container running document conversion and real-time collaboration", AMBER),
        ("Continuous Delivery", "Git-synchronized continuous deployment with automated rebuild and restart daemons", TEXT_MAIN)
    ]
    
    for i, (title, desc, col) in enumerate(deploy_items):
        row = i // 2
        col_idx = i % 2
        left = Inches(0.8) if col_idx == 0 else Inches(6.8)
        top = Inches(1.8) + row * Inches(1.65)
        
        add_card(slide22, left, top, Inches(5.7), Inches(1.45))
        strip = slide22.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(0.12), Inches(1.45))
        strip.fill.solid()
        strip.fill.fore_color.rgb = col
        strip.line.fill.background()
        
        tb = slide22.shapes.add_textbox(left + Inches(0.3), top + Inches(0.15), Inches(5.2), Inches(1.15))
        tf = tb.text_frame
        tf.word_wrap = True
        
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.name = "Inter"
        pt.font.size = Pt(13)
        pt.font.bold = True
        pt.font.color.rgb = col
        pt.space_after = Pt(4)
        
        for line in desc.split("\n"):
            pd = tf.add_paragraph()
            pd.text = line
            pd.font.name = "Inter"
            pd.font.size = Pt(10.5)
            pd.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 23: Institutional Benefits & Conclusion
    # =========================================================================
    slide23 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide23, NAVY_DARK)
    
    bar = slide23.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.4), Inches(7.5))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GOLD
    bar.line.fill.background()

    tb = slide23.shapes.add_textbox(Inches(1.2), Inches(1.0), Inches(11.0), Inches(5.5))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "TRANSFORMING GIMPA RESEARCH EXCELLENCE"
    p.font.name = "Inter"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = GOLD
    p.space_after = Pt(12)
    
    p = tf.add_paragraph()
    p.text = "Key Institutional Outcomes & Summary"
    p.font.name = "Inter"
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = CARD_BG
    p.space_after = Pt(24)
    
    benefits = [
        "100% Paperless Workflow: Reduced thesis administration turnaround time from months to days.",
        "Zero Lost Feedback: All examiner remarks and annotations permanently recorded in ONLYOFFICE version histories.",
        "Accreditation Confidence: Rigorous 12-stage milestone compliance and verifiable publication records for PhDs.",
        "Global Academic Visibility: GIMPA research discoverable by international institutions via the public catalog portal.",
        "Scalable Infrastructure: Enterprise-grade architecture ready to support thousands of students across all academic faculties."
    ]
    for b in benefits:
        p = tf.add_paragraph()
        p.text = "✔  " + b
        p.font.name = "Inter"
        p.font.size = Pt(13)
        p.font.color.rgb = RGBColor(226, 232, 240)
        p.space_after = Pt(10)

    # Save presentation
    output_filename = "GIMPA_Thesis_Repository_System_Presentation_v4.pptx"
    prs.save(output_filename)
    print(f"Presentation saved successfully to: {os.path.abspath(output_filename)}")

create_presentation()
