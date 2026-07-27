// ============================================================
//  PORTFOLIO CONTENT — edit this file to change what the
//  visitor discovers in the dark. Everything else is engine.
//
//  Sections are stacked vertically, top to bottom, in array
//  order — like a normal portfolio page. The visitor descends
//  through them with the character instead of scrolling.
//  The first entry (hero: true) renders as the big name card.
// ============================================================

export interface Section {
  title: string;
  lines: string[];
  hero?: boolean;
}

export const PLAYER_NAME = "Michael";

export const SECTIONS: Section[] = [
  {
    hero: true,
    title: PLAYER_NAME,
    lines: ["Developer in the making.", "Descend to explore ↓"],
  },
  {
    title: "About",
    lines: [
      "[ Placeholder ]",
      "A short introduction about who I am,",
      "what I study, and what I love building.",
    ],
  },
  {
    title: "Skills",
    lines: [
      "[ Placeholder ]",
      "TypeScript · JavaScript · Node.js",
      "Git · and whatever I'm learning next.",
    ],
  },
  {
    title: "Projects",
    lines: [
      "[ Placeholder ]",
      "Project One — a thing I built and why.",
      "Project Two — another thing, with a link.",
      "(This site counts as one.)",
    ],
  },
  {
    title: "Experience",
    lines: [
      "[ Placeholder ]",
      "Internship / role — company, dates.",
      "What I worked on and what I learned.",
    ],
  },
  {
    title: "Contact",
    lines: [
      "michaellim0999@gmail.com",
      "github.com/your-username",
      "linkedin.com/in/your-profile",
    ],
  },
  {
    title: "Fin.",
    lines: ["Thanks for making the descent.", "The only way left is up."],
  },
];
