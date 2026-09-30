// Named places, kept free of three.js so the page UI can import them cheaply.

export type SectionId = 'impact' | 'work' | 'about' | 'experience' | 'contact';

/** Sites of grace: where you kneel to read a section of the portfolio. */
export const GRACES: { id: SectionId; x: number; z: number; name: string; kanji: string }[] = [
  { id: 'impact', x: 2.6, z: -4.5, name: 'Thousand Gates', kanji: '千本鳥居' },
  { id: 'work', x: -8.5, z: -52, name: 'The Pagoda', kanji: '五重塔' },
  { id: 'about', x: 5.5, z: -63.5, name: 'Koi Pond', kanji: '鯉の池' },
  { id: 'experience', x: 3.2, z: -84, name: 'Hundred Steps', kanji: '百段' },
  { id: 'contact', x: 2.8, z: -116.5, name: 'Summit Shrine', kanji: '山頂の社' },
];

/** Named regions; entering one for the first time shows its title card. */
export const AREAS: { id: string; name: string; kanji: string; test: (x: number, z: number) => boolean }[] = [
  { id: 'gate', name: 'The Night Gate', kanji: '夜の門', test: (x, z) => z > 2 && Math.abs(x) < 6 },
  { id: 'yard', name: 'Training Yard', kanji: '稽古場', test: (x, z) => x > 5 && z > 6 && z < 22 },
  { id: 'bamboo', name: 'Bamboo Grove', kanji: '竹林', test: (x, z) => x < -7 && z < 4 && z > -30 },
  { id: 'tunnel', name: 'Thousand Gates', kanji: '千本鳥居', test: (x, z) => z < -8 && z > -40 && Math.abs(x) < 2.5 },
  { id: 'pagoda', name: 'The Pagoda', kanji: '五重塔', test: (x, z) => z < -44 && z > -62 && x < 2 },
  { id: 'pond', name: 'Koi Pond', kanji: '鯉の池', test: (x, z) => z < -62 && z > -80 && x > 3 },
  { id: 'steps', name: 'Hundred Steps', kanji: '百段', test: (_x, z) => z < -86 && z > -110 },
  { id: 'summit', name: 'Summit Shrine', kanji: '山頂の社', test: (_x, z) => z < -112 },
];

