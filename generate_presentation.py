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
    # SLIDE 1: Title Slide
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1, NAVY_DARK)
    
    bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.4), Inches(7.5))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GOLD
    bar.line.fill.background()

    title_box = slide1.shapes.add_textbox(Inches(1.2), Inches(1.5), Inches(11.0), Inches(4.5))
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
    p3.text = "Comprehensive Digital Lifecycle Platform: From Proposal Submission & ONLYOFFICE In-App Supervision to Multi-Tier Defense Grading & Institutional Archival"
    p3.font.name = "Inter"
    p3.font.size = Pt(15)
    p3.font.color.rgb = RGBColor(203, 213, 225)
    p3.space_after = Pt(32)
    
    p4 = tf1.add_paragraph()
    p4.text = "🏛️ Live Production Server: https://thesis.manamatechnologies.com  |  Role-Based Desktop Walkthrough & Architecture"
    p4.font.name = "Inter"
    p4.font.size = Pt(12)
    p4.font.bold = True
    p4.font.color.rgb = ROYAL_BLUE

    # =========================================================================
    # SLIDE 2: Executive Summary
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2, BG_LIGHT)
    add_header(slide2, "Executive Summary & Institutional Vision", "1. System Objective & Overview")
    
    pillars = [
        ("End-to-End Digital Lifecycle", 
         "Eliminates paper-based thesis workflows by digitizing every academic phase: initial proposal submission, supervisor assignment, draft reviews, defense examination rubrics, post-defense corrections, dual sign-offs, and library publishing.", 
         EMERALD, Inches(0.8)),
        ("In-App ONLYOFFICE Grading", 
         "Embeds a full-featured collaborative Word processor directly in the browser, allowing supervisors and examiners to add track-changes, highlights, and margin comments without downloading/uploading external files.", 
         ROYAL_BLUE, Inches(4.8)),
        ("12-Stage Doctoral Milestone Hub", 
         "A purpose-built governance sub-system for PhD tracking—enforcing 12 strict doctoral milestones, meeting frequency alerts, publication verification, and automated dossier compilation for faculty oversight.", 
         PURPLE, Inches(8.8)),
    ]
    
    for title, desc, col, left in pillars:
        add_card(slide2, left, Inches(1.8), Inches(3.7), Inches(4.9))
        strip = slide2.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, Inches(1.8), Inches(3.7), Inches(0.12))
        strip.fill.solid()
        strip.fill.fore_color.rgb = col
        strip.line.fill.background()
        
        tb = slide2.shapes.add_textbox(left + Inches(0.25), Inches(2.1), Inches(3.2), Inches(4.3))
        tf = tb.text_frame
        tf.word_wrap = True
        
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.name = "Inter"
        pt.font.size = Pt(16)
        pt.font.bold = True
        pt.font.color.rgb = NAVY_DARK
        pt.space_after = Pt(14)
        
        pd = tf.add_paragraph()
        pd.text = desc
        pd.font.name = "Inter"
        pd.font.size = Pt(12)
        pd.font.color.rgb = TEXT_MAIN
        pd.line_spacing = 1.3

    # =========================================================================
    # SLIDE 3: Problem Statement vs Solutions
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3, BG_LIGHT)
    add_header(slide3, "Problem Statement & Strategic Objectives", "1. System Objective & Overview")
    
    add_card(slide3, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0))
    tb_left = slide3.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(5.0), Inches(4.5))
    tfl = tb_left.text_frame
    tfl.word_wrap = True
    
    p = tfl.paragraphs[0]
    p.text = "⚠️ Challenges of Legacy Paper-Based System"
    p.font.name = "Inter"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = ROSE
    p.space_after = Pt(12)
    
    bottlenecks = [
        "Fragmented Submission Tracks: Printed drafts scattered across departments, leading to missing copies and unverified versions.",
        "Delayed Feedback Loops: Feedback exchange between students, supervisors, and external examiners took weeks via manual email/physical drop-offs.",
        "Examiner Discrepancies: Lack of standard rubric computation, weighted scoring formulas, and clear separation of Undergraduate (1 examiner) vs. Postgraduate (2 examiners) tracks.",
        "Zero Milestone Visibility: No centralized tracking for PhD student progress, supervision meeting frequency, or dormant candidacy alerts.",
        "Archival Loss: Approved research dissertations remained unindexed in physical filing cabinets instead of a searchable academic catalog."
    ]
    for b in bottlenecks:
        pb = tfl.add_paragraph()
        pb.text = "• " + b
        pb.font.name = "Inter"
        pb.font.size = Pt(11)
        pb.font.color.rgb = TEXT_MAIN
        pb.space_after = Pt(6)

    add_card(slide3, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.0))
    tb_right = slide3.shapes.add_textbox(Inches(7.1), Inches(2.0), Inches(5.1), Inches(4.5))
    tfr = tb_right.text_frame
    tfr.word_wrap = True
    
    p = tfr.paragraphs[0]
    p.text = "🎯 Core Objectives & Solutions Delivered"
    p.font.name = "Inter"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p.space_after = Pt(12)
    
    solutions = [
        "Unified Digital Pipeline: 6-Phase state machine governing proposals, draft reviews, examination defenses, corrections, and archival.",
        "In-Browser Live Annotations: Integrated ONLYOFFICE Docs Engine for real-time DOCX editing, line comments, and versioned feedback.",
        "Automated Multi-Examiner Rubrics: Dynamic scoring engine that computes final marks, verifies pass thresholds, and enforces dual sign-offs.",
        "PhD Doctoral Progression Hub: 12-stage milestone matrix with automated inactivity alerts, meeting logs, and publication tracking.",
        "Public Institutional Repository: Fully indexed public search portal with faculty filtering (GBS, SPSG, Law, SOTSS), trending analytics, and PDF security."
    ]
    for s in solutions:
        ps = tfr.add_paragraph()
        ps.text = "✔ " + s
        ps.font.name = "Inter"
        ps.font.size = Pt(11)
        ps.font.color.rgb = TEXT_MAIN
        ps.space_after = Pt(6)

    # =========================================================================
    # SLIDE 4: Architecture & Tech Stack
    # =========================================================================
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4, BG_LIGHT)
    add_header(slide4, "System Architecture & Full-Stack Technology Stack", "1. System Objective & Overview")
    
    tech_cards = [
        ("Frontend Application", "React 19 & React Router 7\nTailwind CSS v4 (Design System)\nLucide React Iconography\nVanilla CSS Dynamic Themes\nHTML5 Canvas & PDF Handlers", NAVY_LIGHT, Inches(0.8), Inches(1.8)),
        ("Backend Services", "Python FastAPI (High Performance)\nSQLAlchemy ORM & SQLite/Postgres\nPydantic v2 Schema Validation\nJWT Authentication & Passlib Hashing\nExim / SMTP Auto-Mailer Engine", ROYAL_BLUE, Inches(4.8), Inches(1.8)),
        ("Document & Storage", "ONLYOFFICE DocumentServer\nDocker Containerized Microservice\nJWT Secure Callback Handlers\nDOCX / PDF Binary Storage Engine\nAutomated Snapshot Backup Daemon", PURPLE, Inches(8.8), Inches(1.8)),
        ("Security & Roles", "7-Tier Role-Based Access Control\nGranular Department Scoping\nDefense Gate Clearance Engine\nTamper-Evident Audit Trails\nHTTPS / SSL Encrypted Traffic", GOLD, Inches(0.8), Inches(4.5)),
        ("Academic Workflows", "Undergrad Track: 1 Examiner (S1)\nPostgrad Track: 2 Examiners ((S1+S2)/2)\nWeighted Defense Rubric Matrix\n12-Stage PhD Progression Engine\nCoordinator & HOD Dual Sign-offs", EMERALD, Inches(4.8), Inches(4.5)),
        ("Cloud & Infrastructure", "Ubuntu 22.04 LTS Production VPS\nNginx Reverse Proxy & Load Balancer\nSystemd Daemon Service Supervision\nCloudflare Edge Caching & WAF\nGit CI/CD Synchronized Deployment", TEXT_MAIN, Inches(8.8), Inches(4.5)),
    ]
    
    for title, desc, col, l, t in tech_cards:
        add_card(slide4, l, t, Inches(3.7), Inches(2.4))
        strip = slide4.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, Inches(3.7), Inches(0.08))
        strip.fill.solid()
        strip.fill.fore_color.rgb = col
        strip.line.fill.background()
        
        tb = slide4.shapes.add_textbox(l + Inches(0.2), t + Inches(0.18), Inches(3.3), Inches(2.1))
        tf = tb.text_frame
        tf.word_wrap = True
        
        pt = tf.paragraphs[0]
        pt.text = title
        pt.font.name = "Inter"
        pt.font.size = Pt(13.5)
        pt.font.bold = True
        pt.font.color.rgb = col
        pt.space_after = Pt(6)
        
        pd = tf.add_paragraph()
        pd.text = desc
        pd.font.name = "Inter"
        pd.font.size = Pt(10.5)
        pd.font.color.rgb = TEXT_MAIN
        pd.line_spacing = 1.25

    # =========================================================================
    # SLIDE 5: Role-Based Access Control Matrix
    # =========================================================================
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide5, BG_LIGHT)
    add_header(slide5, "Role-Based Access Control (RBAC) Hierarchy", "2. Use Case Architecture & Roles")
    
    roles_data = [
        ("Student (e.g., John Smith)", "Submit proposals, upload drafts, edit thesis directly in ONLYOFFICE, review examiner feedback, submit post-defense revisions, log PhD meetings.", NAVY_LIGHT),
        ("Supervisor (e.g., Abena Osei)", "Guide candidates, conduct in-app reviews, annotate thesis in ONLYOFFICE, track 12-stage milestones, sign off on defense readiness.", ROYAL_BLUE),
        ("Examiner (Int / Ext)", "Access assigned scripts, conduct blind/open evaluations, fill structured rubric rubrics, provide in-doc comments, submit pass/correction verdicts.", AMBER),
        ("HOD (e.g., Kwame Boadu)", "Department-wide thesis pipeline oversight, allocate examiners, schedule defenses, compute final scores, provide primary academic sign-off.", ROSE),
        ("Coordinator (e.g., Yaw Asante)", "Coordinate department defense logistics, compile multi-examiner scores, track student progress, coordinate revisions.", PURPLE),
        ("Dean (e.g., Kofi Mensah)", "Faculty-wide completion analytics, review departmental defense results, grant final institutional clearance for graduation.", EMERALD),
        ("System Administrator", "User management, bulk CSV student/staff onboarding, system broadcast announcements, database maintenance, audit logs.", TEXT_MAIN),
    ]
    
    y_start = Inches(1.65)
    row_height = Inches(0.72)
    for i, (r_name, r_desc, r_col) in enumerate(roles_data):
        y_pos = y_start + i * (row_height + Inches(0.08))
        add_card(slide5, Inches(0.8), y_pos, Inches(11.7), row_height)
        
        badge = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), y_pos + Inches(0.12), Inches(2.5), Inches(0.48))
        badge.fill.solid()
        badge.fill.fore_color.rgb = r_col
        badge.line.fill.background()
        
        tb_b = slide5.shapes.add_textbox(Inches(1.0), y_pos + Inches(0.14), Inches(2.5), Inches(0.44))
        tf_b = tb_b.text_frame
        p_b = tf_b.paragraphs[0]
        p_b.text = r_name
        p_b.alignment = PP_ALIGN.CENTER
        p_b.font.name = "Inter"
        p_b.font.size = Pt(9.5)
        p_b.font.bold = True
        p_b.font.color.rgb = CARD_BG
        
        tb_d = slide5.shapes.add_textbox(Inches(3.7), y_pos + Inches(0.12), Inches(8.6), Inches(0.48))
        tf_d = tb_d.text_frame
        tf_d.word_wrap = True
        p_d = tf_d.paragraphs[0]
        p_d.text = r_desc
        p_d.font.name = "Inter"
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_MAIN

    # =========================================================================
    # SLIDE 6: Master Clean UML Use Case Diagram
    # =========================================================================
    slide6 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide6, BG_LIGHT)
    add_header(slide6, "Master Role Use Case Architecture Diagram", "2. Use Case Architecture & Roles")
    
    img_path = 'presentation_assets/usecase_master_clean.png'
    if os.path.exists(img_path):
        slide6.shapes.add_picture(img_path, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.5))

    # =========================================================================
    # SLIDE 7: Student & Supervisor Dedicated Use Case Diagram
    # =========================================================================
    slide7 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide7, BG_LIGHT)
    add_header(slide7, "UML Use Case Diagram: Student & Supervisor Lifecycle", "2. Use Case Architecture & Roles")
    
    img_stu_sup = 'presentation_assets/usecase_student_supervisor.png'
    if os.path.exists(img_stu_sup):
        slide7.shapes.add_picture(img_stu_sup, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.5))

    # =========================================================================
    # HELPER FOR SCREENSHOT WALKTHROUGH SLIDES
    # =========================================================================
    def add_page_walkthrough_slide(slide_title, sub_title, screen_filename, purpose_bullets, key_features_bullets, user_badge=None):
        s = prs.slides.add_slide(blank_layout)
        set_slide_background(s, BG_LIGHT)
        add_header(s, slide_title, sub_title)
        
        # Left side: Desktop Screenshot Container (16:9 Widescreen aspect ratio)
        add_card(s, Inches(0.8), Inches(1.6), Inches(7.4), Inches(5.3))
        
        # Check in desktop_screens first, then fallback to screens
        scr_path = os.path.join('presentation_assets/desktop_screens', screen_filename)
        if not os.path.exists(scr_path):
            scr_path = os.path.join('presentation_assets/screens', screen_filename)
            
        if os.path.exists(scr_path):
            s.shapes.add_picture(scr_path, Inches(0.9), Inches(1.7), Inches(7.2), Inches(5.1))
        
        # Right side: Explanatory Information Card
        add_card(s, Inches(8.4), Inches(1.6), Inches(4.1), Inches(5.3))
        tb = s.shapes.add_textbox(Inches(8.6), Inches(1.75), Inches(3.7), Inches(5.0))
        tf = tb.text_frame
        tf.word_wrap = True
        
        # User Badge if specified
        if user_badge:
            p_ub = tf.paragraphs[0]
            p_ub.text = f"👤 User View: {user_badge}"
            p_ub.font.name = "Inter"
            p_ub.font.size = Pt(11)
            p_ub.font.bold = True
            p_ub.font.color.rgb = ROYAL_BLUE
            p_ub.space_after = Pt(6)
            p1 = tf.add_paragraph()
        else:
            p1 = tf.paragraphs[0]

        p1.text = "📌 Page Purpose & Meaning"
        p1.font.name = "Inter"
        p1.font.size = Pt(13)
        p1.font.bold = True
        p1.font.color.rgb = NAVY_DARK
        p1.space_after = Pt(4)
        
        for b in purpose_bullets:
            p = tf.add_paragraph()
            p.text = "• " + b
            p.font.name = "Inter"
            p.font.size = Pt(10)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(3)
            
        p2 = tf.add_paragraph()
        p2.text = "\n⚡ Key System Capabilities"
        p2.font.name = "Inter"
        p2.font.size = Pt(13)
        p2.font.bold = True
        p2.font.color.rgb = ROYAL_BLUE
        p2.space_after = Pt(4)
        
        for b in key_features_bullets:
            p = tf.add_paragraph()
            p.text = "✔ " + b
            p.font.name = "Inter"
            p.font.size = Pt(10)
            p.font.color.rgb = TEXT_MAIN
            p.space_after = Pt(3)
            
        return s

    # =========================================================================
    # SLIDE 8: Public Research Catalog (Desktop View)
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 1: Public Research Catalog & Faculty Portals (`/`)",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "public_catalog_desktop.png",
        [
            "Front-facing portal showcasing GIMPA's approved dissertations and academic works.",
            "Open to global researchers and students without requiring upfront authentication.",
            "Organized by 4 faculty portals: GBS, SPSG, Law, and SOTSS."
        ],
        [
            "Trending, Highest Rated, & Most Downloaded publication tabs.",
            "Real-time search bar with instant query matching.",
            "Departmental filter cards for focused literature discovery.",
            "Direct sign-in gateway button for registered students and staff."
        ],
        "Public / Unauthenticated"
    )

    # =========================================================================
    # SLIDE 9: Search & Discovery Engine (Desktop View)
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 2: Advanced Search & Discovery Engine (`/search`)",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "search_discovery_desktop.png",
        [
            "Multi-field research search engine for deep literature discovery across GIMPA repositories.",
            "Enables filtering by author, title, supervisor, abstract keywords, year, and degree.",
            "Supports faceted exploration of institutional research trends and publication output."
        ],
        [
            "Multi-field boolean filtering (Undergraduate, Masters, MPhil, PhD).",
            "Interactive publication preview drawer with abstract viewer.",
            "Citation metadata generator and direct download triggers.",
            "Instant sorting by publication date and download count."
        ],
        "Public / Unauthenticated"
    )

    # =========================================================================
    # SLIDE 10: Authentication & Secure Sign-In (Desktop View)
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 3: Authentication & Role-Based Login (`/login`)",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "login_screen_desktop.png",
        [
            "Single secure gateway for all 7 roles using university credentials (Student ID / Email).",
            "Implements JWT stateless session tokens with SHA-256 cryptographic signatures.",
            "Automatically detects user permissions and routes them to their personalized dashboard."
        ],
        [
            "Instant institutional credential verification with bcrypt password hashing.",
            "Clean desktop split-panel layout with university statistics display.",
            "Automatic role-based route dispatch upon successful sign-in.",
            "Protected API endpoints preventing unauthorized URL access."
        ],
        "All Institutional Users"
    )

    # =========================================================================
    # SLIDE 11: Student Dashboard — John Smith (Desktop View)
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 4: Student Dashboard & Submission Pipeline",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "student_dashboard_desktop.png",
        [
            "Personalized command center for candidates to submit proposals and monitor progress.",
            "Displays the live 6-phase academic lifecycle banner with active phase indicators.",
            "Contains the dedicated ONLYOFFICE In-App Revision panel for in-browser editing."
        ],
        [
            "Proposal & Thesis upload form (Title, Abstract, Department, Degree Level).",
            "Live phase progress tracker with status badges.",
            "Examiner feedback box showing compiled defense remarks.",
            "One-click 'Submit In-System ONLYOFFICE Edits' workflow."
        ],
        "John Smith (Student)"
    )

    # =========================================================================
    # SLIDE 12: ONLYOFFICE In-App DOCX Editing & Margin Comments
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 5: ONLYOFFICE In-App DOCX Editing & Feedback Engine",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "document_comments.png",
        [
            "Embedded enterprise document editor (ONLYOFFICE Docs) for browser-based DOCX editing.",
            "Allows supervisors and examiners to annotate drafts with margin comments and highlights.",
            "Automatically persists and commits edits back to the repository upon document closure."
        ],
        [
            "Full Microsoft Word (.docx) feature fidelity directly in the browser.",
            "Collaborative change tracking and margin feedback thread view.",
            "Dual modes: Working Thesis Editor and Feedback Comments Document.",
            "Secure tokenized callback API preventing unauthorized document access."
        ],
        "John Smith / Supervisor / Examiner"
    )

    # =========================================================================
    # SLIDE 13: Lecturer & Supervisor Hub — Abena Osei (Desktop View)
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 6: Lecturer & Supervisor Management Portal",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "lecturer_supervisor_examiner_dashboard_desktop.png",
        [
            "Operational hub for Lecturers and Supervisors to oversee assigned supervisees.",
            "Provides quick access to candidate drafts, meeting logs, and milestone submissions.",
            "Allows supervisors to perform in-doc reviews and sign off on thesis defense readiness."
        ],
        [
            "Active supervisees table with real-time submission status.",
            "Direct button to open student thesis in ONLYOFFICE Word editor.",
            "Milestone verification and PhD meeting logger validation.",
            "Defense readiness authorization sign-off workflow."
        ],
        "Abena Osei (Lecturer / Supervisor)"
    )

    # =========================================================================
    # SLIDE 14: Head of Department (HOD) Portal — Kwame Boadu (Desktop View)
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 7: Head of Department (HOD) Oversight Portal",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "hod_dashboard_desktop.png",
        [
            "Departmental governance portal for HODs to manage thesis pipelines across their department.",
            "Enables assigning Internal and External Examiners to submitted student theses.",
            "Aggregates defense scores and issues primary departmental Phase 5 sign-offs."
        ],
        [
            "Department-wide thesis pipeline summary and candidate queues.",
            "Examiner allocation modal: Assign Internal & External faculty.",
            "Final grade compiler: Computes (S1 + S2)/2 scores automatically.",
            "Phase 5 dual sign-off authorization engine (Supervisor -> HOD)."
        ],
        "Kwame Boadu (Head of Department)"
    )

    # =========================================================================
    # SLIDE 15: Project Coordinator Hub — Yaw Asante (Desktop View)
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 8: Project Coordinator Defense Logistics Hub",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "coordinator_dashboard_desktop.png",
        [
            "Coordination center for Programme Coordinators to schedule defense panels and track scripts.",
            "Monitors examiner evaluation queues and ensures timely return of defense rubric scores.",
            "Facilitates post-defense revision tracking between candidates and defense committees."
        ],
        [
            "Defense panel scheduling and examiner script distribution.",
            "Examiner submission progress tracker with overdue alert flags.",
            "Departmental defense score compilation and rubric verification.",
            "Post-defense correction compliance and clearance sign-off."
        ],
        "Yaw Asante (Project Coordinator)"
    )

    # =========================================================================
    # SLIDE 16: Dean Faculty Oversight Portal — Kofi Mensah (Desktop View)
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 9: Dean Faculty Oversight & Analytics Portal",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "dean_dashboard_desktop.png",
        [
            "High-level strategic oversight dashboard for Deans to review faculty-wide academic output.",
            "Provides completion rate metrics, cross-departmental analytics, and thesis archives.",
            "Authorizes final institutional clearance for graduating candidate cohorts."
        ],
        [
            "Faculty-wide completion KPIs and departmental throughput metrics.",
            "Comprehensive review of approved defense scores and examiner verdicts.",
            "Final faculty clearance sign-off for library publishing and graduation.",
            "Accreditation report export and academic integrity audit tracking."
        ],
        "Kofi Mensah (Dean of Faculty)"
    )

    # =========================================================================
    # SLIDE 17: PhD Hub: 12-Stage Supervision Framework
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 10: PhD Hub — 12-Stage Doctoral Progression Matrix",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "phd_supervision_logs.png",
        [
            "Dedicated doctoral governance module enforcing the 12 mandatory PhD progression stages.",
            "Spans Concept Paper approval through Fieldwork, 3x Publications, to Final Viva Defense.",
            "Logs supervision meetings, discussion summaries, and next milestone deliverables."
        ],
        [
            "12-Stage visual milestone progression bar with completion checks.",
            "Supervision Meeting Logger: Captures meeting notes and action items.",
            "Days-since-last-meeting counter with automated yellow/red warning flags.",
            "Doctoral publication verification tab ensuring accreditation compliance."
        ],
        "Dean / HOD / PhD Supervisors"
    )

    # =========================================================================
    # SLIDE 18: PhD Candidate Dossiers & Inactivity Risk Tracker
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 11: PhD Student Dossiers & Inactivity Risk Tracker",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "phd_hub_dossiers.png",
        [
            "Complete candidate directory enabling Deans and HODs to audit doctoral progress.",
            "Highlights dormant candidates who have not had a supervision meeting in >30 or >60 days.",
            "Single source of truth for doctoral accreditation and viva readiness."
        ],
        [
            "Summary KPI header: Active Doctoral Candidates, At Risk, Progress Rate.",
            "Candidate Dossier Cards: Department, Stage Number, Current Milestone.",
            "Multi-filter search by department and supervision compliance status.",
            "One-click drilldown into complete 12-stage milestone logs."
        ],
        "Kofi Mensah (Dean) / HODs"
    )

    # =========================================================================
    # SLIDE 19: System Administration & User Management Portal
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 12: System Administration & User Management Portal",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "admin_management.png",
        [
            "Administrative command center for managing user accounts, security, and broadcast banners.",
            "Allows assigning multi-role matrices, elevating permissions, and resetting passwords.",
            "Includes the Broadcast Engine to dispatch real-time targeted alerts across dashboards."
        ],
        [
            "User accounts directory with instant search by name, email, and school ID.",
            "Inline role switcher (promote/demote roles with instant DB commit).",
            "Broadcast Announcement Engine with targeted role scoping.",
            "System health diagnostics, active user sessions, and database maintenance."
        ],
        "System Administrator"
    )

    # =========================================================================
    # SLIDE 20: Bulk CSV Student & Staff Onboarding Engine
    # =========================================================================
    add_page_walkthrough_slide(
        "Page 13: Bulk CSV Student & Staff Onboarding Engine",
        "3. Page-by-Page System Walkthrough (Desktop View)",
        "bulk_csv_import.png",
        [
            "High-throughput data ingestion tool for onboarding entire academic cohorts in seconds.",
            "Parses university SIS CSV files containing Student ID, Name, Email, School, and Dept.",
            "Automatically provisions secure hashed accounts and triggers welcome credential emails."
        ],
        [
            "Drag-and-drop CSV file uploader with automated schema validation.",
            "Duplicate record detection and existing profile update logic.",
            "Real-time import progress bar and detailed error summary reports.",
            "Automatic assignment of degree tracks (Undergrad / Masters / PhD)."
        ],
        "System Administrator"
    )

    # =========================================================================
    # SLIDE 21: 12-Stage PhD Progression Framework Diagram
    # =========================================================================
    slide21 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide21, BG_LIGHT)
    add_header(slide21, "PhD Hub: 12-Stage Doctoral Progression Framework", "4. Technical Excellence & Governance")
    
    img_phd = 'presentation_assets/phd_12stages_diagram.png'
    if os.path.exists(img_phd):
        slide21.shapes.add_picture(img_phd, Inches(0.8), Inches(1.5), Inches(11.7), Inches(5.4))

    # =========================================================================
    # SLIDE 22: Security, Compliance & Audit Trails
    # =========================================================================
    slide22 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide22, BG_LIGHT)
    add_header(slide22, "Enterprise Security, Compliance & Audit Trails", "4. Technical Excellence & Governance")
    
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
        add_card(slide22, l, Inches(1.8), Inches(3.7), Inches(5.0))
        strip = slide22.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, Inches(1.8), Inches(3.7), Inches(0.12))
        strip.fill.solid()
        strip.fill.fore_color.rgb = col
        strip.line.fill.background()
        
        tb = slide22.shapes.add_textbox(l + Inches(0.25), Inches(2.1), Inches(3.2), Inches(4.4))
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
    # SLIDE 23: Live Server Deployment & Operations
    # =========================================================================
    slide23 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide23, BG_LIGHT)
    add_header(slide23, "Live Production Deployment & Infrastructure", "4. Technical Excellence & Governance")
    
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
        
        add_card(slide23, left, top, Inches(5.7), Inches(1.45))
        strip = slide23.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(0.12), Inches(1.45))
        strip.fill.solid()
        strip.fill.fore_color.rgb = col
        strip.line.fill.background()
        
        tb = slide23.shapes.add_textbox(left + Inches(0.3), top + Inches(0.15), Inches(5.2), Inches(1.15))
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
    # SLIDE 24: Conclusion & Institutional Benefits
    # =========================================================================
    slide24 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide24, NAVY_DARK)
    
    bar = slide24.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.4), Inches(7.5))
    bar.fill.solid()
    bar.fill.fore_color.rgb = GOLD
    bar.line.fill.background()

    tb = slide24.shapes.add_textbox(Inches(1.2), Inches(1.0), Inches(11.0), Inches(5.5))
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
    p.text = "Key Institutional Outcomes & Next Steps"
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
    output_filename = "GIMPA_Thesis_Repository_System_Presentation_v3.pptx"
    prs.save(output_filename)
    print(f"Presentation saved successfully to: {os.path.abspath(output_filename)}")
    
    try:
        prs.save("GIMPA_Thesis_Repository_System_Presentation.pptx")
        print("Also updated primary presentation file.")
    except Exception as e:
        print(f"Primary file locked: {e}")

create_presentation()
