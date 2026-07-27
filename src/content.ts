// ============================================================
//  PORTFOLIO CONTENT — this is the only file you need to edit.
//  Anything wrapped in [brackets] is a placeholder.
//  The rest of the site (layout, styling, companion) is engine.
// ============================================================

export const PROFILE = {
  name: "Michael Lim",
  role: "Software Developer · IT Student, Class of 2026",
  tagline:
    "I build software that helps people and moves good ideas forward.",
  location: "Davao City, Philippines",
  email: "michaellim0999@gmail.com",
  links: [
    { label: "GitHub", url: "https://github.com/MIC09-Test" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/michael-louise-m-lim-039146343" },
    // Relative, not "/…": GitHub Pages serves a project repo from
    // /<repo-name>/, where a leading slash points at the domain root and
    // 404s. Relative resolves correctly there, on a user site, and locally.
    { label: "Resume", url: "Michael_Lim-Resume.pdf" },
  ],
};

// Scrawled on a strip of tape stuck beside the switch, lights-on only.
// Without something there almost nobody works out that the switch does
// anything and the cave goes unseen — and an order not to touch it gets
// touched far more often than an invitation to.
export const LIGHTS_HINT = "Do NOT turn off the lights";

export const ABOUT: string[] = [
  "I'm Michael Louise M. Lim, an Information Technology student at the University of Mindanao (graduating 2026) who builds mobile, web, and desktop applications. I'm most at home turning a rough idea into something people can actually use, whether that's a fitness app, an e-commerce platform, or an internal HR system.",
  "I work across the stack with tools like Flutter, Laravel, and ASP.NET, and I'm a certified IT Specialist in Cybersecurity, Network Security, and HTML & CSS. I care about writing software that's genuinely useful, and I'm looking for a role where I can keep learning while contributing to real-world projects.",
];

export interface SkillGroup {
  label: string;
  items: string[];
}

export const SKILLS: SkillGroup[] = [
  {
    label: "Languages",
    items: ["C#", "Dart", "JavaScript", "Python", "Java", "PHP"],
  },
  {
    label: "Frameworks & Libraries",
    items: ["Flutter", "Laravel", "ASP.NET", "React", "Material UI"],
  },
  {
    label: "Databases & Backend",
    items: ["Firebase", "Cloud Firestore", "MySQL"],
  },
  {
    label: "Tools",
    items: ["Git", "Visual Studio", "VS Code", "Android Studio"],
  },
];

export interface Project {
  title: string;
  description: string;
  tags: string[];
  link?: string;
}

export const PROJECTS: Project[] = [
  {
    title: "ManPro — HR Management System",
    description:
      "A full-stack Human Resource Management System built during my internship at Infinity Hub. I owned the Performance Management module: configurable evaluation forms, KPI tracking with multi-reviewer workflows, and an appraisal system with scoring logic, audit logging, and exportable reports.",
    tags: ["Laravel", "React", "MySQL", "Material UI"],
  },
  {
    title: "WorkingItOut — Gamified Fitness App",
    description:
      "A gamified mobile fitness app for young adults that blends honesty-based self-reporting with a reward-and-badge system to build consistent workout habits. Features real-time tracking, user authentication, cloud storage, and a content-based filtering algorithm for personalized workout recommendations.",
    tags: ["Flutter", "Firebase", "Cloud Firestore"],
  },
];

export interface Experience {
  role: string;
  org: string;
  period: string;
  points: string[];
}

export const EXPERIENCE: Experience[] = [
  {
    role: "Software Developer Intern",
    org: "Infinity Hub",
    period: "2026",
    points: [
      "Owned the Performance Management module of a company-wide HRMS, building configurable evaluation forms and KPI tracking with multi-reviewer workflows and secure file attachments.",
      "Built an appraisal system with review periods, scoring logic, audit logging, and exportable reports using Laravel, React, and MySQL.",
      "Collaborated within a team on backend logic, database design, and API integration across the full application lifecycle.",
    ],
  },
];

export interface Certification {
  name: string;
  issuer: string;
  year: string;
}

// Public Credly profile — all badges are verifiable here.
export const CREDLY_PROFILE = "https://www.credly.com/users/michael-louise-lim";

// Certiport verification codes (verify at verify.certiport.com with your
// last name), kept here for your records — not shown on the public site:
//   Cybersecurity 2024 — UnJ3-s4UH
export const CERTIFICATIONS: Certification[] = [
  {
    name: "IT Specialist — Cybersecurity",
    issuer: "Certiport (Pearson VUE)",
    year: "2024",
  },
  {
    name: "IT Specialist — Network Security",
    issuer: "Certiport (Pearson VUE)",
    year: "2024",
  },
  {
    name: "IT Specialist — Network Security",
    issuer: "Certiport (Pearson VUE)",
    year: "2023",
  },
  {
    name: "IT Specialist — HTML & CSS",
    issuer: "Certiport (Pearson VUE)",
    year: "2023",
  },
];

export const CONTACT_NOTE =
  "Open to internship and entry-level software roles — I'd love to hear from you.";
