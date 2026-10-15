import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_phd_hub_documentation_docx(output_path):
    doc = Document()

    # Page setup - Margins (1 inch)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # GIMPA Brand Colors
    COLOR_PRIMARY = RGBColor(0x00, 0x33, 0x66)    # Deep GIMPA Blue (#003366)
    COLOR_SECONDARY = RGBColor(0xC5, 0x9B, 0x27)  # GIMPA Gold (#C59B27)
    COLOR_TEXT = RGBColor(0x2D, 0x37, 0x48)       # Charcoal Body (#2D3748)
    COLOR_MUTED = RGBColor(0x71, 0x80, 0x96)      # Muted Gray (#718096)
    COLOR_EMERALD = RGBColor(0x05, 0x96, 0x69)    # Emerald (#059669)
    COLOR_AMBER = RGBColor(0xD9, 0x77, 0x06)      # Amber (#D97706)

    HEX_PRIMARY = "003366"
    HEX_SECONDARY = "C59B27"
    HEX_BG_LIGHT = "F8FAFC"
    HEX_CALLOUT_BG = "F0F4F8"
    HEX_BORDER = "CBD5E1"
    HEX_ALERT_BG = "FFFBEB"
    HEX_ALERT_BORDER = "FDE68A"

    # Base Normal Style setup
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = COLOR_TEXT

    # Helpers
    def set_cell_background(cell, fill_hex):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(
            f'<w:tcMar {nsdecls("w")}>'
            f'<w:top w:w="{top}" w:type="dxa"/>'
            f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
            f'<w:left w:w="{left}" w:type="dxa"/>'
            f'<w:right w:w="{right}" w:type="dxa"/>'
            f'</w:tcMar>'
        )
        tcPr.append(tcMar)

    def set_table_borders(table, color="CBD5E1"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
            f'<w:bottom w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
            f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
            f'<w:insideV w:val="none"/>'
            f'<w:left w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    def add_title_header(title, subtitle):
        p_inst = doc.add_paragraph()
        p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_inst.paragraph_format.space_before = Pt(18)
        p_inst.paragraph_format.space_after = Pt(2)
        r_inst = p_inst.add_run("GHANA INSTITUTE OF MANAGEMENT AND PUBLIC ADMINISTRATION (GIMPA)")
        r_inst.font.name = 'Calibri'
        r_inst.font.size = Pt(11)
        r_inst.bold = True
        r_inst.font.color.rgb = COLOR_SECONDARY

        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(title)
        run.font.name = 'Calibri'
        run.font.size = Pt(24)
        run.bold = True
        run.font.color.rgb = COLOR_PRIMARY

        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sub.paragraph_format.space_before = Pt(0)
        p_sub.paragraph_format.space_after = Pt(18)
        run_sub = p_sub.add_run(subtitle)
        run_sub.font.name = 'Calibri'
        run_sub.font.size = Pt(13)
        run_sub.font.color.rgb = COLOR_MUTED

        # Divider line
        p_line = doc.add_paragraph()
        p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_line.paragraph_format.space_after = Pt(20)
        r_line = p_line.add_run("―" * 45)
        r_line.font.color.rgb = COLOR_SECONDARY
        r_line.bold = True

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(22)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(16)
        run.bold = True
        run.font.color.rgb = COLOR_PRIMARY

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(13)
        run.bold = True
        run.font.color.rgb = COLOR_SECONDARY

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(11.5)
        run.bold = True
        run.font.color.rgb = COLOR_PRIMARY

    def add_p(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(text)
        run.font.name = 'Calibri'
        run.font.size = Pt(11)
        run.font.color.rgb = COLOR_TEXT
        return p

    def add_bullet(text, prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if prefix:
            r_pre = p.add_run(prefix)
            r_pre.bold = True
            r_pre.font.color.rgb = COLOR_PRIMARY
        r_text = p.add_run(text)
        r_text.font.color.rgb = COLOR_TEXT

    def add_callout(text, title="KEY REGULATORY REQUIREMENT", border_color="003366", bg_color="F0F4F8"):
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        cell.width = Inches(6.5)
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=140, bottom=140, left=180, right=180)

        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>'
            f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
            f'<w:top w:val="none"/>'
            f'<w:bottom w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'</w:tcBorders>'
        )
        tcPr.append(borders)

        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(4)
        r_title = p.add_run(title)
        r_title.bold = True
        r_title.font.size = Pt(10.5)
        r_title.font.color.rgb = COLOR_PRIMARY

        p2 = cell.add_paragraph()
        p2.paragraph_format.space_after = Pt(0)
        p2.paragraph_format.line_spacing = 1.15
        r_text = p2.add_run(text)
        r_text.font.size = Pt(10)
        r_text.font.color.rgb = COLOR_TEXT

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # ------------------ DOCUMENT GENERATION ------------------

    # Document Header Title
    add_title_header(
        "PhD Programme & Doctoral Research Hub",
        "Comprehensive Operational Workflow & User Documentation"
    )

    # Metadata Summary Box
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, "CBD5E1")
    metadata_rows = [
        ("Institutional Platform:", "GIMPA Thesis & Research Repository System"),
        ("System Module:", "Doctoral Degree & Research Hub (PhD Hub)"),
        ("Regulatory Alignment:", "Ghana Tertiary Education Commission (GTEC) & GIMPA Postgrad Regulations"),
        ("Target Stakeholders:", "PhD Candidates, Research Supervisors, Coordinators, HODs, Deans, Administrators"),
        ("Document Status & Version:", "Official Operational Manual — Version 1.0 (Live Production)")
    ]
    for i, (label, val) in enumerate(metadata_rows):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = Inches(2.2), Inches(4.3)
        set_cell_background(c0, "F8FAFC")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, 80, 80, 100, 100)
        set_cell_margins(c1, 80, 80, 100, 100)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(label)
        r0.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = COLOR_PRIMARY
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(val)
        r1.font.size = Pt(9.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Section 1
    add_h1("1. Executive Overview & Institutional Purpose")
    add_p(
        "The GIMPA PhD Programme & Doctoral Research Hub is a mission-critical subsystem within the GIMPA Thesis & "
        "Repository Platform. It is engineered specifically to govern, monitor, and document the rigorous multi-year "
        "journey of doctoral candidates from coursework admission through dissertation defense and graduation."
    )
    add_p(
        "Doctoral programs require heightened supervisory oversight, strict research ethics compliance, formal examination "
        "milestones, and continuous archival of documentation for accreditation reviews conducted by the Ghana Tertiary Education "
        "Commission (GTEC). The PhD Hub eliminates data silos and manual paper trails by centralizing doctoral dossiers, "
        "supervision consultation logs, research seminars, comprehensive exams, teaching practice hours, bi-annual reviews, and "
        "institutional reaccreditation folders into a single, role-secured digital environment."
    )

    add_callout(
        "GIMPA doctoral regulations mandate that every registered PhD candidate must participate in at least one formal "
        "supervisory consultation every month. The system automatically monitors meeting continuity and triggers an institutional "
        "early-warning alert whenever a doctoral candidate exceeds 60 days without recorded supervisory contact.",
        "MANDATORY DOCTORAL SUPERVISION POLICY"
    )

    # Section 2
    add_h1("2. Participating Stakeholders & Role-Based Access Control (RBAC)")
    add_p(
        "To protect student records, supervisory feedback, and institutional evaluations, the PhD Hub implements strict "
        "Role-Based Access Control (RBAC). Non-doctoral accounts (such as undergraduate students or general library staff) "
        "are forbidden from accessing this module."
    )

    rbac_table = doc.add_table(rows=7, cols=4)
    rbac_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(rbac_table, "CBD5E1")

    headers = ["Role", "Access Scope", "Core Responsibilities", "Regulatory Reminder Powers"]
    hdr_widths = [Inches(1.4), Inches(1.2), Inches(2.6), Inches(1.3)]
    for j, h in enumerate(headers):
        cell = rbac_table.rows[0].cells[j]
        cell.width = hdr_widths[j]
        set_cell_background(cell, "003366")
        set_cell_margins(cell, 100, 100, 100, 100)
        p = cell.paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    rbac_data = [
        ("PhD Candidate", "Self Only", "Views degree milestones, supervisory feedback, exam standing. Records seminars and teaching practice.", "None"),
        ("Research Supervisor", "Assigned Supervisees", "Logs monthly 12-stage meetings, sets deadlines, conducts 6-month progress reviews.", "Can dispatch email reminders to own supervisees"),
        ("Project Coordinator", "Departmental", "Coordinates doctoral coursework, records comprehensive exam outcomes, tracks compliance.", "Can dispatch department-wide regulatory notices"),
        ("Head of Dept (HOD)", "Departmental", "Oversees faculty workloads, confirms examination results, uploads accreditation evidence.", "Can dispatch department-wide regulatory notices"),
        ("Dean of School", "School-Wide", "Strategic oversight of doctoral throughput, candidacy rates, and reaccreditation folders across all depts.", "Can dispatch school-wide regulatory notices"),
        ("System Administrator / Rector", "Institution-Wide", "Full institutional visibility, system audits, user management, and regulatory compliance oversight.", "Full institutional dispatch authority")
    ]

    for i, row in enumerate(rbac_data):
        r_cells = rbac_table.rows[i + 1].cells
        for j, val in enumerate(row):
            r_cells[j].width = hdr_widths[j]
            set_cell_background(r_cells[j], "F8FAFC" if i % 2 == 1 else "FFFFFF")
            set_cell_margins(r_cells[j], 80, 80, 100, 100)
            p = r_cells[j].paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9)
            if j == 0:
                r.bold = True
                r.font.color.rgb = COLOR_PRIMARY

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Section 3
    add_h1("3. The 12-Stage Doctoral Research Lifecycle")
    add_p(
        "Each doctoral dissertation tracked in the Hub advances through a structured 12-stage sequential lifecycle. "
        "Supervisors formally tag the exact research stage during every recorded supervisory consultation:"
    )

    stages = [
        ("Stage 1: Proposal Preparation", "Formulation of research questions, theoretical gaps, and preliminary literature review."),
        ("Stage 2: Proposal Defence & Ethics Sign-Off", "Formal oral defense before the departmental board and approval by the GIMPA Research Ethics Board."),
        ("Stage 3: Literature Review & Theoretical Framework", "Comprehensive critical review of scholarship and grounding in relevant conceptual paradigms."),
        ("Stage 4: Methodology & Research Design", "Philosophical underpinnings, research strategies, sampling framework, and measurement validity."),
        ("Stage 5: Instrument Development & Pilot Study", "Creation of data collection instruments (surveys, interview schedules) and pilot reliability checks."),
        ("Stage 6: Data Collection & Fieldwork", "Execution of primary data collection, institutional fieldwork, or secondary archival extraction."),
        ("Stage 7: Data Analysis & Interpretation", "Quantitative statistical estimation (e.g., PLS-SEM, regression) or qualitative thematic synthesis."),
        ("Stage 8: Empirical Findings & Discussion", "Analytical reporting of results, hypothesis testing, and theoretical/practical implications."),
        ("Stage 9: Full Draft Synthesis & Turnitin Originality Check", "Integration of all chapters into a complete dissertation draft adhering to similarity ceilings."),
        ("Stage 10: Departmental Seminar / Internal Review", "Full oral presentation of findings before departmental faculty and fellow doctoral students."),
        ("Stage 11: External Examination Submission", "Formal dispatch of completed dissertation to Academic Board appointed external examiners."),
        ("Stage 12: Oral Examination (Viva Voce) & Final Corrections", "Public defense before the Oral Examination Board and final library-approved binding.")
    ]

    for title, desc in stages:
        add_bullet(f" {desc}", title)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Section 4
    add_h1("4. In-Depth Guide to the 7 Core Modules")
    add_p("The PhD Hub is organized into seven specialized tabs accessible from the navigation bar:")

    add_h2("Module 1: PhD Student Dossiers & Progress Overview")
    add_p(
        "The Dossiers view serves as the operational homepage. It provides executive statistics and detailed student cards for every "
        "doctoral candidate within the user's authorized scope."
    )
    add_bullet("Displays total enrolled PhD candidates, doctoral candidates (passed comp exam), 60-day inactivity count, and completed teaching requirements.", "Top Metrics Banner: ")
    add_bullet("Candidate photo, degree program, specialization, current research stage, candidacy badge, seminar attendance counters, teaching completion badge, assigned supervisors, and last recorded meeting date.", "Dossier Detail Card: ")
    add_bullet("Allows real-time searching by candidate name, student ID, specialization, or active research stage.", "Instant Search & Filter: ")

    add_h2("Module 2: 12-Stage Supervision Logs")
    add_p(
        "This module tracks monthly research consultations. Supervisors record meeting mode, stage progress, student deliverables, "
        "critique provided, assigned tasks, and progress ratings (Satisfactory, Needs Improvement, or Critical Concern)."
    )
    add_bullet("Supervisors click 'Record Supervision Meeting', select candidate and meeting mode (In-Person, Zoom, Hybrid), choose research stage (1-12), type qualitative feedback and next deliverables, and submit.", "Logging Workflow: ")
    add_bullet("The doctoral candidate receives an immediate in-app notification and email confirmation summarizing the meeting notes and assigned tasks.", "Automated Student Notification: ")
    add_bullet("Candidates can review the full chronological archive of all previous supervisory consultations to ensure they address all recommended revisions.", "Historical Audit Trail: ")

    add_h2("Module 3: 7-Type Research Seminars Tracker")
    add_p(
        "Doctoral candidates are required to build scholarly competency by participating in seven mandated seminar categories. "
        "Both attendance and oral presentations are recorded and tracked towards graduation requirements."
    )
    add_bullet("Departmental Research Seminar, GIMPA Doctoral Colloquium, National/GAAS Academic Conference, International Peer-Reviewed Conference, Methodology Workshop, Proposal Defence Seminar, Pre-Viva Final Seminar.", "7 Mandated Categories: ")
    add_bullet("Candidates or evaluators enter the seminar category, paper title, date, venue/URL, role (Presenter vs. Attendee), evaluator remarks, and verdict (Pass, Distinction, Resit).", "Recording Process: ")

    add_h2("Module 4: Comprehensive Examination & Candidacy Advancement")
    add_p(
        "The Comprehensive Examination validates doctoral competency in theory, methodology, and the chosen specialization. "
        "The system records sittings and automates formal candidacy transitions."
    )
    add_bullet("Major Field Theory, Research Methodology & Analytical Tools, and Area of Specialization.", "3 Examination Parts: ")
    add_bullet("Project Coordinators and HODs record candidate sittings, attempt number (1 or 2), score, result (Pass, Fail, Resit), and committee members.", "Coordination Workflow: ")
    add_bullet("When a candidate achieves a 'Pass' result, the system automatically elevates their institutional standing from Pre-Candidacy to PhD Candidate.", "Automatic Candidacy Promotion: ")

    add_h2("Module 5: Teaching Practice Requirement")
    add_p(
        "Doctoral pedagogical development requires candidates to fulfill undergraduate or diploma teaching hours under faculty supervision."
    )
    add_bullet("Candidates or supervising faculty record course code, semester, academic year, total contact hours (e.g., 45 hrs), and teaching duties performed (seminar tutoring, lab assistance, grading support).", "Hours Tracking: ")
    add_bullet("Supervising faculty provide qualitative observation feedback and assign a performance rating.", "Faculty Assessment: ")

    add_h2("Module 6: Six-Month Progress Evaluations")
    add_p(
        "A formal bi-annual evaluation conducted by the supervisory committee and department leadership to assess cumulative progress."
    )
    add_bullet("Coursework GPA, dissertation chapter progress, seminars presented, and teaching hours delivered.", "Evaluation Dimensions: ")
    add_bullet("Overall rating (Satisfactory, Marginal, Unsatisfactory), detailed action plan for the next 6 months, and an agreed milestone follow-up date.", "Outcomes & Action Plan: ")

    add_h2("Module 7: 18 Reaccreditation Folders")
    add_p(
        "A pre-structured digital quality assurance repository corresponding to the official GTEC and institutional accreditation filing system. "
        "Leadership and administrative coordinators upload and archive verified evidence documents across 18 designated folders:"
    )

    folders_list = [
        ("Folder 1", "Programme Approval & Accreditation Documents"),
        ("Folder 2", "Curriculum, Syllabi & Course Outlines"),
        ("Folder 3", "Admission Records & Interview Rubrics"),
        ("Folder 4", "Enrolment & Specialization Registers"),
        ("Folder 5", "Course Registration & Grade Submissions"),
        ("Folder 6", "Comprehensive Examination Records"),
        ("Folder 7", "Thesis Proposal Approvals & Ethics Sign-Off"),
        ("Folder 8", "Supervision Meeting Logs & Workload Reports"),
        ("Folder 9", "Research Seminar Registers (7 Types)"),
        ("Folder 10", "Teaching Requirement Observation Reports"),
        ("Folder 11", "Six-Month Student Progress Evaluation Reports"),
        ("Folder 12", "Thesis Examination, Viva & Examiner Reports"),
        ("Folder 13", "Graduate Output, Titles & Completions"),
        ("Folder 14", "Staff Profiles, PhD Qualifications & Ranks"),
        ("Folder 15", "Faculty Research Publications & Grants"),
        ("Folder 16", "Library Holdings, Databases & Facility Resources"),
        ("Folder 17", "Student Satisfaction & Supervision Surveys"),
        ("Folder 18", "Quality Assurance Audits & Action Plans")
    ]

    for f_id, f_name in folders_list:
        add_bullet(f"{f_name}", f"{f_id}: ")

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # Section 5
    add_h1("5. Regulatory 60-Day Inactivity Early-Warning System")
    add_p(
        "To prevent student stalling and supervisory dormancy, the PhD Hub continuously calculates the elapsed days since each candidate's "
        "last recorded supervisory session:"
    )
    add_bullet("If elapsed days exceed 60 days (or if an enrolled candidate has zero recorded meetings), an amber alert badge ('Alert: >60d Inactive') is displayed on their dossier.", "Automated Detection: ")
    add_bullet("Supervisors, Coordinators, HODs, Deans, and Administrators see an alert banner at the top of the PhD Hub summarizing inactive candidates.", "Leadership Warning Banner: ")
    add_bullet("Clicking 'Dispatch Regulatory Reminders (Email)' sends an official dual-notification email directly to both the student and their assigned supervisors.", "One-Click Dispatch: ")

    add_callout(
        "The automated email notification clearly references GIMPA postgraduate regulations, highlights the risk of academic dormancy, "
        "and instructs both the candidate and supervisor to schedule and log an immediate consultation in the PhD Hub.",
        "AUTOMATED EMAIL NOTIFICATION TEMPLATE"
    )

    # Section 6
    add_h1("6. Step-by-Step User Guides by Role")

    add_h2("A. Step-by-Step Guide for PhD Candidates")
    add_bullet("Log into the GIMPA Repository portal and click 'PhD Hub' in the navigation bar.", "Step 1: Accessing the Hub — ")
    add_bullet("Under 'My PhD Dossier', check your current research stage, candidacy status, and assigned supervisor details.", "Step 2: Checking Milestone Status — ")
    add_bullet("Open '12-Stage Supervision Logs' to read qualitative feedback, meeting minutes, and next task deadlines recorded by your supervisor.", "Step 3: Reviewing Meeting Guidance — ")
    add_bullet("Open '7-Type Research Seminars', click 'Record Seminar', select the category, enter your paper title, indicate whether you presented or attended, and submit.", "Step 4: Logging Academic Seminars — ")
    add_bullet("Open 'Teaching Practice' and record courses tutored, semester details, and contact hours.", "Step 5: Logging Teaching Hours — ")

    add_h2("B. Step-by-Step Guide for Research Supervisors")
    add_bullet("Log in and navigate to 'PhD Hub'. The dossier list is automatically scoped to display only your assigned doctoral supervisees.", "Step 1: Viewing Supervisees — ")
    add_bullet("Click '12-Stage Supervision Logs' and click 'Record Supervision Meeting'. Select the candidate, meeting date, mode, research stage (1-12), type feedback and assigned deliverables, and click Save.", "Step 2: Logging Monthly Meetings — ")
    add_bullet("Open '6-Month Progress Reviews', select the student, review their milestones, enter coursework GPA, assign an overall rating, and define the 6-month action plan.", "Step 3: Conducting Bi-Annual Evaluations — ")
    add_bullet("If an amber inactivity badge appears, click 'Email Supervisee Reminder' to dispatch an automated regulatory compliance email.", "Step 4: Inactivity Resolution — ")

    add_h2("C. Step-by-Step Guide for Project Coordinators & HODs")
    add_bullet("Open 'PhD Hub' to inspect the progress and supervisor allocations of all doctoral students across your department.", "Step 1: Departmental Oversight — ")
    add_bullet("Open 'Comprehensive Exam & Candidacy', click 'Record Comprehensive Exam Result', enter candidate marks and committee members. If marked 'Pass', the candidate is automatically promoted to 'PhD Candidate'.", "Step 2: Recording Comprehensive Exams — ")
    add_bullet("Click 'Dispatch Regulatory Reminders (Email)' on the alert banner to broadcast reminders to all inactive students and supervisors in the department.", "Step 3: Regulatory Email Reminders — ")
    add_bullet("Navigate to '18 Reaccreditation Folders', select the appropriate folder, click 'Upload Evidence Document', and attach the required accreditation evidence.", "Step 4: Managing Accreditation Evidence — ")

    add_h2("D. Step-by-Step Guide for Deans & Executive Leadership")
    add_bullet("Review executive metric cards at the top of the hub for school-wide doctoral enrollment, candidacy transition rates, and 60-day inactivity counts.", "Step 1: School-Wide Analytics — ")
    add_bullet("Verify that faculty are actively conducting monthly supervisory meetings and that candidates are progressing through the 12 stages without prolonged dormancy.", "Step 2: Quality Assurance Audits — ")
    add_bullet("Inspect the 18 Reaccreditation Folders ahead of institutional or GTEC accreditation visits to ensure complete documentary compliance.", "Step 3: Accreditation Verification — ")

    # Section 7
    add_h1("7. GTEC & Institutional Accreditation Checklist")
    add_p(
        "To ensure readiness for external accreditation audits by the Ghana Tertiary Education Commission (GTEC), the department "
        "and school must verify the following items within the PhD Hub:"
    )
    add_bullet("All enrolled doctoral students have an assigned supervisor and active dossier.", "[ ] Student Dossier Verification: ")
    add_bullet("Every active candidate has at least one recorded supervisory log per month across the 12 stages.", "[ ] Monthly Meeting Continuity: ")
    add_bullet("Comprehensive examination sittings, scores, and committee rubrics are logged in Module 4.", "[ ] Comprehensive Exam Records: ")
    add_bullet("Seminar attendance registers across all 7 categories are uploaded in Module 3 & Folder 9.", "[ ] Research Seminar Compliance: ")
    add_bullet("Undergraduate and diploma teaching hours are formally evaluated in Module 5 & Folder 10.", "[ ] Teaching Practice Records: ")
    add_bullet("Formal bi-annual progress reviews are signed off in Module 6 & Folder 11.", "[ ] Six-Month Evaluations: ")
    add_bullet("Institutional governance documents, course outlines, and staff profiles are updated in Folders 1-18.", "[ ] 18 Reaccreditation Folders: ")

    doc.add_paragraph().paragraph_format.space_after = Pt(24)

    # Closing sign-off block
    p_end = doc.add_paragraph()
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = p_end.add_run("― End of Official GIMPA PhD Hub Documentation ―")
    r_end.font.size = Pt(10)
    r_end.font.color.rgb = COLOR_MUTED
    r_end.italic = True

    # Save document
    doc.save(output_path)
    print(f"Successfully generated PhD Hub Word documentation at: {output_path}")

if __name__ == '__main__':
    output_docx = os.path.join(r"D:\NSS\GIMPA_Thesis_Repository_Bootstrap", "GIMPA_PhD_Hub_User_and_Operational_Documentation.docx")
    create_phd_hub_documentation_docx(output_docx)
