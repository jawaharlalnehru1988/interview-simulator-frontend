export interface AppRoute {
  path: string;
  name: string; // Used for dropdown menu links & hero buttons
  cardEyebrow?: string; // Used for card header category
  cardTitle?: string; // Used for card heading
  cardDescription?: string; // Used for card details body
  showInDropdown: boolean;
  showAsCard: boolean;
}

export const APP_ROUTES: AppRoute[] = [
  {
    path: "/",
    name: "Home",
    showInDropdown: true,
    showAsCard: false,
  },
  {
    path: "/interview",
    name: "Interview",
    cardEyebrow: "Protected Workspace",
    cardTitle: "Interview Workspace",
    cardDescription: "Start interviews, fetch questions, submit answers, and inspect summary reports from a route dedicated to authenticated interview operations.",
    showInDropdown: true,
    showAsCard: true,
  },
  {
    path: "/mcq-test",
    name: "MCQ Test",
    cardEyebrow: "Knowledge Check",
    cardTitle: "MCQ Test",
    cardDescription: "Test your skills with adaptive, AI-generated multiple choice questions tailored to your target difficulty level.",
    showInDropdown: true,
    showAsCard: true,
  },
  {
    path: "/coding",
    name: "Coding Workspace",
    cardEyebrow: "Skills Practice",
    cardTitle: "Coding Workspace",
    cardDescription: "Write code, evaluate your strategies, and receive code syntax highlighting with detailed reviews of your solutions.",
    showInDropdown: true,
    showAsCard: true,
  },

  {
    path: "/job-analyzer",
    name: "JD Analyzer",
    cardEyebrow: "Career Analysis",
    cardTitle: "JD Analyzer",
    cardDescription: "Analyze recruiter intent, split skills by priority, detect compensation details, and get actionable recommendations before applying.",
    showInDropdown: true,
    showAsCard: true,
  },
  {
    path: "/aspiration",
    name: "Aspiration",
    cardEyebrow: "Career Direction",
    cardTitle: "Aspiration Planner",
    cardDescription: "Capture your current position, target role, timeline, and constraints to build a practical roadmap with phased milestones.",
    showInDropdown: true,
    showAsCard: true,
  },
  {
    path: "/syllabus-generator",
    name: "Syllabus",
    cardEyebrow: "Learning Plan",
    cardTitle: "Syllabus Generator",
    cardDescription: "Type any broader topic, generate a structured syllabus of topics and subtopics, and convert it into a tracking checklist with completion dates.",
    showInDropdown: true,
    showAsCard: true,
  },
  {
    path: "/profile-settings",
    name: "Profile",
    cardEyebrow: "Profile Setup",
    cardTitle: "Profile Settings",
    cardDescription: "Fill complete career details in multiple sections so AI can ask realistic recruiter screening questions aligned to your background.",
    showInDropdown: true,
    showAsCard: true,
  },
  {
    path: "/hr-voice-call",
    name: "HR Voice Call",
    cardEyebrow: "Recruiter Simulation",
    cardTitle: "HR Voice Call",
    cardDescription: "Simulate recruiter call questions based on your profile, aspiration, and JD analysis, then receive pass/fail guidance.",
    showInDropdown: true,
    showAsCard: true,
  },
  {
    path: "/roadmaps",
    name: "Roadmaps",
    cardEyebrow: "Knowledge Hub",
    cardTitle: "Roadmaps",
    cardDescription: "Browse all generated roadmaps and explore subtopic explanations.",
    showInDropdown: true,
    showAsCard: true,
  },
  {
    path: "/repository",
    name: "Repository AI",
    cardEyebrow: "Code Analysis",
    cardTitle: "Repository AI Assistant",
    cardDescription: "Scan GitHub repositories to understand their architecture and chat with an AI about the code structure and design.",
    showInDropdown: true,
    showAsCard: true,
  },
];
