from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field, model_validator
from typing import Optional


class PhDSupervisionLogCreate(BaseModel):
    student_id: int
    meeting_date: date
    meeting_mode: str = "In-Person"
    research_stage: str = "Proposal Preparation"
    work_submitted: Optional[str] = None
    feedback_given: Optional[str] = None
    next_task: Optional[str] = None
    progress_rating: str = "Satisfactory"
    supervisor_concerns: Optional[str] = None
    action_required: Optional[str] = None


class PhDSupervisionLogRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    supervisor_id: int
    supervisor_name: Optional[str] = None
    meeting_date: date
    meeting_mode: str
    research_stage: str
    work_submitted: Optional[str] = None
    feedback_given: Optional[str] = None
    next_task: Optional[str] = None
    progress_rating: str
    supervisor_concerns: Optional[str] = None
    action_required: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PhDSeminarCreate(BaseModel):
    student_id: int
    seminar_title: Optional[str] = None
    title: Optional[str] = None
    seminar_category: str
    seminar_date: date
    attended: bool = True
    is_presenter: bool = False
    department: Optional[str] = None
    venue_or_url: Optional[str] = None
    evidence_url: Optional[str] = None
    evaluator_name: Optional[str] = None
    evaluator_feedback: Optional[str] = None
    score_or_verdict: Optional[str] = "Pass"
    remarks: Optional[str] = None


class PhDSeminarRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    seminar_title: str
    title: Optional[str] = None
    seminar_category: str
    seminar_date: date
    attended: bool
    is_presenter: bool
    department: Optional[str] = None
    evidence_url: Optional[str] = None
    remarks: Optional[str] = None
    score_or_verdict: Optional[str] = "Pass"
    created_at: datetime

    @model_validator(mode="after")
    def populate_aliases(self) -> "PhDSeminarRead":
        if not self.title:
            self.title = self.seminar_title
        if self.remarks and not self.score_or_verdict:
            self.score_or_verdict = self.remarks
        return self

    class Config:
        from_attributes = True


class PhDComprehensiveExamCreate(BaseModel):
    student_id: int
    coursework_completed: bool = True
    cgpa: Optional[float] = None
    score: Optional[float] = None
    paper_part: Optional[str] = "Major Field & Research Methods"
    specialization: Optional[str] = None
    application_date: Optional[date] = None
    exam_date: Optional[date] = None
    attempt_number: int = 1
    committee_members: Optional[str] = None
    assessor_name: Optional[str] = None
    result: str = "Pass"  # Pending, Pass, Conditional Pass, Fail
    advanced_to_candidacy: bool = False
    appeal_status: Optional[str] = None
    remedial_instructions: Optional[str] = None
    remarks: Optional[str] = None


class PhDComprehensiveExamRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    coursework_completed: bool
    cgpa: Optional[float] = None
    score: Optional[float] = None
    paper_part: Optional[str] = None
    specialization: Optional[str] = None
    application_date: Optional[date] = None
    exam_date: Optional[date] = None
    attempt_number: int
    committee_members: Optional[str] = None
    result: str
    advanced_to_candidacy: bool
    appeal_status: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    @model_validator(mode="after")
    def populate_exam_aliases(self) -> "PhDComprehensiveExamRead":
        if self.score is None and self.cgpa is not None:
            self.score = self.cgpa
        if not self.paper_part:
            self.paper_part = self.specialization or "Major Field & Research Methods"
        return self

    class Config:
        from_attributes = True


class PhDTeachingRequirementCreate(BaseModel):
    student_id: int
    course_taught: Optional[str] = None
    course_code: Optional[str] = None
    course_title: Optional[str] = None
    academic_year: Optional[str] = "2025/2026"
    semester: str = "First Semester"
    department: Optional[str] = None
    supervising_faculty_id: Optional[int] = None
    teaching_role: str = "Teaching Assistant"
    contact_hours: Optional[float] = 45.0
    duties_description: Optional[str] = None
    evaluation_rating: Optional[str] = "Satisfactory"
    faculty_feedback: Optional[str] = None
    faculty_evaluation_score: Optional[float] = None
    student_evaluation_score: Optional[float] = None
    feedback_summary: Optional[str] = None
    improvement_plan: Optional[str] = None
    is_completed: bool = True
    completion_date: Optional[date] = None


class PhDTeachingRequirementRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    course_taught: str
    course_code: Optional[str] = None
    course_title: Optional[str] = None
    academic_year: Optional[str] = "2025/2026"
    contact_hours: Optional[float] = 45.0
    semester: str
    department: Optional[str] = None
    supervising_faculty_id: Optional[int] = None
    supervising_faculty_name: Optional[str] = None
    teaching_role: str
    faculty_evaluation_score: Optional[float] = None
    student_evaluation_score: Optional[float] = None
    feedback_summary: Optional[str] = None
    improvement_plan: Optional[str] = None
    is_completed: bool
    completion_date: Optional[date] = None
    created_at: datetime

    @model_validator(mode="after")
    def populate_teaching_aliases(self) -> "PhDTeachingRequirementRead":
        if ":" in (self.course_taught or ""):
            parts = self.course_taught.split(":", 1)
            self.course_code = self.course_code or parts[0].strip()
            self.course_title = self.course_title or parts[1].strip()
        else:
            self.course_code = self.course_code or self.course_taught
            self.course_title = self.course_title or self.course_taught
        if self.faculty_evaluation_score is not None:
            self.contact_hours = self.faculty_evaluation_score
        return self

    class Config:
        from_attributes = True


class PhDProgressEvaluationCreate(BaseModel):
    student_id: int
    evaluation_period: str
    current_stage: Optional[str] = None
    coursework_summary: Optional[str] = None
    research_progress_summary: Optional[str] = None
    seminar_summary: Optional[str] = None
    teaching_summary: Optional[str] = None
    overall_rating: str = "Satisfactory"
    action_plan: Optional[str] = None
    follow_up_date: Optional[date] = None
    evaluation_date: Optional[date] = None


class PhDProgressEvaluationRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    evaluator_id: Optional[int] = None
    evaluator_name: Optional[str] = None
    evaluation_period: str
    current_stage: Optional[str] = None
    coursework_summary: Optional[str] = None
    research_progress_summary: Optional[str] = None
    seminar_summary: Optional[str] = None
    teaching_summary: Optional[str] = None
    overall_rating: str
    action_plan: Optional[str] = None
    follow_up_date: Optional[date] = None
    evaluation_date: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PhDReaccreditationFolderCreate(BaseModel):
    folder_number: int
    folder_name: str
    academic_year: str
    file_name: str
    file_url: str
    description: Optional[str] = None
    status: str = "Verified"


class PhDReaccreditationFolderRead(BaseModel):
    id: int
    folder_number: int
    folder_name: str
    academic_year: str
    file_name: str
    file_url: str
    description: Optional[str] = None
    uploaded_by_id: Optional[int] = None
    uploaded_by_name: Optional[str] = None
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class PhDCourseworkRecordCreate(BaseModel):
    student_id: int
    advisor_id: Optional[int] = None
    advisor_name: Optional[str] = None
    course_code: str
    course_title: str
    academic_year: str = "2025/2026"
    semester: str = "Semester 1"
    credit_hours: int = 3
    assignment_score: float = 0.0
    coursework_score: float = 0.0
    exam_score: float = 0.0
    advisor_cleared: bool = False
    remarks: Optional[str] = None


class PhDCourseworkRecordRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    advisor_id: Optional[int] = None
    advisor_name: Optional[str] = None
    course_code: str
    course_title: str
    academic_year: str
    semester: str
    credit_hours: int
    assignment_score: float
    coursework_score: float
    exam_score: float
    total_score: float
    letter_grade: str
    grade_point: float
    advisor_cleared: bool
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PhDProgressionPipelineUpdate(BaseModel):
    student_id: int
    action: str  # "advisor_clearance", "assign_assessor", "grade_comp_exam", "assign_supervisor", "assign_previva", "record_previva", "assign_external_viva", "record_defense_marks"
    advisor_id: Optional[int] = None
    advisor_name: Optional[str] = None
    advisor_work_completed: Optional[bool] = None
    assessor_id: Optional[int] = None
    assessor_name: Optional[str] = None
    comp_exam_status: Optional[str] = None
    comp_exam_score: Optional[float] = None
    comp_exam_remarks: Optional[str] = None
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    co_supervisor_name: Optional[str] = None
    previva_examiner_id: Optional[int] = None
    previva_examiner_name: Optional[str] = None
    previva_date: Optional[date] = None
    previva_score: Optional[float] = None
    previva_status: Optional[str] = None
    previva_remarks: Optional[str] = None
    external_examiner_id: Optional[int] = None
    external_examiner_name: Optional[str] = None
    external_examiner_institution: Optional[str] = None
    viva_date: Optional[date] = None
    internal_examiner_mark: Optional[float] = None
    external_examiner_mark: Optional[float] = None
    oral_defense_viva_mark: Optional[float] = None
    viva_verdict: Optional[str] = None
    defense_remarks: Optional[str] = None


class PhDProgressionPipelineRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    advisor_id: Optional[int] = None
    advisor_name: Optional[str] = None
    advisor_work_completed: bool = False
    advisor_clearance_date: Optional[date] = None
    assessor_id: Optional[int] = None
    assessor_name: Optional[str] = None
    assessor_assigned_date: Optional[date] = None
    comp_exam_status: str = "Pending"
    comp_exam_score: Optional[float] = None
    comp_exam_date: Optional[date] = None
    comp_exam_remarks: Optional[str] = None
    supervisor_id: Optional[int] = None
    supervisor_name: Optional[str] = None
    co_supervisor_name: Optional[str] = None
    supervisor_assigned_date: Optional[date] = None
    previva_examiner_id: Optional[int] = None
    previva_examiner_name: Optional[str] = None
    previva_date: Optional[date] = None
    previva_score: Optional[float] = None
    previva_status: str = "Pending"
    previva_remarks: Optional[str] = None
    external_examiner_id: Optional[int] = None
    external_examiner_name: Optional[str] = None
    external_examiner_institution: Optional[str] = None
    viva_dispatched_date: Optional[date] = None
    viva_date: Optional[date] = None
    internal_examiner_mark: Optional[float] = None
    external_examiner_mark: Optional[float] = None
    oral_defense_viva_mark: Optional[float] = None
    final_defense_mark: Optional[float] = None
    viva_verdict: str = "Pending"
    defense_remarks: Optional[str] = None
    courses_count: int = 0
    cgpa: float = 0.0
    seminars_count: int = 0
    updated_at: datetime

    class Config:
        from_attributes = True


class PhDStudentDossier(BaseModel):
    student_id: int
    student_name: str
    student_email: str
    school_id: Optional[str] = None
    specialization: Optional[str] = None
    program: Optional[str] = None
    research_stage: str
    candidacy_status: str  # "Pre-Candidacy", "PhD Candidate", "Completed"
    comprehensive_result: str
    seminars_attended_count: int
    seminars_presented_count: int
    teaching_completed: bool
    last_meeting_date: Optional[date] = None
    days_since_last_meeting: Optional[int] = None
    inactivity_alert: bool = False  # True if > 60 days
    supervisors: list[str] = Field(default_factory=list)
    recent_eval_rating: Optional[str] = None
    # 6-Stage Progression Summary Fields
    advisor_name: Optional[str] = None
    advisor_work_completed: bool = False
    assessor_name: Optional[str] = None
    comp_exam_score: Optional[float] = None
    supervisor_name: Optional[str] = None
    previva_examiner_name: Optional[str] = None
    previva_status: str = "Pending"
    previva_score: Optional[float] = None
    external_examiner_name: Optional[str] = None
    viva_verdict: str = "Pending"
    final_defense_mark: Optional[float] = None
    courses_count: int = 0
    cgpa: float = 0.0
