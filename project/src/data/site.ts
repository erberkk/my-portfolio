// All copy lives here so updating the site never means touching layout code.

export const profile = {
  name: 'Erberk Akbulut',
  role: 'Full-stack software engineer',
  location: 'Istanbul, TR',
  timezone: 'Europe/Istanbul',
  email: 'akbuluterberk@gmail.com',
  github: 'https://github.com/erberkk',
  githubUser: 'erberkk',
  linkedin: 'https://linkedin.com/in/erberk-akbulut',
  // Drop a PDF into /public and set its path here to show a "Résumé" button.
  cv: null as string | null,
};

export type Metric = {
  value: number;
  prefix?: string;
  suffix?: string;
  /** Shown instead of an animated number, e.g. "weeks → 10 min". */
  display?: string;
  label: string;
  detail: string;
  stack: string[];
  span: 'wide' | 'tall' | 'base';
  visual?: 'route' | 'chat' | 'services' | 'doc' | 'people';
};

export const impact: Metric[] = [
  {
    value: 30, suffix: '–35%',
    label: 'more balanced courier workload',
    detail: 'Last-mile routing that clusters stops with a capacity-constrained K-Means, then solves each route with LKH-3. Live in Turkey and across CEE, replacing a manual assignment process.',
    stack: ['Python', 'K-Means', 'LKH-3 TSP', 'Docker'],
    span: 'wide', visual: 'route',
  },
  {
    value: 5000, suffix: '+',
    label: 'employees on the IT platform',
    detail: 'A company-wide IT ticket and record management system, from requirements with non-technical stakeholders through production.',
    stack: ['Angular', '.NET', 'MongoDB'],
    span: 'base', visual: 'people',
  },
  {
    value: 10, display: 'weeks → 10 min',
    label: 'document processing',
    detail: 'A document processing tool that turned a multi-week manual workload into about ten minutes.',
    stack: ['Python', 'FastAPI', 'MinIO'],
    span: 'base', visual: 'doc',
  },
  {
    value: 21,
    label: 'microservices, CEE cargo platform',
    detail: 'Full-stack features on an event-driven shipment platform serving Turkey and 10+ European countries.',
    stack: ['.NET / C#', 'Angular', 'Kafka', 'Redis'],
    span: 'base', visual: 'services',
  },
  {
    value: 0, display: 'Plain English → MongoDB',
    label: 'AI query assistant',
    detail: 'A chatbot wired to the company databases that turns questions from non-technical staff into queries and answers them.',
    stack: ['Python', 'Azure OpenAI', 'MongoDB'],
    span: 'base', visual: 'chat',
  },
];

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  kind: string;
  year: string;
  blurb: string;
  stack: string[];
  url: string;
  linkLabel: string;
  featured?: boolean;
  /** Emblem for featured cards. */
  kanji?: string;
  kanjiMeaning?: string;
  status?: string;
};

export const projects: Project[] = [
  {
    slug: 'stackmate', name: 'Stackmate', featured: true, kanji: '縁', kanjiMeaning: 'en · bond',
    tagline: 'Co-founder matching, done properly.',
    kind: 'Mobile product · Solo founder', year: '2026', status: 'Live on the App Store',
    blurb: 'Swipe-style matching for co-founders with verified profiles, a multi-factor compatibility engine that scores in the background, blind post-meeting reviews, native subscriptions, and calendar-based scheduling. Designed, built, and shipped alone. Android is on the way.',
    stack: ['Flutter', 'FastAPI', 'PostgreSQL', 'Supabase'],
    url: 'https://stackmateapp.com', linkLabel: 'stackmateapp.com',
  },
  {
    slug: 'pixy', name: 'Pixy', featured: true, kanji: '灯', kanjiMeaning: 'tomoshibi · a small light',
    tagline: 'A small robot that lives on your desktop.',
    kind: 'Desktop · Local AI', year: '2026', status: 'Open source',
    blurb: 'Catches Claude Code permission prompts and floats them above every window, chats with a model running on your own machine, and wakes up when you say "hey pixy". Nothing leaves the disk it was written to.',
    stack: ['Rust', 'Tauri', 'Local LLM', 'Whisper'],
    url: 'https://pixy-omega.vercel.app', linkLabel: 'pixy-omega.vercel.app',
  },
  {
    slug: 'fay-gurme', name: 'Fay Gurme', featured: true, kanji: '味', kanjiMeaning: 'aji · taste',
    tagline: 'A restaurant menu that opens like a film.',
    kind: 'Concept · Digital menu', year: '2026', status: 'Live demo',
    blurb: 'A bilingual QR menu concept for a restaurant in Bolu: a scroll-driven editorial opening, then 198 dishes with Turkish-aware search, allergen labels and a saved list. Vanilla JS and GSAP, no framework, zero WCAG AA violations under axe-core.',
    stack: ['Vanilla JS', 'GSAP', 'Node', 'Playwright'],
    url: 'https://fay-gurme.vercel.app', linkLabel: 'fay-gurme.vercel.app',
  },
  {
    slug: 'saricaer', name: 'Sarıcaer Studio',
    tagline: 'A fitness studio, told in one scroll.',
    kind: 'Client work · Motion', year: '2026',
    blurb: 'A trilingual one-pager for a studio in Bolu: pinned scroll sequences, a hand-rolled responsive image pipeline, and WhatsApp-based signup that stores nothing server-side. Static export, no backend to run.',
    stack: ['Next.js', 'Motion', 'Tailwind', 'Lenis'],
    url: 'https://www.saricaerstudio.com', linkLabel: 'saricaerstudio.com',
  },
  {
    slug: 'nimbus', name: 'Nimbus', kind: 'Cloud · RAG', year: '2025',
    tagline: 'Your files, searchable by meaning.',
    blurb: 'Drop a PDF, ask a question, get cited answers. Multi-language and multi-tenant.',
    stack: ['Go · Fiber', 'MongoDB', 'MinIO', 'React'],
    url: 'https://github.com/erberkk/Nimbus', linkLabel: 'GitHub',
  },
  {
    slug: 'claude-figma', name: 'Claude × Figma', kind: 'Design ops · Plugin', year: '2025',
    tagline: 'Ask your design questions in plain language.',
    blurb: 'A Figma plugin wired to Claude: select frames, ask about the design, get actionable edits back.',
    stack: ['TypeScript', 'Figma API', 'Claude'],
    url: 'https://github.com/erberkk/claude-figma-plugin', linkLabel: 'GitHub',
  },
  {
    slug: 'error-agent', name: 'Error Agent', kind: 'Developer tooling · AI', year: '2024',
    tagline: 'A debugger that opens its own pull requests.',
    blurb: 'Watches production for errors, reasons about stack traces, opens a GitHub PR with a fix, and pings the team on Slack.',
    stack: ['Python', 'FastAPI', 'LLM', 'GitHub API'],
    url: 'https://github.com/erberkk/python-error-agent', linkLabel: 'GitHub',
  },
  {
    slug: 'streak-stats', name: 'GitHub Streak Stats', kind: 'Open source · Widget', year: '2025',
    tagline: 'Your streak, as a self-updating card.',
    blurb: 'An animated SVG for your profile README that pulls your live contribution streak.',
    stack: ['Node', 'SVG', 'GitHub Actions'],
    url: 'https://github.com/erberkk/github-streak-stats', linkLabel: 'GitHub',
  },
  {
    slug: 'spotify-stats', name: 'Spotify Stats', kind: 'Open source · Widget', year: '2025',
    tagline: 'What you are listening to, on your README.',
    blurb: 'Shows your current track and top artists, refreshed on its own schedule.',
    stack: ['Node', 'Spotify API', 'OAuth'],
    url: 'https://github.com/erberkk/spotify-stats', linkLabel: 'GitHub',
  },
  {
    slug: 'diagnomodel', name: 'Heart Disease Detection', kind: 'Health · Award', year: '2024',
    tagline: 'Engineering Project of the Year, Beykoz 2024.',
    blurb: 'A TensorFlow model that estimates heart-disease risk from clinical inputs, served through a small web tool.',
    stack: ['TensorFlow', 'Python', 'Flask'],
    url: 'https://github.com/erberkk/diagnomodel', linkLabel: 'GitHub',
  },
];

export type Role = {
  when: string;
  title: string;
  org: string;
  note: string;
  points?: string[];
  current?: boolean;
};

export const experience: Role[] = [
  {
    when: '2024 — Now', current: true,
    title: 'Software Developer, Full Stack', org: 'Aras Cargo · Aras Digital',
    note: 'Internal platforms end-to-end, from requirements to production, in small cross-functional teams — and features on a 21-service cargo platform used across CEE.',
    points: [
      'IT ticket and record management used by 5,000+ employees',
      'Balanced K-Means + LKH-3 routing for last-mile delivery, live in Turkey and CEE',
      'Document processing that cut a multi-week workload to ~10 minutes',
      'Workforce tracking with automated entitlement calculations',
      'Natural-language chatbot over the company MongoDB databases',
      'Mentoring engineering interns through code review',
    ],
  },
  {
    when: '2025 — Now', title: 'Volunteer', org: 'LÖSEV',
    note: 'Community events for children with leukaemia. The only line here that has nothing to do with code.',
  },
  {
    when: '2024 — 2025', title: 'Core Team', org: 'GDG On Campus · Beykoz',
    note: 'Led the community website build and ran workshops on machine learning and web development.',
  },
  {
    when: '2024', title: 'Engineering Project of the Year', org: 'Beykoz University',
    note: 'Co-developed a TensorFlow heart-disease risk model, recognised university-wide. Also received a Certificate of Appreciation for curriculum design work.',
  },
  {
    when: '2021 — 2026', title: 'B.Sc. Software Engineering', org: 'Beykoz University',
    note: 'GPA 3.38 / 4.00. Spent the last two years shipping production software alongside coursework.',
  },
];

export const stack: { group: string; items: string[] }[] = [
  { group: 'Languages', items: ['TypeScript', 'Python', 'C#', 'Go', 'Dart', 'Rust'] },
  { group: 'Frontend & mobile', items: ['Angular', 'React', 'Next.js', 'Flutter', 'RxJS', 'Riverpod'] },
  { group: 'Backend', items: ['ASP.NET Core', 'FastAPI', 'Flask', 'Node.js', 'Go · Fiber', 'SQLAlchemy'] },
  { group: 'Data', items: ['PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'MinIO', 'Supabase'] },
  { group: 'Infrastructure', items: ['Docker', 'Jenkins', 'Nginx', 'Railway', 'Graylog', 'Codemagic'] },
  { group: 'AI', items: ['Azure OpenAI', 'RAG', 'Local LLMs', 'Whisper', 'Claude Code'] },
];

export type SectionMeta = { id: 'impact' | 'work' | 'about' | 'experience' | 'contact'; label: string; kanji: string; reading: string; title: string };

export const sections: SectionMeta[] = [
  { id: 'impact', label: 'Impact', kanji: '実績', reading: 'jisseki', title: 'Software people actually lean on' },
  { id: 'work', label: 'Work', kanji: '作品', reading: 'sakuhin', title: 'Things I build after hours' },
  { id: 'about', label: 'About', kanji: '私', reading: 'watashi', title: 'Engineer, mostly of the practical kind' },
  { id: 'experience', label: 'Journey', kanji: '歩み', reading: 'ayumi', title: 'Not a résumé. A trajectory.' },
  { id: 'contact', label: 'Contact', kanji: '連絡', reading: 'renraku', title: 'Got a problem nobody wants to solve?' },
];

export const nav = sections.map((s) => ({ id: s.id, label: s.label }));

/** Omikuji: fortunes drawn after ringing the shrine bell. */
export const fortunes: { rank: string; kanji: string; text: string }[] = [
  { rank: 'Great blessing', kanji: '大吉', text: 'Your build passes on the first try. Tell no one; it will not happen twice.' },
  { rank: 'Blessing', kanji: '吉', text: 'A flaky test reveals a real bug. Be grateful to it.' },
  { rank: 'Middle blessing', kanji: '中吉', text: 'The migration runs clean in production. Back it up anyway.' },
  { rank: 'Small blessing', kanji: '小吉', text: 'A stakeholder says "just one small change". It is not small. It is fine.' },
  { rank: 'Future blessing', kanji: '末吉', text: 'Today’s workaround becomes next quarter’s architecture. Name it well.' },
  { rank: 'Great blessing', kanji: '大吉', text: 'The bug you chased all week was a typo. You will laugh about it by Friday.' },
  { rank: 'Curse, mildly', kanji: '凶', text: 'A merge conflict approaches from the west. Pull before you push.' },
];
