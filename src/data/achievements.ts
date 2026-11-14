// Achievements. `test` receives the game state and a few derived numbers.
// Streaks count weeks (Mon–Sun) with at least `settings.weeklyRides` rides, so rest days never break them.
import type { GameState } from '../core/types';

export interface AchCtx {
  s: GameState;
  bestStreak: number;
  buildings: number;
  pop: number;
  maxTierOwned: number;
  eventsFull: number;
  eventTypesFull: number;
  perfect: number;
}
export interface AchDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cat: 'Riding' | 'Streaks' | 'Events' | 'Power' | 'Town';
  test: (c: AchCtx) => boolean;
}

const ftp = (c: AchCtx) => c.s.settings.ftp;
const ev = (c: AchCtx, id: string) => c.s.stats.events[id]?.full || 0;

export const ACHIEVEMENTS: AchDef[] = [
  // Riding
  { id: 'first', name: 'First Spark', icon: '✨', cat: 'Riding', desc: 'Finish your first ride.', test: (c) => c.s.stats.rides >= 1 },
  { id: 'rides10', name: 'Regular', icon: '🚲', cat: 'Riding', desc: 'Finish 10 rides.', test: (c) => c.s.stats.rides >= 10 },
  { id: 'rides50', name: 'Grid Regular', icon: '🔌', cat: 'Riding', desc: 'Finish 50 rides.', test: (c) => c.s.stats.rides >= 50 },
  { id: 'rides150', name: 'Power Station', icon: '🏭', cat: 'Riding', desc: 'Finish 150 rides.', test: (c) => c.s.stats.rides >= 150 },
  { id: 'kj1k', name: 'Kilojoule Club', icon: '🔋', cat: 'Riding', desc: 'Generate 1,000 kJ in total.', test: (c) => c.s.lifetimeKJ >= 1000 },
  { id: 'kj10k', name: 'Village Power', icon: '⚡', cat: 'Riding', desc: 'Generate 10,000 kJ in total.', test: (c) => c.s.lifetimeKJ >= 10000 },
  { id: 'kj50k', name: 'Megawatt Legs', icon: '🦵', cat: 'Riding', desc: 'Generate 50,000 kJ in total.', test: (c) => c.s.lifetimeKJ >= 50000 },
  { id: 'kj100k', name: 'City Grid', icon: '🌆', cat: 'Riding', desc: 'Generate 100,000 kJ in total.', test: (c) => c.s.lifetimeKJ >= 100000 },
  { id: 'kj250k', name: 'Human Power Plant', icon: '☢️', cat: 'Riding', desc: 'Generate 250,000 kJ in total.', test: (c) => c.s.lifetimeKJ >= 250000 },
  { id: 'big500', name: 'Full Charge', icon: '🔆', cat: 'Riding', desc: 'Generate 500 kJ in a single ride.', test: (c) => c.s.stats.maxRideKJ >= 500 },
  { id: 'big1000', name: 'Overcharged', icon: '🌋', cat: 'Riding', desc: 'Generate 1,000 kJ in a single ride.', test: (c) => c.s.stats.maxRideKJ >= 1000 },
  { id: 'hours10', name: 'Ten Hours of Light', icon: '🕯️', cat: 'Riding', desc: 'Ride for 10 hours in total.', test: (c) => c.s.stats.rideSecs >= 36000 },
  { id: 'hours100', name: 'Century of Hours', icon: '⏳', cat: 'Riding', desc: 'Ride for 100 hours in total.', test: (c) => c.s.stats.rideSecs >= 360000 },
  { id: 'plan90', name: 'The Long Shift', icon: '🗓️', cat: 'Riding', desc: 'Finish a 90-minute Structured Plan.', test: (c) => (c.s.stats.plans['90'] || 0) >= 1 },
  { id: 'import', name: 'Outdoor Power', icon: '🏞️', cat: 'Riding', desc: 'Import an outdoor ride file.', test: (c) => c.s.stats.imports >= 1 },

  // Streaks (weekly)
  { id: 'streak2', name: 'Two Good Weeks', icon: '📅', cat: 'Streaks', desc: 'Hit your weekly ride target 2 weeks in a row.', test: (c) => c.bestStreak >= 2 },
  { id: 'streak4', name: 'A Month of Power', icon: '🗓️', cat: 'Streaks', desc: '4 weeks in a row.', test: (c) => c.bestStreak >= 4 },
  { id: 'streak8', name: 'Habit Formed', icon: '🔁', cat: 'Streaks', desc: '8 weeks in a row.', test: (c) => c.bestStreak >= 8 },
  { id: 'streak12', name: 'A Season of Riding', icon: '🍂', cat: 'Streaks', desc: '12 weeks in a row.', test: (c) => c.bestStreak >= 12 },
  { id: 'streak26', name: 'Half a Year Lit', icon: '🌗', cat: 'Streaks', desc: '26 weeks in a row.', test: (c) => c.bestStreak >= 26 },
  { id: 'streak52', name: 'Year-Round Dynamo', icon: '🌍', cat: 'Streaks', desc: '52 weeks in a row.', test: (c) => c.bestStreak >= 52 },

  // Events
  { id: 'ev1', name: 'Grid Hero', icon: '🦸', cat: 'Events', desc: 'Complete your first grid event.', test: (c) => c.eventsFull >= 1 },
  { id: 'ev25', name: 'On Call', icon: '📟', cat: 'Events', desc: 'Complete 25 grid events.', test: (c) => c.eventsFull >= 25 },
  { id: 'ev100', name: 'Chief Engineer', icon: '👷', cat: 'Events', desc: 'Complete 100 grid events.', test: (c) => c.eventsFull >= 100 },
  { id: 'allEvents', name: 'Every Emergency', icon: '🧰', cat: 'Events', desc: 'Complete every type of grid event.', test: (c) => c.eventTypesFull >= 12 },
  { id: 'perfect', name: 'Precision Power', icon: '🎯', cat: 'Events', desc: 'Score 95% or better on an event.', test: (c) => c.perfect >= 1 },
  { id: 'perfect10', name: 'Metronome', icon: '🎼', cat: 'Events', desc: 'Score 95%+ on 10 events.', test: (c) => c.perfect >= 10 },
  { id: 'storm5', name: 'Storm Chaser', icon: '⛈️', cat: 'Events', desc: 'Restore the grid after 5 Storm Blackouts.', test: (c) => ev(c, 'storm') >= 5 },
  { id: 'festival5', name: 'Party Planner', icon: '🎉', cat: 'Events', desc: 'Keep 5 Festival Nights lit.', test: (c) => ev(c, 'festival') >= 5 },
  { id: 'factory10', name: 'Sweet Spot Savant', icon: '🍯', cat: 'Events', desc: 'Finish 10 Factory Orders.', test: (c) => ev(c, 'factory') >= 10 },
  { id: 'surge5', name: 'Thunder Legs', icon: '🌩️', cat: 'Events', desc: 'Charge the capacitor in 5 Lightning Surges.', test: (c) => ev(c, 'surge') >= 5 },
  { id: 'charter1', name: 'Charter Member', icon: '📜', cat: 'Events', desc: 'Complete a weekly Town Charter.', test: (c) => c.s.stats.charters >= 1 },
  { id: 'charter10', name: 'Town Councillor', icon: '🏛️', cat: 'Events', desc: 'Complete 10 weekly Town Charters.', test: (c) => c.s.stats.charters >= 10 },

  // Power bests (relative to FTP so they scale with you)
  { id: 'p5s2', name: 'Spark Gap', icon: '💥', cat: 'Power', desc: '5-second best of 2× FTP.', test: (c) => c.s.stats.bests.p5s >= 2 * ftp(c) },
  { id: 'p5s1000', name: 'Kilowatt Kick', icon: '🚀', cat: 'Power', desc: '5-second best of 1,000 W.', test: (c) => c.s.stats.bests.p5s >= 1000 },
  { id: 'p1', name: 'Minute Man', icon: '⏱️', cat: 'Power', desc: '1-minute best of 1.3× FTP.', test: (c) => c.s.stats.bests.p1 >= 1.3 * ftp(c) },
  { id: 'p5', name: 'Five Alive', icon: '🖐️', cat: 'Power', desc: '5-minute best of 1.1× FTP.', test: (c) => c.s.stats.bests.p5 >= 1.1 * ftp(c) },
  { id: 'p20', name: 'Threshold Keeper', icon: '🧱', cat: 'Power', desc: '20-minute best of 0.95× FTP.', test: (c) => c.s.stats.bests.p20 >= 0.95 * ftp(c) },

  // Town
  { id: 'build10', name: 'Neighbourhood', icon: '🏘️', cat: 'Town', desc: 'Have 10 buildings.', test: (c) => c.buildings >= 10 },
  { id: 'build30', name: 'Townscape', icon: '🗺️', cat: 'Town', desc: 'Have 30 buildings.', test: (c) => c.buildings >= 30 },
  { id: 'build75', name: 'Skyline', icon: '🌇', cat: 'Town', desc: 'Have 75 buildings.', test: (c) => c.buildings >= 75 },
  { id: 'pop100', name: 'Bustling', icon: '👥', cat: 'Town', desc: 'Reach 100 citizens.', test: (c) => c.pop >= 100 },
  { id: 'pop500', name: 'Metropolitan', icon: '🏙️', cat: 'Town', desc: 'Reach 500 citizens.', test: (c) => c.pop >= 500 },
  { id: 'tier3', name: 'Master Builder', icon: '🏗️', cat: 'Town', desc: 'Upgrade a building to tier III.', test: (c) => c.maxTierOwned >= 2 },
  { id: 'village', name: 'Village Status', icon: '🏡', cat: 'Town', desc: 'Grow into a Village.', test: (c) => c.s.tier >= 2 },
  { id: 'city', name: 'City Lights', icon: '🌃', cat: 'Town', desc: 'Grow into a City.', test: (c) => c.s.tier >= 5 },
  { id: 'research10', name: 'Curious Town', icon: '🔬', cat: 'Town', desc: 'Finish 10 research projects.', test: (c) => c.s.research.length >= 10 },
  { id: 'requests10', name: 'Good Neighbour', icon: '💌', cat: 'Town', desc: 'Fulfil 10 citizen requests.', test: (c) => c.s.stats.requests >= 10 },
  { id: 'gecko', name: 'Gecko Guardian', icon: '🦎', cat: 'Town', desc: 'Build a Terrarium Dome.', test: (c) => c.s.buildings.some((b) => b.type === 'terrarium') },
];

export const ACH: Record<string, AchDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
