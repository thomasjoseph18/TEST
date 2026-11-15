import { MissionInfo, SolTelemetry, JournalEntry, Destination } from '../types';

export const MISSIONS: Record<'moon' | 'mars', MissionInfo> = {
  moon: {
    id: 'moon',
    name: 'Artemis Lunar Base Camp',
    tagline: 'Permanent Human Presence at the Lunar South Pole',
    location: 'Shackleton Crater Rim (89.9° S)',
    era: 'Apollo (1969) to Artemis (Present)',
    gravity: '1.62 m/s² (1/6th Earth)',
    dayLength: '29.5 Earth Days',
    atmosphere: 'Vacuum (Trace Exosphere)',
    tempRange: '-130°C to +120°C',
    targetSols: 30,
    primaryObjective: 'Deploy Sol 1 solar arrays, activate closed-loop oxygen recyclers, and map water ice in perpetual shadow.',
    historyNote: 'Neil Armstrong & Buzz Aldrin landed Eagle at Tranquility Base on July 20, 1969. Artemis builds upon Apollo to establish the first permanent lunar community.',
    cadetLevel: 'Junior Astronaut (Cadet Class)',
    colorScheme: {
      primary: 'text-cyan-400',
      border: 'border-cyan-500/40 hover:border-cyan-400',
      glow: 'shadow-cyan-500/20',
      badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
    },
  },
  mars: {
    id: 'mars',
    name: 'Ares Jezero Biosphere',
    tagline: 'First Crewed Habitat on the Red Planet',
    location: 'Jezero Crater Delta (18.38° N, 77.58° E)',
    era: 'Future Human Frontier (2030s+)',
    gravity: '3.72 m/s² (38% Earth)',
    dayLength: '24 hours 39 minutes (1 Martian Sol)',
    atmosphere: '95% Carbon Dioxide (Thin)',
    tempRange: '-60°C to +20°C',
    targetSols: 30,
    primaryObjective: 'Unseal the inflatable pressurized habitat dome, test MOXIE oxygen generation, and survive Sol 1 dust squalls.',
    historyNote: 'NASA’s Perseverance rover and Ingenuity helicopter pioneered Jezero in 2021. Your crew is the first human team to walk these ancient lakebeds.',
    cadetLevel: 'Commander Class (Ages 9-12)',
    colorScheme: {
      primary: 'text-amber-400',
      border: 'border-amber-500/40 hover:border-amber-400',
      glow: 'shadow-amber-500/20',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    },
  },
};

export const INITIAL_TELEMETRY: SolTelemetry = {
  currentSol: 1,
  totalSols: 30,
  oxygenLevel: 98,
  waterLevel: 96,
  powerLevel: 100,
  habitatTempC: 21,
  habitatIntegrity: 100,
  statusMessage: 'All environmental life-support loops nominal. Solar collection operational.',
};

export function getInitialJournal(destination: Destination): JournalEntry[] {
  if (destination === 'mars') {
    return [
      {
        id: 'mars-entry-1',
        sol: 1,
        title: 'Touchdown & Jezero Habitat Pressurized!',
        author: 'Junior Commander (Mars Crew 1)',
        timestamp: 'Sol 01 - 09:15 MST',
        body: 'Touchdown confirmed on the Jezero Crater ancient river delta! Red dust billowed around our descent stage before settling under the thin CO₂ atmosphere. Habitat dome seal integrity is 100%, and the airlock depressurization loops tested nominal.',
        badge: {
          name: 'Red Planet Pioneer Pin',
          icon: 'Rocket',
          description: 'Safely landed at Ares Jezero Outpost on Sol 1.',
        },
        scienceTip: 'A day on Mars is called a Sol and lasts 24 hours, 39 minutes, and 35 seconds—just slightly longer than an Earth day!',
      },
      {
        id: 'mars-entry-2',
        sol: 1,
        title: 'MOXIE Oxygen Generator Online',
        author: 'Junior Commander (Mars Crew 1)',
        timestamp: 'Sol 01 - 15:40 MST',
        body: 'We initiated the solid oxide electrolysis unit (MOXIE). It pulled in carbon dioxide from the thin Martian sky and began cracking it into pure breathable oxygen. Solar panels unrolled cleanly across the red surface rocks.',
        badge: {
          name: 'Atmospheric Chemist Cadet',
          icon: 'BatteryCharging',
          description: 'Successfully initialized MOXIE O₂ extraction on Mars.',
        },
        scienceTip: 'Mars has a thin atmosphere made of 95% carbon dioxide, which means astronauts cannot breathe outside without space suits and MOXIE oxygen generation!',
      },
    ];
  }

  return [
    {
      id: 'moon-entry-1',
      sol: 1,
      title: 'Touchdown & Habitat Airbridge Connected!',
      author: 'Junior Commander (Lunar Crew 1)',
      timestamp: 'Mission Day 01 - 08:30 MET',
      body: 'We made our final descent through the pitch-black sky of the Moon’s South Pole. The lunar regolith glittered in the harsh sunlight along the crater rim. Our automated landing beacons guided us straight onto the designated landing pad! Habitat dome pressurization is complete, and NOVA confirmed our suits are ready for the first EVA.',
      badge: {
        name: 'Pioneer Touchdown Pin',
        icon: 'Rocket',
        description: 'Awarded for safely landing at the Artemis Base Camp on Sol 1.',
      },
      scienceTip: 'Did you know? Moon dust (regolith) is like powdered glass because there is no wind or water on the Moon to smooth down the sharp edges of rocks!',
    },
    {
      id: 'moon-entry-2',
      sol: 1,
      title: 'Solar Array Alignment & Water Ice Check',
      author: 'Junior Commander (Lunar Crew 1)',
      timestamp: 'Mission Day 01 - 14:15 MET',
      body: 'The sun sits low on the horizon at the lunar poles without ever setting during this season. We rotated the main photovoltaic towers to catch 100% of the sunlight. Remote sensors at the bottom of Shackleton Crater detected frozen water molecules trapped in ice pockets that have not seen sunshine in 2 billion years!',
      badge: {
        name: 'Solar Engineer Cadet',
        icon: 'BatteryCharging',
        description: 'Successfully deployed and locked high-efficiency solar arrays.',
      },
      scienceTip: 'Water ice on the Moon is not just for drinking! Astronauts can split water (H₂O) into Hydrogen and Oxygen using electricity to create rocket fuel and breathable air!',
    },
  ];
}

export const INITIAL_JOURNAL: JournalEntry[] = getInitialJournal('moon');

export const NOVA_FACTS: string[] = [
  'Apollo 11’s Lunar Module computer had only 64 kilobytes of memory—millions of times less than a modern smartwatch!',
  'A day on Mars (called a Sol) is 24 hours, 39 minutes, and 35 seconds—just slightly longer than an Earth day!',
  'Because lunar gravity is 1/6th of Earth’s, a 60-pound junior astronaut would weigh only 10 pounds on the Moon!',
  'The Artemis program is named after the Greek goddess of the Moon, who was the twin sister of Apollo.',
  'On Mars, sunsets look blue because fine atmospheric dust scatters red light away from the observer!',
];
