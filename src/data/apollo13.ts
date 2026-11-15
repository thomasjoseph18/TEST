// Opening cinematic script. Every beat is tagged:
//   'real'  = NASA history, checked against NASA and encyclopedia sources (see APOLLO13_SOURCES)
//   'story' = fiction invented for this game (the cadet, NOVA, the training academy)
// Only `quote: true` lines are exact historical words; everything else is told in our own words.

export type BeatTag = 'real' | 'story';

export type BeatScene =
  | 'launch' | 'cruise' | 'incident' | 'tank' | 'lifeboat' | 'cold' | 'fix' | 'moon' | 'splash' | 'legacy'
  | 'story1' | 'story2' | 'story3';

export interface Beat {
  id: string;
  scene: BeatScene;
  tag: BeatTag;
  /** Seconds from the start of the cinematic. */
  start: number;
  duration: number;
  speaker?: string;
  caption: string;
  /** Spoken by the optional voice-over. Defaults to the caption. */
  speech?: string;
  /** True only for words that were really said. */
  quote?: boolean;
  /** Radio chatter style (static, squelch) for mission-control lines. */
  radio?: boolean;
}

type RawBeat = Omit<Beat, 'start'>;

const RAW: RawBeat[] = [
  {
    id: 'launch', scene: 'launch', tag: 'real', duration: 8, speaker: 'NASA history · April 11, 1970',
    caption: 'Apollo 13 lifts off from Florida, bound for the Moon. Three astronauts are on board: Jim Lovell, Jack Swigert and Fred Haise.',
  },
  {
    id: 'ships', scene: 'launch', tag: 'real', duration: 7, speaker: 'NASA history',
    caption: 'Their spacecraft has two homes: the command module Odyssey, and the lunar module Aquarius, built to land on the Moon.',
  },
  {
    id: 'cruise', scene: 'cruise', tag: 'real', duration: 6, speaker: 'NASA history',
    caption: 'Two days of smooth flying pass. The crew even sends a TV show home from space.',
  },
  {
    id: 'bang', scene: 'incident', tag: 'real', duration: 7, speaker: 'NASA history · April 13, 1970',
    caption: 'About 56 hours after launch, roughly 322,000 kilometres from Earth, the crew hears a loud bang and the spacecraft shakes.',
  },
  {
    id: 'problem', scene: 'incident', tag: 'real', duration: 7, speaker: 'Jim Lovell, Apollo 13 commander',
    caption: '“Houston, we’ve had a problem.”', quote: true, radio: true,
    speech: 'Houston, we’ve had a problem.',
  },
  {
    id: 'tank', scene: 'tank', tag: 'real', duration: 9, speaker: 'What happened',
    caption: 'Inside the service module, oxygen tank number 2 had damaged wires. When a fan switched on, a spark started a fire and the tank burst.',
  },
  {
    id: 'oxygen', scene: 'tank', tag: 'real', duration: 8, speaker: 'What happened',
    caption: 'That oxygen was for breathing and for the fuel cells that made electricity and water. Now the ship was losing both.',
  },
  {
    id: 'lifeboat', scene: 'lifeboat', tag: 'real', duration: 8, speaker: 'NASA history',
    caption: 'The Moon landing was cancelled. The new goal: bring everyone home. The crew moved into Aquarius and used it as a lifeboat.',
  },
  {
    id: 'cold', scene: 'cold', tag: 'real', duration: 8, speaker: 'NASA history',
    caption: 'Aquarius was made for two people for two days. Now three shared it. It got cold, water was rationed, and carbon dioxide began to build up.',
  },
  {
    id: 'fix', scene: 'fix', tag: 'real', duration: 8, speaker: 'Mission Control',
    caption: 'Engineers on Earth invented a fix from things on board: tape, plastic bags, cardboard and a hose. It cleaned the air.', radio: true,
  },
  {
    id: 'moon', scene: 'moon', tag: 'real', duration: 8, speaker: 'NASA history',
    caption: 'The ship looped around the far side of the Moon and fired its engine to speed back toward Earth.',
  },
  {
    id: 'home', scene: 'splash', tag: 'real', duration: 8, speaker: 'NASA history · April 17, 1970',
    caption: 'Odyssey splashed down in the Pacific Ocean near Samoa. All three astronauts came home safe.',
  },
  {
    id: 'legacy', scene: 'legacy', tag: 'real', duration: 9, speaker: 'Why it matters',
    caption: 'Apollo 13 shows how teamwork and quick thinking can solve a problem nobody planned for. NASA changed the design so it could not happen again.',
  },
  {
    id: 'story1', scene: 'story1', tag: 'story', duration: 9, speaker: 'Your story (fiction)',
    caption: 'Now a story from the future. You are a junior astronaut training for Artemis, NASA’s programme to return people to the Moon, then on to Mars.',
  },
  {
    id: 'story2', scene: 'story2', tag: 'story', duration: 9, speaker: 'NOVA (a made-up robot helper)',
    caption: 'I’m NOVA, your training companion. Together we’ll manage air, water, power and food, just like real crews must.',
  },
  {
    id: 'story3', scene: 'story3', tag: 'story', duration: 7, speaker: 'NOVA (fiction)',
    caption: 'Your mission begins at the Command Centre. Ready, Commander?',
  },
];

export const APOLLO13_BEATS: Beat[] = (() => {
  let t = 0;
  return RAW.map((b) => {
    const beat: Beat = { ...b, start: t };
    t += b.duration;
    return beat;
  });
})();

export const APOLLO13_DURATION = APOLLO13_BEATS.reduce((m, b) => Math.max(m, b.start + b.duration), 0);

/** Index of the beat playing at time `t` (clamped to the last beat). */
export function beatAt(t: number): number {
  for (let i = APOLLO13_BEATS.length - 1; i >= 0; i--) if (t >= APOLLO13_BEATS[i].start) return i;
  return 0;
}

/** Index where the fictional story starts, used for the REAL/STORY divider. */
export const STORY_START_INDEX = APOLLO13_BEATS.findIndex((b) => b.tag === 'story');

export const APOLLO13_SOURCES = [
  'NASA, Apollo 13 mission pages (nasa.gov)',
  'NASA Apollo 13 Mission Report and Review Board findings',
  'Encyclopaedia Britannica, “Apollo 13”',
];

export const APOLLO13_DISCLAIMER =
  'The Apollo 13 scenes tell real history in simple words. NOVA, the cadet and the training academy are fiction made for this game. This project is an educational prototype. It is not endorsed by NASA.';
