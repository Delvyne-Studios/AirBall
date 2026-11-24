/* ============================================================
   AIRBALL — constants + roster data
   ============================================================ */
(function(){
  const AB = window.AB = window.AB || {};

  AB.C = {
    W: 1600, H: 900,

    FLOOR_Y: 814,
    COURT_L: 72, COURT_R: 1528,

    RIM_L: 190, RIM_R: 1410,
    RIM_Y: 432,
    RIM_HALF: 47,
    RIM_RADIUS: 7,
    BOARD_L_X: 130, BOARD_R_X: 1470,
    BOARD_W: 12,
    BOARD_TOP: 244, BOARD_BOT: 486,

    BALL_R: 17,
    GRAVITY: 2050,
    THREE_DIST: 430,
    DUNK_DIST: 275,
    PLAYER_H: 178,

    QUARTER_TIME: 60,
    OVERTIME_TIME: 30,
    SHOT_CLOCK: 14,
    PICKUP_RADIUS: 58,

    P1_COLOR: '#37d9ff',
    P2_COLOR: '#ff6440'
  };

  /* 5 CORE IMPACTFUL STATS:
     spd = Speed & court mobility
     sht = Pure shooting accuracy & range
     dnk = Dunk power & takeoff launch range
     def = Defense, steal strip chance & contest pressure
     pwr = Physical strength, vertical jump & clutch resilience
  */
  AB.STAT_KEYS = ['spd', 'sht', 'dnk', 'def', 'pwr'];
  AB.STAT_LABELS = {
    spd: 'SPEED',
    sht: 'SHOOTING',
    dnk: 'DUNK',
    def: 'DEFENSE',
    pwr: 'POWER'
  };

  AB.overall = function(a){
    const w = { spd: .20, sht: .25, dnk: .20, def: .20, pwr: .15 };
    let s = 0, t = 0;
    for (const k in w){ s += (a[k] || 0) * w[k]; t += w[k]; }
    return Math.round(s / t);
  };

  const P = (o) => {
    o.ovr = AB.overall(o.attrs);
    o.height = o.body.h;
    o.reach = 1 + (o.body.h - 1) * 0.9;
    return o;
  };

  AB.ROSTER = [
    P({
      id:'curry', name:'Stephen Curry', first:'STEPHEN', short:'CURRY', nick:'“CHEF CURRY”', num:'30',
      team:'Golden State Warriors', abbr:'GSW', sig:'LIMITLESS RANGE · QUICK TRIGGER',
      colors:{ primary:'#1D428A', secondary:'#FFC72C', dark:'#0A1836', jersey:'#1D428A', trim:'#FFC72C', text:'#FFC72C' },
      skin:'#d89f72', skinShade:'#af7348', skinLight:'#f0b88d',
      hair:{ style:'curly_fade', color:'#221711', light:'#3e2d22' },
      facial:'goatee', beard:'#241a14',
      eyes:'#4a311b', brows:'#1c140e',
      headband:null, sleeve:'#FFC72C', wrist:'#FFC72C', armband:null,
      body:{ h:.97, build:.88, shoulders:.94 },
      attrs:{ spd:94, sht:99, dnk:58, def:82, pwr:76 },
      style:'Greatest shooter of all time. Deadly from any spot on the floor.'
    }),
    P({
      id:'lebron', name:'LeBron James', first:'LEBRON', short:'LEBRON', nick:'“THE KING”', num:'23',
      team:'Los Angeles Lakers', abbr:'LAL', sig:'FREIGHT TRAIN · ALL-AROUND BEAST',
      colors:{ primary:'#552583', secondary:'#FDB927', dark:'#1C0E33', jersey:'#552583', trim:'#FDB927', text:'#FDB927' },
      skin:'#7b4d2c', skinShade:'#593319', skinLight:'#9c6640',
      hair:{ style:'buzz', color:'#140e0c', light:'#281c18' },
      facial:'full_beard', beard:'#17100d',
      eyes:'#26180f', brows:'#140e0c',
      headband:'#552583', sleeve:'#1a1a1e', wrist:'#FDB927', armband:null,
      body:{ h:1.06, build:1.10, shoulders:1.12 },
      attrs:{ spd:91, sht:88, dnk:98, def:93, pwr:99 },
      style:'Unstoppable freight train with unmatched raw power and elite court vision.'
    }),
    P({
      id:'jordan', name:'Michael Jordan', first:'MICHAEL', short:'JORDAN', nick:'“AIR JORDAN”', num:'23',
      team:'Chicago Bulls', abbr:'CHI', sig:'TAKE FLIGHT · KILLER INSTINCT',
      colors:{ primary:'#CE1141', secondary:'#111111', dark:'#2A050C', jersey:'#CE1141', trim:'#ffffff', text:'#ffffff' },
      skin:'#724424', skinShade:'#512d14', skinLight:'#945e37',
      hair:{ style:'bald', color:'#140d0a', light:'#261a15' },
      facial:'mj_mustache', beard:'#19100c',
      eyes:'#22140b', brows:'#140d0a',
      headband:null, sleeve:null, wrist:'#ffffff', armband:'#CE1141',
      body:{ h:1.01, build:1.00, shoulders:1.02 },
      attrs:{ spd:97, sht:95, dnk:98, def:98, pwr:92 },
      style:'The undisputed standard. Unstoppable hangtime, lethal jumper, lockdown defense.'
    }),
    P({
      id:'kobe', name:'Kobe Bryant', first:'KOBE', short:'KOBE', nick:'“BLACK MAMBA”', num:'24',
      team:'Los Angeles Lakers', abbr:'LAL', sig:'MAMBA MENTALITY · UNGUARDABLE',
      colors:{ primary:'#FDB927', secondary:'#552583', dark:'#3A2A05', jersey:'#FDB927', trim:'#552583', text:'#552583' },
      skin:'#8c5631', skinShade:'#693a1d', skinLight:'#ab724b',
      hair:{ style:'buzz_taper', color:'#150f0d', light:'#291d19' },
      facial:'stubble', beard:'#1a120e',
      eyes:'#23150d', brows:'#150f0d',
      headband:null, sleeve:'#552583', wrist:'#552583', armband:null,
      body:{ h:1.00, build:.98, shoulders:1.01 },
      attrs:{ spd:93, sht:96, dnk:93, def:92, pwr:88 },
      style:'Relentless footwork and fearless shot-making in the clutch.'
    }),
    P({
      id:'durant', name:'Kevin Durant', first:'KEVIN', short:'DURANT', nick:'“SLIM REAPER”', num:'35',
      team:'Phoenix Suns', abbr:'PHX', sig:'7-FOOT SNIPER · UNCONTESTABLE',
      colors:{ primary:'#1D1160', secondary:'#E56020', dark:'#0C0728', jersey:'#1D1160', trim:'#E56020', text:'#E56020' },
      skin:'#673c20', skinShade:'#492612', skinLight:'#855232',
      hair:{ style:'buzz', color:'#130e0c', light:'#251b18' },
      facial:'goatee', beard:'#17100c',
      eyes:'#20130a', brows:'#130e0c',
      headband:null, sleeve:null, wrist:'#E56020', armband:null,
      body:{ h:1.09, build:.86, shoulders:.96 },
      attrs:{ spd:88, sht:98, dnk:90, def:86, pwr:84 },
      style:'Seven-foot sharpshooter who can elevate and drain over anyone.'
    }),
    P({
      id:'giannis', name:'Giannis Antetokounmpo', first:'GIANNIS', short:'GIANNIS', nick:'“GREEK FREAK”', num:'34',
      team:'Milwaukee Bucks', abbr:'MIL', sig:'SUPERHUMAN REACH · RIM DESTROYER',
      colors:{ primary:'#00471B', secondary:'#EEE1C6', dark:'#03240E', jersey:'#00471B', trim:'#EEE1C6', text:'#EEE1C6' },
      skin:'#57341b', skinShade:'#3d210e', skinLight:'#744a2c',
      hair:{ style:'fade', color:'#120d0b', light:'#241a16' },
      facial:'short_beard', beard:'#160e0a',
      eyes:'#1e120a', brows:'#120d0b',
      headband:null, sleeve:null, wrist:'#EEE1C6', armband:null,
      body:{ h:1.09, build:1.08, shoulders:1.10 },
      attrs:{ spd:93, sht:72, dnk:99, def:97, pwr:99 },
      style:'Ridiculous wingspan and freak athleticism that turns the paint into a warzone.'
    }),
    P({
      id:'doncic', name:'Luka Dončić', first:'LUKA', short:'LUKA', nick:'“LUKA MAGIC”', num:'77',
      team:'Dallas Mavericks', abbr:'DAL', sig:'STEPBACK WIZARD · TRIPLE-DOUBLE',
      colors:{ primary:'#00538C', secondary:'#B8C4CA', dark:'#001A2E', jersey:'#00538C', trim:'#B8C4CA', text:'#B8C4CA' },
      skin:'#e2b994', skinShade:'#bf936f', skinLight:'#f5d0b0',
      hair:{ style:'wavy', color:'#3a2416', light:'#543725' },
      facial:'stubble', beard:'#422b1c',
      eyes:'#302014', brows:'#26180f',
      headband:null, sleeve:null, wrist:'#00538C', armband:null,
      body:{ h:1.03, build:1.06, shoulders:1.04 },
      attrs:{ spd:82, sht:96, dnk:65, def:80, pwr:90 },
      style:'Master of tempo and stepback wizardry. Makes the hardest shots look effortless.'
    }),
    P({
      id:'shaq', name:"Shaquille O'Neal", first:'SHAQ', short:'SHAQ', nick:'“THE DIESEL”', num:'34',
      team:'Los Angeles Lakers', abbr:'LAL', sig:'MOST DOMINANT EVER · RIM CRUSHER',
      colors:{ primary:'#552583', secondary:'#FDB927', dark:'#1C0E33', jersey:'#552583', trim:'#FDB927', text:'#FDB927' },
      skin:'#593319', skinShade:'#3e200e', skinLight:'#784a29',
      hair:{ style:'bald', color:'#130d0a', light:'#241814' },
      facial:'goatee', beard:'#170f0b',
      eyes:'#1e1208', brows:'#130d0a',
      headband:null, sleeve:null, wrist:'#FDB927', armband:null,
      body:{ h:1.12, build:1.32, shoulders:1.24 },
      attrs:{ spd:74, sht:50, dnk:99, def:94, pwr:100 },
      style:'The most physically dominant force in basketball history. Backboard breaker.'
    }),
    P({
      id:'iverson', name:'Allen Iverson', first:'ALLEN', short:'IVERSON', nick:'“THE ANSWER”', num:'3',
      team:'Philadelphia 76ers', abbr:'PHI', sig:'KILLER CROSSOVER · PURE HEART',
      colors:{ primary:'#006BB6', secondary:'#ED174C', dark:'#001E33', jersey:'#006BB6', trim:'#ED174C', text:'#ED174C' },
      skin:'#6c4123', skinShade:'#4c2912', skinLight:'#8c5a35',
      hair:{ style:'cornrows', color:'#140e0c', light:'#281c17' },
      facial:'goatee', beard:'#18100c',
      eyes:'#201209', brows:'#140e0c',
      headband:'#ED174C', sleeve:'#ffffff', wrist:'#ED174C', armband:null,
      body:{ h:.94, build:.86, shoulders:.94 },
      attrs:{ spd:99, sht:90, dnk:75, def:92, pwr:70 },
      style:'Lightning fast first step and legendary ankle-breaking handles.'
    }),
    P({
      id:'jokic', name:'Nikola Jokić', first:'NIKOLA', short:'JOKIC', nick:'“THE JOKER”', num:'15',
      team:'Denver Nuggets', abbr:'DEN', sig:'SOMBOR SHUFFLE · HOOPS IQ',
      colors:{ primary:'#0E2240', secondary:'#FEC524', dark:'#050d1c', jersey:'#0E2240', trim:'#FEC524', text:'#FEC524' },
      skin:'#e8c2a2', skinShade:'#c69e7e', skinLight:'#f9d9bd',
      hair:{ style:'crew', color:'#3c2817', light:'#563d28' },
      facial:'stubble', beard:'#4a3421',
      eyes:'#322216', brows:'#2a1b10',
      headband:null, sleeve:null, wrist:'#FEC524', armband:null,
      body:{ h:1.06, build:1.14, shoulders:1.08 },
      attrs:{ spd:70, sht:95, dnk:68, def:84, pwr:96 },
      style:'Softest touch in the league with legendary basketball genius.'
    })
  ];

  AB.byId = id => AB.ROSTER.find(p => p.id === id);
  AB.DEFAULT_P1 = 'curry';
  AB.DEFAULT_P2 = 'jordan';
})();
