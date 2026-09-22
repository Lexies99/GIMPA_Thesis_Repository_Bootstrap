from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field
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
    seminar_title: str
    seminar_category: str
    seminar_date: date
    attended: bool = True
    is_presenter: bool = False
    department: Optional[str] = None
    evidence_url: Optional[str] = None
    remarks: Optional[str] = None


class PhDSeminarRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    seminar_title: str
    seminar_category: str
    seminar_date: date
    attended: bool
    is_presenter: bool
    department: Optional[str] = None
    evidence_url: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PhDComprehensiveExamCreate(BaseModel):
    student_id: int
    coursework_completed: bool = True
    cgpa: Optional[float] = None
    specialization: Optional[str] = None
    application_date: Optional[date] = None
    exam_date: Optional[date] = None
    attempt_number: int = 1
    committee_members: Optional[str] = None
    result: str = "Pending"  # Pending, Pass, Fail
    advanced_to_candidacy: bool = False
    appeal_status: Optional[str] = None
    remarks: Optional[str] = None


class PhDComprehensiveExamRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    coursework_completed: bool
    cgpa: Optional[float] = None
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

    class Config:
        from_attributes = True


class PhDTeachingRequirementCreate(BaseModel):
    student_id: int
    course_taught: str
    semester: str
    department: Optional[str] = None
    supervising_faculty_id: Optional[int] = None
    teaching_role: str = "Teaching Assistant"
    faculty_evaluation_score: Optional[float] = None
    student_evaluation_score: Optional[float] = None
    feedback_summary: Optional[str] = None
    improvement_plan: Optional[str] = None
    is_completed: bool = False
    completion_date: Optional[date] = None


class PhDTeachingRequirementRead(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    course_taught: str
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
