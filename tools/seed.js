(() => {
  const d = window.__dt; const s = d.G.s;
  // Seed a sample town via the real placement API is not exposed; push directly for visual QA
  const types = ['cottage','cottage','townhouse','bakery','cafe','park','fountain','market','school','bikeshop','townhall','bandstand','wheat','orchard','barn','windmill','beehive','greenhouse'];
  let id = 1000; const now = Date.now() - 5000;
  const spots = [[16,17],[17,16],[16,20],[18,16],[21,16],[22,18],[17,22],[22,21],[13,19],[14,17],[12,21],[21,23],[17,26],[19,27],[21,26],[18,29],[20,30],[15,29]];
  types.forEach((t,i)=>{ const [x,y]=spots[i]; s.buildings.push({id:id++,type:t,x,y,tier:i%3,builtAt:now}); });
  s.plots = [12,11,17,7,6,13];
  s.pop = 60;
  return s.buildings.length;
})()
