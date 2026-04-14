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
  stage: string;
  coach_prompt: string;
};

export type ChooseCoachSubtopicResponse = {
  session_id: number;
  topic: string;
  subtopic: string;
  stage: string;
  lesson: string;
  question: string;
  coach_prompt: string;
};

export type CoachAnswerResponse = {
  session_id: number;
  topic: string;
  subtopic: string;
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
  selected_subtopic: string;
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
      last_updated: string;
    }>;
  };
  personal_coach_topic_stats: Array<{
    topic: string;
    total_attempts: number;
    average_score: number | null;
  }>;
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

export { ApiError };
