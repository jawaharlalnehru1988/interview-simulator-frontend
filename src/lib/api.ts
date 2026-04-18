export type RegisterPayload = {
  username: string;
  email?: string;
  password: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type StartInterviewPayload = {
  topic: string;
  round: string;
};

export type SubmitAnswerPayload = {
  question_id: number;
  answer: string;
};

export type HealthResponse = {
  status: string;
};

export type RegisterResponse = {
  id: number;
  username: string;
};

export type TokenResponse = {
  access: string;
  refresh: string;
};

export type StartInterviewResponse = {
  interview_id: number;
  status: string;
  topic: string;
  round: string;
};

export type NextQuestionResponse = {
  interview_id: number;
  question_id: number;
  question: string;
  difficulty: string;
  question_number: number;
  status: string;
  suggested_answer: string;
  mcq_options?: string[];
};

export type EvaluationResult = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
};

export type SubmitAnswerResponse = {
  question_id: number;
  answer_id: number;
  evaluation_status: string;
  evaluation?: EvaluationResult;
};

export type InterviewSummaryQuestion = {
  question_id: number;
  order: number;
  difficulty: string;
  question: string;
  answer: string | null;
  evaluation_status: string | null;
  score: number | null;
};

export type InterviewSummaryResponse = {
  interview_id: number;
  topic: string;
  round: string;
  status: string;
  questions_asked: number;
  evaluations_completed: number;
  average_score: number | null;
  questions: InterviewSummaryQuestion[];
};

export type StartCoachResponse = {
  session_id: number;
  topic: string;
  subtopics: string[];
  lessons_by_subtopic?: Record<string, string[]>;
  stage: string;
  coach_prompt: string;
};

export type ChooseCoachSubtopicResponse = {
  session_id: number;
  topic: string;
  subtopic: string;
  lessons: string[];
  practiced_subtopics?: string[];
  practiced_lessons?: string[];
  stage: string;
  coach_prompt: string;
};

export type ChooseCoachLessonResponse = {
  session_id: number;
  topic: string;
  subtopic: string;
  selected_lesson: string;
  practiced_subtopics?: string[];
  practiced_lessons?: string[];
  total_subtopics?: number;
  practiced_subtopics_count?: number;
  total_lessons?: number;
  practiced_lessons_count?: number;
  progress_percent?: number;
  stage: string;
  lesson: string;
  question: string;
  coach_prompt: string;
};

export type CoachAnswerResponse = {
  session_id: number;
  topic: string;
  subtopic: string;
  selected_lesson?: string;
  practiced_subtopics?: string[];
  practiced_lessons?: string[];
  total_subtopics?: number;
  practiced_subtopics_count?: number;
  total_lessons?: number;
  practiced_lessons_count?: number;
  progress_percent?: number;
  score: number;
  strengths: string[];
  gaps: string[];
  feedback: string;
  stage: string;
  coach_decision?: "advance" | "remediate";
  suggested_next_subtopic?: string;
  subtopics?: string[];
  next_question?: string;
  coach_prompt?: string;
};

export type CoachExplainResponse = {
  session_id: number;
  topic: string;
  subtopic: string;
  learner_question: string;
  explanation: string;
};

export type ResumeCoachResponse = {
  session_id: number;
  topic: string;
  subtopics: string[];
  lessons_by_subtopic?: Record<string, string[]>;
  selected_subtopic: string;
  selected_lesson: string;
  available_lessons?: string[];
  practiced_subtopics?: string[];
  practiced_lessons?: string[];
  practiced_lessons_map?: Record<string, string[]>;
  total_subtopics?: number;
  practiced_subtopics_count?: number;
  total_lessons?: number;
  practiced_lessons_count?: number;
  progress_percent?: number;
  stage: string;
  lesson: string;
  question: string;
  attempt_count: number;
  suggested_next_subtopic: string;
  latest_attempt: {
    score: number;
    strengths: string[];
    gaps: string[];
    feedback: string;
    coach_decision: "advance" | "remediate";
  } | null;
  coach_prompt: string;
};

export type UserLearningProgressResponse = {
  user: string;
  profile_ready?: boolean;
  attempted_topics: {
    interview_topics: string[];
    personal_coach_topics: string[];
  };
  modules: {
    interview: Array<{
      interview_id: number;
      topic: string;
      round: string;
      status: string;
      questions_asked: number;
      average_score: number | null;
      last_updated: string;
    }>;
    personal_coach: Array<{
      session_id: number;
      topic: string;
      current_subtopic: string;
      stage: string;
      attempt_count: number;
      latest_score: number | null;
      average_score: number | null;
      suggested_next_subtopic: string;
      practiced_subtopics?: string[];
      practiced_lessons_map?: Record<string, string[]>;
      total_subtopics?: number;
      practiced_subtopics_count?: number;
      total_lessons?: number;
      practiced_lessons_count?: number;
      progress_percent?: number;
      last_updated: string;
    }>;
    job_description_analyzer: Array<{
      analysis_id: number;
      company_name: string;
      recruiter_name: string;
      application_last_date: string | null;
      application_last_date_raw: string;
      job_description_preview: string;
      recruiter_intent: string;
      created_at: string;
      last_updated: string;
    }>;
    aspirations: Array<{
      aspiration_id: number;
      current_position: string;
      target_job: string;
      timeline_months: number;
      readiness_score: number | null;
      summary: string;
      created_at: string;
      last_updated: string;
    }>;
    hr_voice_calls: Array<{
      session_id: number;
      status: string;
      question_count: number;
      answered_count: number;
      average_score: number | null;
      pass_decision: boolean | null;
      target_job: string;
      company_name: string;
      last_updated: string;
    }>;
  };
  personal_coach_topic_stats: Array<{
    topic: string;
    total_attempts: number;
    average_score: number | null;
  }>;
};

export type JobDescriptionAnalysisResponse = {
  analysis_id: number;
  analysis: {
    recruiter_intent: string;
    skill_tiers: {
      strong_match: string[];
      okay_match: string[];
      low_priority: string[];
    };
    disclosed_salary: {
      found: boolean;
      currency: string;
      minimum: number | null;
      maximum: number | null;
      unit: string;
      raw_text: string;
    };
    market_salary_estimate: {
      role_focus: string;
      demandable_min: number;
      demandable_max: number;
      unit: string;
      confidence: "low" | "medium" | "high";
      reasoning: string[];
    };
    recommendations: string[];
    encouragement: string;
  };
  application_context: {
    recruiter_name: string;
    company_name: string;
    application_last_date: string | null;
    application_last_date_raw: string;
  };
};

export type ResumeJobDescriptionAnalysisResponse = JobDescriptionAnalysisResponse & {
  job_description: string;
  created_at: string;
  last_updated: string;
};

export type JobDescriptionAnalyzePayload = {
  jobDescription: string;
  recruiterName?: string;
  companyName?: string;
  applicationLastDate?: string;
};

export type CreateAspirationPayload = {
  currentPosition: string;
  targetJob: string;
  timelineMonths?: number;
  currentSkills?: string[];
  constraints?: string;
  additionalContext?: string;
};

export type AspirationRoadmap = {
  summary: string;
  readiness_score: number;
  gap_analysis: string[];
  roadmap_phases: Array<{
    phase: string;
    duration: string;
    focus: string;
    actions: string[];
    deliverables: string[];
  }>;
  weekly_execution: string[];
  interview_preparation: string[];
  encouragement: string;
};

export type AspirationResponse = {
  aspiration_id: number;
  current_position: string;
  target_job: string;
  timeline_months: number;
  current_skills: string[];
  constraints: string;
  additional_context: string;
  roadmap: AspirationRoadmap;
  checklist?: AspirationChecklist | null;
  created_at: string;
  last_updated: string;
};

export type AspirationChecklist = {
  id: number;
  completed_count: number;
  total_count: number;
  progress_percent: number;
  items: Array<{
    id: string;
    week: number;
    category: string;
    title: string;
    completed: boolean;
  }>;
  weeks: Array<{
    week: number;
    items: Array<{
      id: string;
      week: number;
      category: string;
      title: string;
      completed: boolean;
    }>;
  }>;
};

export type CandidateProfile = {
  current_position: string;
  current_company: string;
  total_experience_years: number | null;
  primary_skills: string[];
  current_salary: string;
  salary_expectation: string;
  notice_period: string;
  reason_for_leaving: string;
  career_gap_details: string;
  highest_education: string;
  preferred_locations: string[];
  preferred_role: string;
  additional_notes: string;
};

export type CandidateProfileUpdateResponse = {
  detail: string;
  profile: CandidateProfile;
};

export type StartHRVoiceInterviewPayload = {
  aspirationId?: number;
  jdAnalysisId?: number;
  questionCount?: number;
};

export type StartHRVoiceInterviewResponse = {
  session_id: number;
  status: string;
  question_count: number;
  current_question_index: number;
  current_question: string;
  context: {
    target_job: string;
    company_name: string;
    profile: {
      current_position: string;
      current_company: string;
      total_experience_years: number | null;
      primary_skills: string[];
      salary_expectation: string;
      notice_period: string;
      preferred_role: string;
      is_profile_complete: boolean;
    };
  };
};

export type HRVoiceAnswerEvaluation = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
};

export type HRVoiceFinalFeedback = {
  pass: boolean;
  average_score: number;
  overall_feedback: string;
  strong_answers: Array<{
    question: string;
    answer: string;
    score: number;
    strengths: string[];
  }>;
  weak_answers: Array<{
    question: string;
    answer: string;
    score: number;
    weaknesses: string[];
    improvements: string[];
  }>;
  improvement_plan: string[];
};

export type HRVoiceAnswerResponse = {
  session_id: number;
  status: string;
  question_score: number;
  evaluation: HRVoiceAnswerEvaluation;
  next_question_index?: number;
  next_question?: string;
  final_feedback?: HRVoiceFinalFeedback;
  pass?: boolean;
};

export type HRVoiceResumeResponse = {
  session_id: number;
  status: string;
  question_count: number;
  current_question_index: number;
  current_question: string;
  turns: Array<{
    question: string;
    answer: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
    created_at: string;
  }>;
  final_feedback: HRVoiceFinalFeedback | null;
  pass: boolean | null;
  context: {
    target_job: string;
    company_name: string;
    profile: {
      current_position: string;
      current_company: string;
      total_experience_years: number | null;
      primary_skills: string[];
      salary_expectation: string;
      notice_period: string;
      preferred_role: string;
      is_profile_complete: boolean;
    };
  };
};

export type AuthState = {
  accessToken: string;
  refreshToken?: string;
  onAccessToken?: (accessToken: string) => void;
  onUnauthorized?: () => void;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

function extractErrorMessage(body: unknown, status: number) {
  if (typeof body === "object" && body !== null) {
    const candidate = body as Record<string, unknown>;
    if (typeof candidate.detail === "string") {
      return candidate.detail;
    }
    if (typeof candidate.message === "string") {
      return candidate.message;
    }
    if (Array.isArray(candidate.username) && typeof candidate.username[0] === "string") {
      return candidate.username[0];
    }
    if (Array.isArray(candidate.password) && typeof candidate.password[0] === "string") {
      return candidate.password[0];
    }
  }

  return `Request failed with status ${status}`;
}

async function parseJsonResponse(response: Response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function performRequest(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  accessToken?: string,
) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await parseJsonResponse(response);
  return { response, body };
}

async function request<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<T> {
  const { response, body } = await performRequest(baseUrl, path, init, accessToken);

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(body, response.status), response.status);
  }

  return body as T;
}

async function requestWithAuth<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  auth: AuthState,
): Promise<T> {
  const firstAttempt = await performRequest(baseUrl, path, init, auth.accessToken);
  if (firstAttempt.response.ok) {
    return firstAttempt.body as T;
  }

  if (firstAttempt.response.status !== 401 || !auth.refreshToken) {
    if (firstAttempt.response.status === 401) {
      auth.onUnauthorized?.();
    }
    throw new ApiError(
      extractErrorMessage(firstAttempt.body, firstAttempt.response.status),
      firstAttempt.response.status,
    );
  }

  try {
    const refreshResponse = await refreshUserToken(baseUrl, auth.refreshToken);
    auth.onAccessToken?.(refreshResponse.access);

    const secondAttempt = await performRequest(baseUrl, path, init, refreshResponse.access);
    if (!secondAttempt.response.ok) {
      if (secondAttempt.response.status === 401) {
        auth.onUnauthorized?.();
      }
      throw new ApiError(
        extractErrorMessage(secondAttempt.body, secondAttempt.response.status),
        secondAttempt.response.status,
      );
    }

    return secondAttempt.body as T;
  } catch (error) {
    auth.onUnauthorized?.();
    throw error;
  }
}

export function checkHealth(baseUrl: string) {
  return request<HealthResponse>(baseUrl, "/health/", { method: "GET" });
}

export function registerUser(baseUrl: string, payload: RegisterPayload) {
  return request<RegisterResponse>(baseUrl, "/api/interview/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(baseUrl: string, payload: LoginPayload) {
  return request<TokenResponse>(baseUrl, "/api/auth/token/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refreshUserToken(baseUrl: string, refresh: string) {
  return request<{ access: string }>(baseUrl, "/api/auth/token/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
}

export function startInterview(baseUrl: string, auth: AuthState, payload: StartInterviewPayload) {
  return requestWithAuth<StartInterviewResponse>(baseUrl, "/api/interview/start/", {
    method: "POST",
    body: JSON.stringify(payload),
  }, auth);
}

export function getNextQuestion(baseUrl: string, auth: AuthState, interviewId: number) {
  return requestWithAuth<NextQuestionResponse>(
    baseUrl,
    `/api/interview/${interviewId}/next/`,
    { method: "GET" },
    auth,
  );
}

export function submitAnswer(baseUrl: string, auth: AuthState, payload: SubmitAnswerPayload) {
  return requestWithAuth<SubmitAnswerResponse>(baseUrl, "/api/interview/answer/", {
    method: "POST",
    body: JSON.stringify(payload),
  }, auth);
}

export function getInterviewSummary(baseUrl: string, auth: AuthState, interviewId: number) {
  return requestWithAuth<InterviewSummaryResponse>(
    baseUrl,
    `/api/interview/${interviewId}/summary/`,
    { method: "GET" },
    auth,
  );
}

export function startPersonalCoach(baseUrl: string, auth: AuthState, topic: string) {
  return requestWithAuth<StartCoachResponse>(
    baseUrl,
    "/api/interview/coach/start/",
    {
      method: "POST",
      body: JSON.stringify({ topic }),
    },
    auth,
  );
}

export function choosePersonalCoachSubtopic(
  baseUrl: string,
  auth: AuthState,
  sessionId: number,
  subtopic: string,
) {
  return requestWithAuth<ChooseCoachSubtopicResponse>(
    baseUrl,
    `/api/interview/coach/${sessionId}/choose-subtopic/`,
    {
      method: "POST",
      body: JSON.stringify({ subtopic }),
    },
    auth,
  );
}

export function choosePersonalCoachLesson(
  baseUrl: string,
  auth: AuthState,
  sessionId: number,
  lesson: string,
) {
  return requestWithAuth<ChooseCoachLessonResponse>(
    baseUrl,
    `/api/interview/coach/${sessionId}/choose-lesson/`,
    {
      method: "POST",
      body: JSON.stringify({ lesson }),
    },
    auth,
  );
}

export function answerPersonalCoachQuestion(
  baseUrl: string,
  auth: AuthState,
  sessionId: number,
  answer: string,
) {
  return requestWithAuth<CoachAnswerResponse>(
    baseUrl,
    `/api/interview/coach/${sessionId}/answer/`,
    {
      method: "POST",
      body: JSON.stringify({ answer }),
    },
    auth,
  );
}

export function explainPersonalCoachQuery(
  baseUrl: string,
  auth: AuthState,
  sessionId: number,
  question: string,
) {
  return requestWithAuth<CoachExplainResponse>(
    baseUrl,
    `/api/interview/coach/${sessionId}/explain/`,
    {
      method: "POST",
      body: JSON.stringify({ question }),
    },
    auth,
  );
}

export function resumePersonalCoachSession(
  baseUrl: string,
  auth: AuthState,
  sessionId: number,
) {
  return requestWithAuth<ResumeCoachResponse>(
    baseUrl,
    `/api/interview/coach/${sessionId}/resume/`,
    { method: "GET" },
    auth,
  );
}

export function getUserLearningProgress(baseUrl: string, auth: AuthState) {
  return requestWithAuth<UserLearningProgressResponse>(
    baseUrl,
    "/api/interview/progress/",
    { method: "GET" },
    auth,
  );
}

export function analyzeJobDescription(
  baseUrl: string,
  auth: AuthState,
  payload: JobDescriptionAnalyzePayload,
) {
  const body: {
    job_description: string;
    recruiter_name?: string;
    company_name?: string;
    application_last_date?: string;
  } = {
    job_description: payload.jobDescription,
  };

  if (payload.recruiterName?.trim()) {
    body.recruiter_name = payload.recruiterName.trim();
  }
  if (payload.companyName?.trim()) {
    body.company_name = payload.companyName.trim();
  }
  if (payload.applicationLastDate?.trim()) {
    body.application_last_date = payload.applicationLastDate.trim();
  }

  return requestWithAuth<JobDescriptionAnalysisResponse>(
    baseUrl,
    "/api/interview/job-analyzer/analyze/",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    auth,
  );
}

export function resumeJobDescriptionAnalysis(
  baseUrl: string,
  auth: AuthState,
  analysisId: number,
) {
  return requestWithAuth<ResumeJobDescriptionAnalysisResponse>(
    baseUrl,
    `/api/interview/job-analyzer/${analysisId}/resume/`,
    {
      method: "GET",
    },
    auth,
  );
}

export function createUserAspiration(
  baseUrl: string,
  auth: AuthState,
  payload: CreateAspirationPayload,
) {
  return requestWithAuth<AspirationResponse>(
    baseUrl,
    "/api/interview/aspiration/create/",
    {
      method: "POST",
      body: JSON.stringify({
        current_position: payload.currentPosition,
        target_job: payload.targetJob,
        timeline_months: payload.timelineMonths ?? 6,
        current_skills: payload.currentSkills ?? [],
        constraints: payload.constraints ?? "",
        additional_context: payload.additionalContext ?? "",
      }),
    },
    auth,
  );
}

export function resumeUserAspiration(
  baseUrl: string,
  auth: AuthState,
  aspirationId: number,
) {
  return requestWithAuth<AspirationResponse>(
    baseUrl,
    `/api/interview/aspiration/${aspirationId}/resume/`,
    {
      method: "GET",
    },
    auth,
  );
}

export function generateAspirationChecklist(
  baseUrl: string,
  auth: AuthState,
  aspirationId: number,
  forceRegenerate = false,
) {
  return requestWithAuth<AspirationChecklist>(
    baseUrl,
    `/api/interview/aspiration/${aspirationId}/checklist/generate/`,
    {
      method: "POST",
      body: JSON.stringify({ force_regenerate: forceRegenerate }),
    },
    auth,
  );
}

export function toggleAspirationChecklistItem(
  baseUrl: string,
  auth: AuthState,
  aspirationId: number,
  itemId: string,
  completed: boolean,
) {
  return requestWithAuth<AspirationChecklist>(
    baseUrl,
    `/api/interview/aspiration/${aspirationId}/checklist/toggle/`,
    {
      method: "POST",
      body: JSON.stringify({ item_id: itemId, completed }),
    },
    auth,
  );
}

export function getCandidateProfile(baseUrl: string, auth: AuthState) {
  return requestWithAuth<CandidateProfile>(
    baseUrl,
    "/api/interview/profile/settings/",
    { method: "GET" },
    auth,
  );
}

export function updateCandidateProfile(
  baseUrl: string,
  auth: AuthState,
  payload: CandidateProfile,
) {
  return requestWithAuth<CandidateProfileUpdateResponse>(
    baseUrl,
    "/api/interview/profile/settings/",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    auth,
  );
}

export function startHRVoiceInterview(
  baseUrl: string,
  auth: AuthState,
  payload: StartHRVoiceInterviewPayload,
) {
  return requestWithAuth<StartHRVoiceInterviewResponse>(
    baseUrl,
    "/api/interview/hr-voice/start/",
    {
      method: "POST",
      body: JSON.stringify({
        aspiration_id: payload.aspirationId,
        jd_analysis_id: payload.jdAnalysisId,
        question_count: payload.questionCount ?? 12,
      }),
    },
    auth,
  );
}

export function answerHRVoiceInterview(
  baseUrl: string,
  auth: AuthState,
  sessionId: number,
  answer: string,
) {
  return requestWithAuth<HRVoiceAnswerResponse>(
    baseUrl,
    `/api/interview/hr-voice/${sessionId}/answer/`,
    {
      method: "POST",
      body: JSON.stringify({ answer }),
    },
    auth,
  );
}

export function resumeHRVoiceInterview(
  baseUrl: string,
  auth: AuthState,
  sessionId: number,
) {
  return requestWithAuth<HRVoiceResumeResponse>(
    baseUrl,
    `/api/interview/hr-voice/${sessionId}/resume/`,
    {
      method: "GET",
    },
    auth,
  );
}

export { ApiError };
