// iq-matrix.js — Benchmark Cognitive IQ Assessment v2
// Based on WAIS-IV, Raven's SPM, Cattell CFIT methodology
(function(){
"use strict";
const{useState,useEffect,useRef,useCallback}=React;
const h=React.createElement;

// ═══════════ CSS ═══════════
const css=document.createElement('style');
css.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
#neuro-link-root *{box-sizing:border-box;margin:0;padding:0}
.iq{width:100%;height:100%;background:#f4f5f9;color:#0f172a;font-family:'Inter',-apple-system,sans-serif;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;align-items:center;-webkit-overflow-scrolling:touch}
.iq-inner{width:100%;max-width:560px;padding:24px 20px;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px));flex:1;display:flex;flex-direction:column}
@keyframes iq-in{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
@keyframes iq-pop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
@keyframes iq-shake{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
@keyframes iq-digit{0%{transform:scale(.5);opacity:0}50%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
@keyframes iq-pulse{0%,100%{opacity:1}50%{opacity:.5}}
.iq-card{background:#fff;border:1px solid #e8eaef;border-radius:16px;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.iq-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;-webkit-tap-highlight-color:transparent;min-height:48px;touch-action:manipulation}
.iq-btn:active{transform:scale(.97)}
.iq-btn-primary{background:#4f46e5;color:#fff;box-shadow:0 2px 12px rgba(79,70,229,.25)}
.iq-btn-primary:hover{background:#4338ca}
.iq-btn-ghost{background:transparent;color:#64748b;border:1px solid #e2e8f0}
.iq-btn-ghost:hover{background:#f1f5f9}
.iq-opt{width:100%;padding:16px 18px;border-radius:12px;border:2px solid #e8eaef;background:#fff;color:#1e293b;font-size:14px;font-weight:500;cursor:pointer;text-align:left;transition:all .15s;font-family:inherit;display:flex;align-items:center;gap:12px;min-height:52px;touch-action:manipulation}
.iq-opt:hover{border-color:#c7d2fe;background:#f5f3ff}
.iq-opt:active{transform:scale(.98)}
.iq-opt .iq-k{width:30px;height:30px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#94a3b8;flex-shrink:0}
.iq-opt.ok{border-color:#059669!important;background:#ecfdf5!important}.iq-opt.ok .iq-k{background:#059669;color:#fff}
.iq-opt.no{border-color:#dc2626!important;background:#fef2f2!important;animation:iq-shake .4s}.iq-opt.no .iq-k{background:#dc2626;color:#fff}
.iq-opt.dim{opacity:.35;pointer-events:none}
.iq-pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;max-width:260px;margin:0 auto}
.iq-pcell{aspect-ratio:1;border-radius:10px;background:#fff;border:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:center}
.iq-pcell.mystery{background:#eef2ff;border:2px dashed #a5b4fc}
.iq-pcell.rv{border-color:#059669;background:#ecfdf5}
.iq-popts{display:grid;gap:8px;margin-top:16px}
.iq-popt{aspect-ratio:1;border-radius:10px;background:#fff;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;min-height:48px;touch-action:manipulation}
.iq-popt:hover{border-color:#a5b4fc;background:#f5f3ff}
.iq-popt.ok{border-color:#059669!important;background:#ecfdf5!important}
.iq-popt.no{border-color:#dc2626!important;background:#fef2f2!important;animation:iq-shake .4s}
.iq-popt.dim{opacity:.3;pointer-events:none}
.iq-prog{height:4px;background:#e8eaef;border-radius:2px;overflow:hidden;width:100%}
.iq-prog-fill{height:100%;border-radius:2px;transition:width .4s ease}
.iq-badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:600;letter-spacing:.5px}
.iq-timer{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;background:#fff;border:1px solid #e8eaef;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;color:#64748b}
.iq-timer .dot{width:6px;height:6px;border-radius:50%;background:#4f46e5;animation:iq-pulse 1s infinite}
.iq-num-input{width:120px;height:56px;border-radius:14px;border:2px solid #e2e8f0;background:#fff;font-size:24px;font-weight:700;text-align:center;color:#1e293b;font-family:inherit;outline:none;transition:border .2s}
.iq-num-input:focus{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.1)}
.iq-kpad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:260px;margin:0 auto}
.iq-kbtn{height:58px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;font-size:22px;font-weight:700;color:#1e293b;cursor:pointer;transition:all .1s;font-family:inherit;touch-action:manipulation}
.iq-kbtn:hover{background:#f1f5f9}.iq-kbtn:active{transform:scale(.93);background:#e2e8f0}
.iq-flash{font-size:72px;font-weight:800;animation:iq-digit .4s ease-out}
.iq-hist{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e8eaef;margin-bottom:8px;cursor:default}
@media(max-width:480px){
  .iq-inner{padding:16px 14px;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}
  .iq-opt{padding:14px 14px;font-size:13px;min-height:52px}
  .iq-opt .iq-k{width:28px;height:28px;font-size:11px}
  .iq-flash{font-size:clamp(48px,14vw,72px)}
  .iq-pgrid{max-width:min(240px,70vw);gap:5px}
  .iq-pcell{border-radius:8px}
  .iq-kpad{max-width:min(240px,65vw);gap:8px}
  .iq-kbtn{height:54px;font-size:20px;border-radius:10px}
  .iq-num-input{width:min(120px,35vw);height:52px;font-size:22px;border-radius:12px}
  .iq-btn{padding:14px 24px;font-size:14px;min-height:48px;width:100%}
  .iq-card{border-radius:14px;padding:14px}
  .iq-timer{font-size:10px;padding:4px 8px}
  .iq-badge{font-size:10px;padding:3px 10px}
  .iq-popt{min-height:52px;border-radius:8px}
  .iq-popts{gap:6px}
  .iq-hist{padding:10px 12px;gap:10px}
}
@media(max-width:350px){
  .iq-inner{padding:12px 10px}
  .iq-opt{padding:12px 10px;font-size:12px;gap:8px}
  .iq-opt .iq-k{width:26px;height:26px}
  .iq-pgrid{max-width:min(200px,65vw)}
  .iq-kpad{max-width:min(200px,60vw);gap:6px}
  .iq-kbtn{height:48px;font-size:18px}
  .iq-num-input{width:90px;height:48px;font-size:18px}
}
`;
document.head.appendChild(css);

// ═══════════ QUESTION BANKS ═══════════
// d=difficulty: 1=easy,2=medium,3=hard,4=expert
// Number Sequences: s=seq, a=answer, r=rule
const NS=[
// Easy (d:1)
{s:[2,4,6,8],a:10,d:1,r:'Add 2'},{s:[5,10,15,20],a:25,d:1,r:'Add 5'},{s:[1,3,5,7],a:9,d:1,r:'Odd numbers'},
{s:[10,20,30,40],a:50,d:1,r:'Add 10'},{s:[100,90,80,70],a:60,d:1,r:'Subtract 10'},{s:[3,6,9,12],a:15,d:1,r:'Add 3'},
{s:[4,8,12,16],a:20,d:1,r:'Add 4'},{s:[7,14,21,28],a:35,d:1,r:'Add 7'},{s:[50,45,40,35],a:30,d:1,r:'Subtract 5'},
{s:[1,2,3,4,5],a:6,d:1,r:'Add 1'},{s:[25,20,15,10],a:5,d:1,r:'Subtract 5'},{s:[6,12,18,24],a:30,d:1,r:'Add 6'},
{s:[0,5,10,15],a:20,d:1,r:'Add 5'},{s:[8,16,24,32],a:40,d:1,r:'Add 8'},{s:[11,22,33,44],a:55,d:1,r:'Add 11'},
// Medium (d:2)
{s:[2,4,8,16],a:32,d:2,r:'Multiply by 2'},{s:[1,1,2,3,5],a:8,d:2,r:'Fibonacci'},{s:[1,4,9,16],a:25,d:2,r:'Perfect squares (n²)'},
{s:[3,5,9,15,23],a:33,d:2,r:'Add 2,4,6,8,10'},{s:[81,27,9,3],a:1,d:2,r:'Divide by 3'},{s:[1,3,6,10],a:15,d:2,r:'Triangular numbers'},
{s:[2,6,18,54],a:162,d:2,r:'Multiply by 3'},{s:[1,2,4,7,11],a:16,d:2,r:'Add 1,2,3,4,5'},{s:[1,4,9,16,25],a:36,d:2,r:'n²'},
{s:[5,10,20,40],a:80,d:2,r:'Multiply by 2'},{s:[1,8,27,64],a:125,d:2,r:'Perfect cubes (n³)'},{s:[48,24,12,6],a:3,d:2,r:'Divide by 2'},
{s:[3,9,27,81],a:243,d:2,r:'Multiply by 3'},{s:[2,3,5,8,12],a:17,d:2,r:'Add 1,2,3,4,5'},{s:[1,3,7,15],a:31,d:2,r:'2ⁿ−1'},
// Hard (d:3)
{s:[2,6,12,20],a:30,d:3,r:'n(n+1)'},{s:[1,2,6,24],a:120,d:3,r:'Factorials (n!)'},{s:[2,3,5,7,11],a:13,d:3,r:'Prime numbers'},
{s:[0,1,1,2,4,7],a:13,d:3,r:'Tribonacci'},{s:[1,5,14,30],a:55,d:3,r:'Cumulative sum of squares'},
{s:[2,5,10,17,26],a:37,d:3,r:'n²+1'},{s:[3,7,15,31,63],a:127,d:3,r:'2ⁿ−1'},{s:[0,3,8,15,24],a:35,d:3,r:'n²−1'},
{s:[1,4,13,40],a:121,d:3,r:'×3+1'},{s:[2,5,11,23,47],a:95,d:3,r:'×2+1'},{s:[6,11,18,27,38],a:51,d:3,r:'Differences +5,+7,+9,+11,+13'},
{s:[4,9,25,49],a:121,d:3,r:'Squares of primes'},{s:[1,2,4,8,16,32],a:64,d:3,r:'Powers of 2'},
// Expert (d:4)
{s:[1,4,27,256],a:3125,d:4,r:'nⁿ (1¹,2²,3³,4⁴,5⁵)'},{s:[2,12,36,80,150],a:252,d:4,r:'n²(n+1)'},
{s:[1,5,14,30,55],a:91,d:4,r:'Sum of first n squares'},{s:[4,9,25,49,121],a:169,d:4,r:'Squares of primes (2²,3²,5²,7²,11²,13²)'},
{s:[1,1,2,5,14],a:42,d:4,r:'Catalan numbers'},{s:[1,2,6,24,120],a:720,d:4,r:'Factorials extended'},
{s:[3,5,11,29,83],a:245,d:4,r:'×3−4'},{s:[1,2,5,12,29],a:70,d:4,r:'Pell numbers a(n)=2a(n-1)+a(n-2)'},
{s:[2,10,30,68,130],a:222,d:4,r:'n³+n'},{s:[0,1,3,7,15,31],a:63,d:4,r:'2ⁿ−1 from n=0'},
{s:[1,3,13,63,313],a:1563,d:4,r:'×5−2'},{s:[2,6,14,30,62],a:126,d:4,r:'2ⁿ−2'},
];

// Verbal: q=question, o=options, a=correct index, t='a'=analogy,'o'=odd-one-out
const VB=[
// Easy analogies
{q:'Hot is to Cold as Up is to ___',o:['Over','Down','High','Away'],a:1,d:1,t:'a'},
{q:'Dog is to Puppy as Cat is to ___',o:['Cub','Kitten','Pup','Kit'],a:1,d:1,t:'a'},
{q:'Eye is to See as Ear is to ___',o:['Sound','Hear','Listen','Noise'],a:1,d:1,t:'a'},
{q:'King is to Queen as Prince is to ___',o:['Duchess','Princess','Lady','Dame'],a:1,d:1,t:'a'},
{q:'Bird is to Fly as Fish is to ___',o:['Dive','Swim','Float','Breathe'],a:1,d:1,t:'a'},
{q:'Hand is to Glove as Foot is to ___',o:['Sock','Shoe','Sandal','Boot'],a:1,d:1,t:'a'},
{q:'Sun is to Day as Moon is to ___',o:['Dark','Night','Stars','Sky'],a:1,d:1,t:'a'},
{q:'Milk is to White as Sky is to ___',o:['Clouds','Blue','High','Air'],a:1,d:1,t:'a'},
{q:'Pen is to Write as Knife is to ___',o:['Sharp','Cut','Blade','Slice'],a:1,d:1,t:'a'},
{q:'Bee is to Honey as Cow is to ___',o:['Beef','Milk','Leather','Grass'],a:1,d:1,t:'a'},
{q:'Grass is to Green as Snow is to ___',o:['Cold','White','Ice','Winter'],a:1,d:1,t:'a'},
{q:'Teacher is to School as Doctor is to ___',o:['Clinic','Hospital','Patient','Medicine'],a:1,d:1,t:'a'},
// Easy odd-one-out
{q:'Which does NOT belong?',o:['Apple','Banana','Carrot','Mango'],a:2,d:1,t:'o'},
{q:'Which does NOT belong?',o:['Piano','Guitar','Trumpet','Painting'],a:3,d:1,t:'o'},
{q:'Which does NOT belong?',o:['Red','Blue','Circle','Green'],a:2,d:1,t:'o'},
// Medium analogies
{q:'Pen is to Writer as Brush is to ___',o:['Canvas','Artist','Painter','Color'],a:2,d:2,t:'a'},
{q:'Book is to Chapter as Play is to ___',o:['Scene','Act','Script','Drama'],a:1,d:2,t:'a'},
{q:'Seed is to Tree as Egg is to ___',o:['Chicken','Bird','Nest','Shell'],a:1,d:2,t:'a'},
{q:'Clock is to Time as Thermometer is to ___',o:['Heat','Temperature','Weather','Mercury'],a:1,d:2,t:'a'},
{q:'Brave is to Coward as Generous is to ___',o:['Rich','Miser','Poor','Greedy'],a:1,d:2,t:'a'},
{q:'Flour is to Bread as Grapes is to ___',o:['Juice','Wine','Jam','Raisins'],a:1,d:2,t:'a'},
{q:'Library is to Books as Gallery is to ___',o:['Art','Paintings','Museum','Frames'],a:1,d:2,t:'a'},
{q:'Author is to Novel as Director is to ___',o:['Actor','Film','Theatre','Script'],a:1,d:2,t:'a'},
{q:'Petal is to Flower as Page is to ___',o:['Paper','Book','Word','Chapter'],a:1,d:2,t:'a'},
{q:'Rain is to Umbrella as Cold is to ___',o:['Jacket','Coat','Heater','Winter'],a:1,d:2,t:'a'},
{q:'Cotton is to Shirt as Leather is to ___',o:['Belt','Shoes','Jacket','Bag'],a:1,d:2,t:'a'},
// Medium odd-one-out
{q:'Which does NOT belong?',o:['Mercury','Venus','Moon','Mars'],a:2,d:2,t:'o'},
{q:'Which does NOT belong?',o:['Sonnet','Haiku','Limerick','Novel'],a:3,d:2,t:'o'},
// Hard analogies
{q:'Scalpel is to Surgeon as Gavel is to ___',o:['Lawyer','Court','Judge','Law'],a:2,d:3,t:'a'},
{q:'Verbose is to Concise as Extravagant is to ___',o:['Cheap','Frugal','Modest','Simple'],a:1,d:3,t:'a'},
{q:'Caterpillar is to Butterfly as Tadpole is to ___',o:['Toad','Frog','Fish','Lizard'],a:1,d:3,t:'a'},
{q:'Archipelago is to Islands as Constellation is to ___',o:['Sky','Stars','Planets','Space'],a:1,d:3,t:'a'},
{q:'Telescope is to Stars as Microscope is to ___',o:['Lab','Cells','Germs','Lens'],a:1,d:3,t:'a'},
{q:'Elated is to Happy as Furious is to ___',o:['Sad','Angry','Upset','Annoyed'],a:1,d:3,t:'a'},
{q:'Anchor is to Ship as Foundation is to ___',o:['House','Building','Ground','Concrete'],a:1,d:3,t:'a'},
{q:'Nocturnal is to Night as Diurnal is to ___',o:['Morning','Day','Sun','Light'],a:1,d:3,t:'a'},
{q:'Flock is to Sheep as Pack is to ___',o:['Dogs','Wolves','Cards','Bags'],a:1,d:3,t:'a'},
// Hard odd-one-out
{q:'Which does NOT belong?',o:['Bach','Beethoven','Mozart','Picasso'],a:3,d:3,t:'o'},
{q:'Which does NOT belong?',o:['Hydrogen','Helium','Nitrogen','Neutron'],a:3,d:3,t:'o'},
// Expert analogies
{q:'Insomnia is to Sleep as Amnesia is to ___',o:['Brain','Memory','Forget','Dream'],a:1,d:4,t:'a'},
{q:'Chronology is to Time as Cartography is to ___',o:['Maps','Earth','Geography','Atlas'],a:0,d:4,t:'a'},
{q:'Altruism is to Selfishness as Benevolence is to ___',o:['Kindness','Malevolence','Evil','Cruelty'],a:1,d:4,t:'a'},
{q:'Parchment is to Paper as Quill is to ___',o:['Feather','Pen','Ink','Write'],a:1,d:4,t:'a'},
{q:'Olfactory is to Smell as Gustatory is to ___',o:['Touch','Taste','Sight','Sound'],a:1,d:4,t:'a'},
{q:'Bibliophile is to Books as Audiophile is to ___',o:['Ears','Sound','Music','Speakers'],a:1,d:4,t:'a'},
{q:'Pedagogy is to Teaching as Jurisprudence is to ___',o:['Justice','Law','Courts','Crime'],a:1,d:4,t:'a'},
{q:'Prologue is to Beginning as Epilogue is to ___',o:['Middle','End','Summary','Chapter'],a:1,d:4,t:'a'},
// Expert odd-one-out
{q:'Which does NOT belong?',o:['Ontology','Epistemology','Dendrology','Cosmology'],a:2,d:4,t:'o'},
{q:'Which does NOT belong?',o:['Fibonacci','Euler','Newton','Shakespeare'],a:3,d:4,t:'o'},
];

// Logic: q=question, o=options, a=correct index
const LG=[
// Easy
{q:'All dogs are animals. Buddy is a dog. Buddy is:',o:['A pet','An animal','Friendly','A mammal'],a:1,d:1},
{q:'If it rains, the ground gets wet. It is raining. Therefore:',o:['It will stop soon','The ground is wet','You need an umbrella','It\'s cold'],a:1,d:1},
{q:'Sarah is taller than Mike. Mike is taller than John. Who is shortest?',o:['Sarah','Mike','John','Cannot tell'],a:2,d:1},
{q:'If today is Monday, what day is the day after tomorrow?',o:['Tuesday','Wednesday','Thursday','Sunday'],a:1,d:1},
{q:'All squares have 4 sides. This shape has 3 sides. It is:',o:['A square','Not a square','A rectangle','Maybe a square'],a:1,d:1},
{q:'No fish can walk. A salmon is a fish. Can a salmon walk?',o:['Yes','No','Maybe','Sometimes'],a:1,d:1},
{q:'Tom is older than Amy. Amy is older than Ben. Who is oldest?',o:['Tom','Amy','Ben','Cannot tell'],a:0,d:1},
{q:'All birds have feathers. A robin is a bird. A robin has:',o:['Wings only','Feathers','A beak only','Fur'],a:1,d:1},
{q:'All cats are pets. Whiskers is a cat. Whiskers is:',o:['Wild','A pet','A dog','Unknown'],a:1,d:1},
{q:'All roses are flowers. Daisy is a rose. Daisy is:',o:['A tree','A flower','A weed','A bush'],a:1,d:1},
{q:'If A=1 and B=2, what is A+B?',o:['1','2','3','4'],a:2,d:1},
{q:'Monday comes before Tuesday. Wednesday comes after Tuesday. What comes first?',o:['Tuesday','Wednesday','Monday','Thursday'],a:2,d:1},
// Medium
{q:'All roses are flowers. Some flowers are red. Which MUST be true?',o:['All roses are red','Some flowers are roses','All flowers are roses','No roses are red'],a:1,d:2},
{q:'Tom finished before Jerry but after Sam. Who won?',o:['Tom','Jerry','Sam','Cannot tell'],a:2,d:2},
{q:'All Bloops are Razzies. All Razzies are Lazzies. All Bloops are:',o:['Razzies only','Lazzies','Bloops','None of these'],a:1,d:2},
{q:'If A>B, B>C, C>D, which is true?',o:['D>A','A>D','B=C','A=D'],a:1,d:2},
{q:'If P implies Q, and Q is false. What about P?',o:['P is true','P is false','P is unknown','P implies not Q'],a:1,d:2},
{q:'A is B\'s parent. B is C\'s parent. A is C\'s:',o:['Parent','Grandparent','Sibling','Uncle'],a:1,d:2},
{q:'There are 3 red, 4 blue, 2 green balls. Most common color?',o:['Red','Blue','Green','Equal'],a:1,d:2},
{q:'Every student passed. Mark is a student. Therefore:',o:['Mark failed','Mark passed','Mark might pass','Not enough info'],a:1,d:2},
{q:'Ann, Bob, Cal in a line. Bob isn\'t first or last. Cal isn\'t last. Who is first?',o:['Ann','Bob','Cal','Cannot tell'],a:2,d:2},
{q:'If all X are Y, and Z is not Y, then Z is:',o:['X','Not X','Maybe X','Y'],a:1,d:2},
{q:'You need flour AND eggs to bake. You have flour but no eggs. Can you bake?',o:['Yes','No','Maybe','Only bread'],a:1,d:2},
{q:'If N is even, N+1 is odd. N=6. N+1 is:',o:['Even','Odd','6','8'],a:1,d:2},
// Hard
{q:'All managers are employees. No employees are interns. Therefore:',o:['Some interns manage','No managers are interns','All employees manage','Interns are employees'],a:1,d:3},
{q:'"Only geniuses can solve this." Alex solved it. Therefore:',o:['Alex is smart','Alex is a genius','It was easy','Nothing certain'],a:1,d:3},
{q:'5 people shake hands with everyone else once. Total handshakes?',o:['5','10','15','20'],a:1,d:3},
{q:'Everyone who likes chess also likes logic. Sam dislikes logic. Therefore:',o:['Sam likes chess','Sam dislikes chess','Sam likes puzzles','Cannot determine'],a:1,d:3},
{q:'A always lies. B always tells truth. A says "B is a liar." Therefore:',o:['B is a liar','A is lying, B is truthful','Both lie','Cannot tell'],a:1,d:3},
{q:'If all ravens are black, what would DISPROVE this?',o:['More black ravens','A white raven','A black crow','No ravens'],a:1,d:3},
{q:'3 cats catch 3 mice in 3 min. How many cats catch 100 mice in 100 min?',o:['100','3','300','33'],a:1,d:3},
{q:'All primes >2 are odd. 9 is odd. Is 9 prime?',o:['Yes','No, odd ≠ sufficient for prime','Yes, all odds are prime','Cannot tell'],a:1,d:3},
{q:'2 fathers and 2 sons, but only 3 people. How?',o:['Impossible','Grandfather-father-son','Twins','Two families'],a:1,d:3},
{q:'If you overtake 2nd place in a race, what place are you in?',o:['1st','2nd','3rd','Depends'],a:1,d:3},
{q:'If "all X are Y" is true, which must also be true?',o:['All Y are X','If not Y then not X','Some Y are not X','None of these'],a:1,d:3},
// Expert
{q:'A bat and ball cost $1.10. Bat costs $1 more than ball. Ball costs:',o:['$0.10','$0.05','$0.50','$0.15'],a:1,d:4},
{q:'23 people in a room. Probability 2 share a birthday (approx)?',o:['About 6%','About 50%','About 75%','About 1%'],a:1,d:4},
{q:'A lily pad doubles daily, covers pond on day 30. Half-covered on day:',o:['Day 15','Day 29','Day 20','Day 25'],a:1,d:4},
{q:'100 lockers toggled by 100 students (k-th student toggles every k-th). Open lockers are:',o:['Even numbered','Perfect squares','Prime numbered','Odd numbered'],a:1,d:4},
{q:'Knights tell truth, knaves lie. A says "We are both knaves." A is:',o:['A knight','A knave','Either','Cannot tell'],a:1,d:4},
{q:'A snail climbs 3ft/day, slips 2ft/night. Days to escape 10ft well?',o:['10','8','7','9'],a:1,d:4},
{q:'If yesterday was the day before Thursday, what is tomorrow?',o:['Thursday','Friday','Saturday','Sunday'],a:2,d:4},
{q:'Father: "I have 5 daughters, each has a brother." Min children?',o:['6','10','7','11'],a:0,d:4},
{q:'A coin is flipped 3 times. P(at least 2 heads)?',o:['25%','37.5%','50%','75%'],a:2,d:4},
{q:'8 identical balls, 1 heavier. Min weighings on balance to find it?',o:['1','2','3','4'],a:1,d:4},
{q:'Two trains 100km apart, each 50km/h. Bee at 75km/h flies between. Bee\'s total distance?',o:['50km','75km','100km','150km'],a:1,d:4},
];

// ═══════════ CONSTANTS ═══════════
const SECTIONS=[
  {id:'pattern',name:'Pattern Recognition',icon:'🔷',color:'#4f46e5',desc:'Identify the missing piece in a visual pattern matrix.'},
  {id:'numbers',name:'Numerical Reasoning',icon:'🔢',color:'#0891b2',desc:'Find the next number in a logical sequence.'},
  {id:'verbal',name:'Verbal Reasoning',icon:'📝',color:'#7c3aed',desc:'Identify relationships between words and concepts.'},
  {id:'memory',name:'Working Memory',icon:'🧠',color:'#059669',desc:'Memorize and recall number sequences.'},
  {id:'logic',name:'Logical Deduction',icon:'⚖️',color:'#ea580c',desc:'Solve problems using deductive reasoning.'},
];
const KEYS=['A','B','C','D','E','F'];
const QPS=6; // questions per section
const TOTAL_Q=QPS*5; // 30
const DIFF_PTS={1:1,2:2,3:3,4:5};
const MAX_SEC=2*1+2*2+1*3+1*5; // 14 per section
const MAX_TOTAL=MAX_SEC*5; // 70
const MEM_CFG=[{len:4},{len:5},{len:6},{len:5,rev:true},{len:7},{len:8}];
const MEM_D=[1,1,2,2,3,4];
const STORE_KEY='iq_matrix_history';

// ═══════════ UTILITIES ═══════════
function sh(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}
function pickQ(bank){
  const e=sh(bank.filter(q=>q.d===1)),m=sh(bank.filter(q=>q.d===2)),h=sh(bank.filter(q=>q.d===3)),x=sh(bank.filter(q=>q.d===4));
  return [...e.slice(0,2),...m.slice(0,2),...h.slice(0,1),...x.slice(0,1)];
}
function cellEq(a,b){return a.shape===b.shape&&a.color===b.color&&a.size===b.size&&a.count===b.count;}
function normCDF(z){const a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911;
  const s=z<0?-1:1;z=Math.abs(z)/Math.sqrt(2);const t=1/(1+p*z);
  return .5*(1+s*(1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-z*z)));}
function iqPct(iq){return Math.min(99.9,Math.max(0.1,Math.round(normCDF((iq-100)/15)*1000)/10));}

// ═══════════ PATTERN GENERATOR ═══════════
const PAL=['#3b82f6','#ef4444','#059669','#f59e0b'];
const SZS=[10,17,24];const PPOS={1:[[50,50]],2:[[33,50],[67,50]],3:[[50,26],[30,66],[70,66]]};const PSF={1:1,2:.65,3:.5};
function rShape(t,cx,cy,sz,col,k){switch(t){
  case 0:return h('circle',{key:k,cx,cy,r:sz,fill:col});
  case 1:return h('polygon',{key:k,points:`${cx},${cy-sz} ${cx+sz*.87},${cy+sz*.5} ${cx-sz*.87},${cy+sz*.5}`,fill:col,strokeLinejoin:'round'});
  case 2:{const w=sz*.85;return h('rect',{key:k,x:cx-w,y:cy-w,width:w*2,height:w*2,fill:col,rx:2});}
  case 3:return h('polygon',{key:k,points:`${cx},${cy-sz} ${cx+sz*.7},${cy} ${cx},${cy+sz} ${cx-sz*.7},${cy}`,fill:col,strokeLinejoin:'round'});
}}
function CSV({cell:c,size:sz}){if(!c)return null;const ps=PPOS[c.count],f=PSF[c.count],s=SZS[c.size]*f,cl=PAL[c.color];
  return h('svg',{viewBox:'0 0 100 100',width:sz||60,height:sz||60},ps.map((p,i)=>rShape(c.shape,p[0],p[1],s,cl,i)));}
function genPz(nr){
  const pd=sh([{key:'shape',pool:[0,1,2,3]},{key:'color',pool:[0,1,2,3]},{key:'size',pool:[0,1,2]},{key:'count',pool:[1,2,3]}]);
  const vp=pd.slice(0,nr),cp=pd.slice(nr),ax=['col','row','diag'];
  const rules=vp.map((p,i)=>({key:p.key,axis:ax[i],values:p.pool.length>3?sh(p.pool).slice(0,3):sh(p.pool)}));
  const con={};cp.forEach(p=>{con[p.key]=p.pool[0|Math.random()*p.pool.length];});
  const grid=[];for(let r=0;r<3;r++){grid[r]=[];for(let c=0;c<3;c++){const cl={...con};rules.forEach(rl=>{let idx=rl.axis==='col'?c:rl.axis==='row'?r:(r+c)%3;cl[rl.key]=rl.values[idx];});grid[r][c]=cl;}}
  const ans={...grid[2][2]};let dis=[];
  for(const rl of rules)for(const v of rl.values)if(v!==ans[rl.key]){const d={...ans,[rl.key]:v};if(!dis.some(x=>cellEq(x,d)))dis.push(d);}
  for(const p of vp){const un=p.pool.filter(v=>!rules.find(r=>r.key===p.key).values.includes(v));for(const v of un){const d={...ans,[p.key]:v};if(!dis.some(x=>cellEq(x,d))&&!cellEq(d,ans))dis.push(d);}}
  const nOpt=nr<=1?4:nr<=2?5:6;dis=sh(dis).slice(0,nOpt-1);
  let s2=0;while(dis.length<nOpt-1&&s2++<20){const rp=pd[0|Math.random()*pd.length];const rv=rp.pool[0|Math.random()*rp.pool.length];const d={...ans,[rp.key]:rv};if(!cellEq(d,ans)&&!dis.some(x=>cellEq(x,d)))dis.push(d);}
  const opts=sh([ans,...dis]);return{grid,answer:ans,options:opts,correctIdx:opts.findIndex(o=>cellEq(o,ans)),numRules:nr};
}
function genMemTrial(len){const d=[];for(let i=0;i<len;i++)d.push(1+Math.floor(Math.random()*9));return d;}

// ═══════════ SCORING ═══════════
function calcIQ(score,avgTime){
  const base=70+(score/MAX_TOTAL)*80;
  let tb=0;
  if(avgTime<8)tb=5;else if(avgTime<12)tb=3;else if(avgTime<18)tb=1;else if(avgTime<25)tb=0;else if(avgTime<35)tb=-2;else tb=-5;
  return Math.max(68,Math.min(155,Math.round(base+tb)));
}
function getCat(iq){
  if(iq>=140)return{label:'Exceptionally Gifted',color:'#9333ea',emoji:'👑',desc:'Extraordinary cognitive abilities across all domains. You demonstrate exceptional abstract reasoning, rapid pattern detection, and superior working memory.'};
  if(iq>=130)return{label:'Very Superior',color:'#7c3aed',emoji:'🏆',desc:'Outstanding cognitive performance. You excel at identifying complex patterns, multi-step reasoning, and maintaining information under pressure.'};
  if(iq>=120)return{label:'Superior',color:'#4f46e5',emoji:'⭐',desc:'Strong analytical abilities. You quickly identify relationships and logical structures that most people overlook.'};
  if(iq>=110)return{label:'Above Average',color:'#0891b2',emoji:'💎',desc:'Solid cognitive performance. You think systematically and handle multi-step reasoning effectively.'};
  if(iq>=100)return{label:'Average',color:'#059669',emoji:'✅',desc:'Your reasoning is on par with the general population. Consistent cognitive training can push you higher.'};
  if(iq>=90)return{label:'Low Average',color:'#d97706',emoji:'📊',desc:'Room for growth. Regular practice with pattern recognition and logic puzzles builds cognitive strength.'};
  return{label:'Below Average',color:'#dc2626',emoji:'📈',desc:'These cognitive skills are highly trainable. Daily practice with puzzles, reading, and memory exercises can improve performance significantly.'};
}

// ═══════════ STORAGE ═══════════
function saveResult(r){try{const h=JSON.parse(localStorage.getItem(STORE_KEY)||'[]');h.unshift(r);if(h.length>20)h.length=20;localStorage.setItem(STORE_KEY,JSON.stringify(h));}catch(e){}}
function getHistory(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||'[]');}catch(e){return[];}}

// ═══════════ PDF REPORT ═══════════
let _jsPDFLoaded=false;
function loadJsPDF(){return new Promise((res,rej)=>{
  if(_jsPDFLoaded&&window.jspdf)return res();
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
  s.onload=()=>{_jsPDFLoaded=true;res();};s.onerror=rej;document.head.appendChild(s);});
}
function generatePDF(iq,cat,scores,totalTime,correct,avgT,byDiff){
  const{jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});
  const W=210,pct=iqPct(iq),m=Math.floor(totalTime/60),s=totalTime%60;
  const cx=W/2;
  // Background
  doc.setFillColor(244,245,249);doc.rect(0,0,W,297,'F');
  // Header bar
  doc.setFillColor(79,70,229);doc.rect(0,0,W,36,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(18);doc.setFont('helvetica','bold');
  doc.text('IQ Matrix — Cognitive Assessment Report',cx,16,{align:'center'});
  doc.setFontSize(10);doc.setFont('helvetica','normal');
  doc.text(new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),cx,26,{align:'center'});
  // IQ Score circle
  let y=52;
  doc.setFillColor(255,255,255);doc.circle(cx,y,22,'F');
  doc.setDrawColor(79,70,229);doc.setLineWidth(.8);doc.circle(cx,y,22,'S');
  const cHex=cat.color;const cR=parseInt(cHex.slice(1,3),16),cG=parseInt(cHex.slice(3,5),16),cB=parseInt(cHex.slice(5,7),16);
  doc.setTextColor(cR,cG,cB);doc.setFontSize(32);doc.setFont('helvetica','bold');doc.text(String(iq),cx,y+4,{align:'center'});
  doc.setFontSize(9);doc.setTextColor(100,116,139);doc.setFont('helvetica','normal');doc.text('Estimated IQ',cx,y+12,{align:'center'});
  y+=22;
  doc.setFillColor(cR,cG,cB,20);doc.roundedRect(cx-28,y,56,10,3,3,'F');
  doc.setTextColor(cR,cG,cB);doc.setFontSize(10);doc.setFont('helvetica','bold');doc.text(cat.emoji+' '+cat.label,cx,y+7,{align:'center'});
  y+=14;doc.setTextColor(100,116,139);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.text('Top '+Math.max(0.1,100-pct).toFixed(1)+'% of population',cx,y,{align:'center'});
  // Description
  y+=8;doc.setFillColor(255,255,255);doc.roundedRect(20,y,170,16,4,4,'F');
  doc.setTextColor(71,85,105);doc.setFontSize(9);const descLines=doc.splitTextToSize(cat.desc,162);doc.text(descLines,cx,y+6,{align:'center'});
  // Domain Breakdown
  y+=22;doc.setTextColor(148,163,184);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('DOMAIN BREAKDOWN',20,y);
  y+=6;
  const secColors=[[79,70,229],[8,145,178],[124,58,237],[5,150,105],[234,88,12]];
  SECTIONS.forEach((sec,i)=>{
    doc.setFillColor(255,255,255);doc.roundedRect(20,y,170,12,3,3,'F');
    doc.setTextColor(51,65,85);doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text(sec.icon+' '+sec.name,24,y+8);
    const sc=scores[i],p=sc/MAX_SEC;
    doc.setTextColor(secColors[i][0],secColors[i][1],secColors[i][2]);doc.text(sc+'/'+MAX_SEC+' ('+Math.round(p*100)+'%)',186,y+8,{align:'right'});
    // Bar
    doc.setFillColor(232,234,239);doc.roundedRect(100,y+3,76,5,2,2,'F');
    if(p>0){doc.setFillColor(secColors[i][0],secColors[i][1],secColors[i][2]);doc.roundedRect(100,y+3,76*p,5,2,2,'F');}
    y+=14;
  });
  // Difficulty Analysis
  y+=4;doc.setTextColor(148,163,184);doc.setFontSize(8);doc.setFont('helvetica','bold');doc.text('DIFFICULTY ANALYSIS',20,y);y+=6;
  const dLvls=[{l:'Easy',d:1,c:[5,150,105]},{l:'Medium',d:2,c:[217,119,6]},{l:'Hard',d:3,c:[220,38,38]},{l:'Expert',d:4,c:[124,58,237]}];
  dLvls.forEach(lv=>{
    const bd=byDiff[lv.d]||{c:0,t:0};const p=bd.t>0?bd.c/bd.t:0;
    doc.setFillColor(255,255,255);doc.roundedRect(20,y,170,10,3,3,'F');
    doc.setTextColor(lv.c[0],lv.c[1],lv.c[2]);doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text(lv.l,24,y+7);
    doc.setTextColor(100,116,139);doc.setFont('helvetica','normal');doc.text(bd.c+'/'+bd.t,186,y+7,{align:'right'});
    doc.setFillColor(232,234,239);doc.roundedRect(60,y+2.5,110,5,2,2,'F');
    if(p>0){doc.setFillColor(lv.c[0],lv.c[1],lv.c[2]);doc.roundedRect(60,y+2.5,110*p,5,2,2,'F');}
    y+=12;
  });
  // Stats
  y+=4;doc.setFillColor(255,255,255);doc.roundedRect(20,y,170,24,4,4,'F');
  const stats=[{v:scores.reduce((a,b)=>a+b,0)+'/'+MAX_TOTAL,l:'Score'},{v:m+'m '+s+'s',l:'Time'},{v:Math.round(avgT)+'s',l:'Avg/Q'},{v:Math.round(correct/TOTAL_Q*100)+'%',l:'Accuracy'}];
  stats.forEach((st,i)=>{
    const sx=20+42.5*i+21.25;
    doc.setTextColor(30,41,59);doc.setFontSize(12);doc.setFont('helvetica','bold');doc.text(st.v,sx,y+10,{align:'center'});
    doc.setTextColor(148,163,184);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text(st.l,sx,y+16,{align:'center'});
  });
  // Insights
  y+=30;const best=scores.indexOf(Math.max(...scores)),worst=scores.indexOf(Math.min(...scores));
  const tAdj=avgT<8?5:avgT<12?3:avgT<18?1:avgT<25?0:avgT<35?-2:-5;
  doc.setFillColor(255,255,255);doc.roundedRect(20,y,170,28,4,4,'F');
  doc.setTextColor(71,85,105);doc.setFontSize(9);doc.setFont('helvetica','normal');
  doc.text('Strongest: '+SECTIONS[best].name+' ('+scores[best]+'/'+MAX_SEC+')',24,y+8);
  doc.text('Weakest: '+SECTIONS[worst].name+' ('+scores[worst]+'/'+MAX_SEC+')',24,y+14);
  doc.text('Time factor: '+(tAdj>=0?'+':'')+tAdj+' IQ points',24,y+20);
  // Footer
  doc.setTextColor(148,163,184);doc.setFontSize(7);doc.text('IQ Matrix — Entertainment assessment. For clinical evaluation, consult a licensed psychologist.',cx,290,{align:'center'});
  doc.save('IQ_Matrix_Report_'+iq+'.pdf');
}

// ═══════════ RADAR CHART ═══════════
function Radar({scores,size}){
  const cx=size/2,cy=size/2,mr=size/2-40,n=5;
  const gp=(i,r)=>{const a=2*Math.PI*i/n-Math.PI/2;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];};
  const mp=pct=>Array.from({length:n},(_,i)=>gp(i,mr*pct).join(',')).join(' ');
  return h('svg',{viewBox:`0 0 ${size} ${size}`,width:size,height:size},
    [.33,.66,1].map(p=>h('polygon',{key:p,points:mp(p),fill:'none',stroke:'#e2e8f0',strokeWidth:1})),
    Array.from({length:n},(_,i)=>{const[x,y]=gp(i,mr);return h('line',{key:'a'+i,x1:cx,y1:cy,x2:x,y2:y,stroke:'#e2e8f0',strokeWidth:1});}),
    h('polygon',{points:Array.from({length:n},(_,i)=>gp(i,mr*(scores[i]/MAX_SEC)).join(',')).join(' '),fill:'rgba(79,70,229,.12)',stroke:'#4f46e5',strokeWidth:2,strokeLinejoin:'round'}),
    Array.from({length:n},(_,i)=>{const[x,y]=gp(i,mr*(scores[i]/MAX_SEC));return h('circle',{key:'d'+i,cx:x,cy:y,r:4,fill:SECTIONS[i].color,stroke:'#fff',strokeWidth:2});}),
    ['Pattern','Numbers','Verbal','Memory','Logic'].map((l,i)=>{const[x,y]=gp(i,mr+28);return h('text',{key:'l'+i,x,y,textAnchor:'middle',dominantBaseline:'middle',fontSize:10,fill:'#64748b',fontWeight:600,fontFamily:'Inter'},l);})
  );
}

// ═══════════════════════════════════════
//              MAIN COMPONENT
// ═══════════════════════════════════════
function App(){
  const[screen,setScreen]=useState('welcome');
  const[sec,setSec]=useState(0);
  const[qi,setQi]=useState(0);
  const[scores,setScores]=useState([0,0,0,0,0]);
  const[sel,setSel]=useState(-1);
  const[fb,setFb]=useState(false);
  const[t0,setT0]=useState(0);
  const[tTotal,setTTotal]=useState(0);
  const[qTimes,setQTimes]=useState([]);
  const[qStart,setQStart]=useState(0);
  const[correct,setCorrect]=useState(0);
  const[byDiff,setByDiff]=useState({1:{c:0,t:0},2:{c:0,t:0},3:{c:0,t:0},4:{c:0,t:0}});
  const[patQs,setPatQs]=useState([]);
  const[numQs,setNumQs]=useState([]);
  const[vrbQs,setVrbQs]=useState([]);
  const[logQs,setLogQs]=useState([]);
  const[memTrials,setMemTrials]=useState([]);
  const[memPhase,setMemPhase]=useState('idle');
  const[memFI,setMemFI]=useState(-1);
  const[memEnt,setMemEnt]=useState([]);
  const[numInp,setNumInp]=useState('');
  const[copied,setCopied]=useState(false);
  const[showHist,setShowHist]=useState(false);
  const[liveQ,setLiveQ]=useState(0);
  const[liveTotal,setLiveTotal]=useState(0);
  const[pdfBusy,setPdfBusy]=useState(false);
  const mRef=useRef(null);
  const timerRef=useRef(null);

  useEffect(()=>()=>{clearTimeout(mRef.current);clearInterval(timerRef.current);},[]);
  // Live timer — ticks every second during questions
  useEffect(()=>{
    if(screen==='question'){clearInterval(timerRef.current);timerRef.current=setInterval(()=>{setLiveQ(Math.round((Date.now()-qStart)/1000));setLiveTotal(Math.round((Date.now()-t0)/1000));},1000);}
    else{clearInterval(timerRef.current);}
    return()=>clearInterval(timerRef.current);
  },[screen,qStart,t0]);

  const flashSeq=useCallback(digits=>{
    setMemPhase('flash');setMemFI(-1);setMemEnt([]);
    let i=-1;const nx=()=>{i++;if(i>=digits.length){mRef.current=setTimeout(()=>setMemPhase('recall'),600);return;}setMemFI(i);mRef.current=setTimeout(nx,1000);};
    mRef.current=setTimeout(nx,900);
  },[]);

  const init=()=>{
    setPatQs([genPz(1),genPz(1),genPz(2),genPz(2),genPz(3),genPz(3)]);
    setNumQs(pickQ(NS));setVrbQs(pickQ(VB));setLogQs(pickQ(LG));
    setMemTrials(MEM_CFG.map(c=>genMemTrial(c.len)));
    setScores([0,0,0,0,0]);setSec(0);setQi(0);setSel(-1);setFb(false);setNumInp('');
    setCorrect(0);setQTimes([]);setByDiff({1:{c:0,t:0},2:{c:0,t:0},3:{c:0,t:0},4:{c:0,t:0}});
    setT0(Date.now());setQStart(Date.now());setMemPhase('idle');setCopied(false);setShowHist(false);
    setScreen('intro');
  };

  const goHub=()=>{clearTimeout(mRef.current);setScreen('welcome');
    const v=document.getElementById('neuro-link-view'),g=document.getElementById('games-hub-view'),n=document.querySelector('.nav-bar');
    if(v)v.classList.add('hidden');if(g)g.classList.remove('hidden');if(n)n.style.display='';
    document.body.classList.remove('game-active');};

  const recordAnswer=(isCorrect,diff)=>{
    const elapsed=(Date.now()-qStart)/1000;setQTimes(t=>[...t,elapsed]);setQStart(Date.now());
    if(isCorrect){setCorrect(c=>c+1);setScores(s=>{const n=[...s];n[sec]+=DIFF_PTS[diff];return n;});}
    setByDiff(bd=>{const n={...bd};n[diff]={c:n[diff].c+(isCorrect?1:0),t:n[diff].t+1};return n;});
  };

  const advance=()=>{
    if(qi<QPS-1){const nq=qi+1;setQi(nq);setSel(-1);setFb(false);setNumInp('');setQStart(Date.now());
      if(SECTIONS[sec].id==='memory')flashSeq(memTrials[nq]);
    }else setScreen('sectionDone');
  };

  const nextSec=()=>{
    if(sec<4){const ns=sec+1;setSec(ns);setQi(0);setSel(-1);setFb(false);setNumInp('');setQStart(Date.now());setScreen('intro');}
    else{const tt=Math.round((Date.now()-t0)/1000);setTTotal(tt);
      const avgT=qTimes.length>0?qTimes.reduce((a,b)=>a+b,0)/qTimes.length:20;
      const iq=calcIQ(scores.reduce((a,b)=>a+b,0),avgT);const cat=getCat(iq);
      saveResult({date:new Date().toISOString(),iq,cat:cat.label,scores:[...scores],totalTime:tt,avgTime:Math.round(avgT*10)/10,correct,total:TOTAL_Q,byDiff:{...byDiff}});
      setScreen('results');}
  };

  const mc=(chosen,correctIdx,diff)=>{if(fb)return;setSel(chosen);setFb(true);recordAnswer(chosen===correctIdx,diff);setTimeout(advance,1500);};

  // Progress with live timer
  const fmtTime=t=>{const m=Math.floor(t/60),s=t%60;return(m>0?m+':':'')+String(s).padStart(m>0?2:1,'0');};
  const PB=()=>{const done=sec*QPS+qi;return h('div',{style:{marginBottom:16}},
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}},
      h('span',{style:{fontSize:12,color:'#94a3b8',fontWeight:600}},`${done+1} / ${TOTAL_Q}`),
      h('div',{className:'iq-timer'},h('div',{className:'dot'}),h('span',null,fmtTime(liveQ)+'s'),h('span',{style:{color:'#cbd5e1'}},'|'),h('span',null,fmtTime(liveTotal))),
      h('span',{className:'iq-badge',style:{background:SECTIONS[sec].color+'15',color:SECTIONS[sec].color}},SECTIONS[sec].name)),
    h('div',{className:'iq-prog'},h('div',{className:'iq-prog-fill',style:{width:`${(done/TOTAL_Q)*100}%`,background:SECTIONS[sec].color}})));};

  // ═══ WELCOME ═══
  if(screen==='welcome'){
    const hist=getHistory();
    return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{justifyContent:hist.length?'flex-start':'center',animation:'iq-in .5s ease-out'}},
      h('div',{style:{textAlign:'center',marginBottom:24}},
        h('div',{style:{fontSize:'clamp(32px,10vw,44px)',marginBottom:6}},'🧩'),
        h('h1',{style:{fontSize:'clamp(22px,7vw,28px)',fontWeight:800,margin:'0 0 4px'}},'IQ Matrix'),
        h('p',{style:{fontSize:'clamp(10px,3vw,12px)',color:'#94a3b8',letterSpacing:2,textTransform:'uppercase'}},'Cognitive Assessment')),
      h('div',{className:'iq-card',style:{padding:18,marginBottom:16}},
        h('p',{style:{fontSize:13,color:'#475569',lineHeight:1.7}},'Multi-domain cognitive assessment across 5 scientifically validated areas. 30 questions with adaptive difficulty, time-adjusted scoring, and detailed cognitive profiling.')),
      h('div',{style:{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',justifyContent:'center'}},
        SECTIONS.map((s,i)=>h('div',{key:i,style:{padding:'8px 12px',borderRadius:10,background:'#fff',border:'1px solid #e8eaef',textAlign:'center',flex:'1 0 60px',maxWidth:80}},
          h('div',{style:{fontSize:16}},s.icon),h('div',{style:{fontSize:9,color:'#64748b',fontWeight:600}},s.name.split(' ')[0])))),
      h('button',{className:'iq-btn iq-btn-primary',onClick:init,style:{width:'100%',padding:16,fontSize:16,marginBottom:16}},'Begin Assessment'),
      // History
      hist.length>0&&h('div',{style:{marginTop:8}},
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}},
          h('span',{style:{fontSize:13,fontWeight:700,color:'#334155'}},'📋 Test History'),
          h('button',{className:'iq-btn iq-btn-ghost',style:{padding:'6px 14px',fontSize:12},onClick:()=>setShowHist(!showHist)},showHist?'Hide':'Show All')),
        (showHist?hist:hist.slice(0,3)).map((r,i)=>{
          const d=new Date(r.date);const trend=i<hist.length-1?(r.iq>hist[i+1].iq?'↑':'↓'):'';
          return h('div',{key:i,className:'iq-hist'},
            h('div',{style:{fontSize:24,fontWeight:800,color:getCat(r.iq).color,minWidth:48}},r.iq),
            h('div',{style:{flex:1}},
              h('div',{style:{fontSize:13,fontWeight:600,color:'#334155'}},r.cat,' ',trend&&h('span',{style:{color:trend==='↑'?'#059669':'#dc2626'}},trend)),
              h('div',{style:{fontSize:11,color:'#94a3b8'}},d.toLocaleDateString()+' · '+r.correct+'/'+r.total+' · '+Math.floor(r.totalTime/60)+'m')),
            h('div',{style:{fontSize:12,color:'#94a3b8'}},Math.round(r.avgTime)+'s avg'));
        })),
      h('p',{style:{fontSize:10,color:'#94a3b8',textAlign:'center',marginTop:12,lineHeight:1.5}},'⚠️ Entertainment assessment. For clinical evaluation, consult a licensed psychologist.')));
  }

  // ═══ SECTION INTRO ═══
  if(screen==='intro'){
    const s=SECTIONS[sec];
    return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{justifyContent:'center',animation:'iq-in .4s ease-out'}},
      h('div',{style:{textAlign:'center'}},
        h('div',{style:{width:64,height:64,borderRadius:16,margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',background:s.color+'12',border:`1.5px solid ${s.color}25`}},h('span',{style:{fontSize:28}},s.icon)),
        h('div',{style:{fontSize:11,color:'#94a3b8',fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}},`Section ${sec+1} / 5`),
        h('h2',{style:{fontSize:22,fontWeight:700,margin:'0 0 8px',color:s.color}},s.name),
        h('p',{style:{fontSize:13,color:'#64748b',margin:'0 auto 20px',maxWidth:340,lineHeight:1.6}},s.desc),
        h('div',{className:'iq-card',style:{padding:14,marginBottom:20,textAlign:'center'}},
          h('span',{style:{fontSize:12,color:'#64748b'}},
            sec===3?'Numbers flash one at a time. Memorize & enter them back. Some trials require REVERSE order.':
            sec===1?'Type the next number in the logical sequence.':'Select the best answer from the options.')),
        h('div',{style:{display:'flex',gap:6,justifyContent:'center',marginBottom:20}},
          ['Easy','Easy','Med','Med','Hard','Expert'].map((d,i)=>h('div',{key:i,style:{padding:'4px 8px',borderRadius:6,fontSize:10,fontWeight:600,
            background:d==='Easy'?'#ecfdf5':d==='Med'?'#fffbeb':d==='Hard'?'#fef2f2':'#f5f3ff',
            color:d==='Easy'?'#059669':d==='Med'?'#d97706':d==='Hard'?'#dc2626':'#7c3aed'}},d))),
        h('button',{className:'iq-btn iq-btn-primary',onClick:()=>{setScreen('question');setQStart(Date.now());if(sec===3)flashSeq(memTrials[0]);}},`Start Section →`))));
  }

  // ═══ SECTION DONE ═══
  if(screen==='sectionDone'){
    const s=SECTIONS[sec],sc=scores[sec];
    return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{justifyContent:'center',animation:'iq-in .4s ease-out'}},
      h('div',{style:{textAlign:'center'}},
        h('div',{style:{fontSize:40,marginBottom:8,animation:'iq-pop .5s ease-out'}},sc>=12?'🎯':sc>=8?'⭐':sc>=4?'👍':'💪'),
        h('h2',{style:{fontSize:18,fontWeight:700,margin:'0 0 4px'}},s.name+' Complete'),
        h('div',{style:{fontSize:32,fontWeight:800,color:s.color,margin:'10px 0'}},sc+' / '+MAX_SEC),
        h('div',{className:'iq-prog',style:{maxWidth:180,margin:'0 auto 20px',height:6}},
          h('div',{className:'iq-prog-fill',style:{width:`${sc/MAX_SEC*100}%`,background:s.color}})),
        h('button',{className:'iq-btn iq-btn-primary',onClick:nextSec},sec<4?'Next Section →':'View Results'))));
  }

  // ═══ RESULTS ═══
  if(screen==='results'){
    const raw=scores.reduce((a,b)=>a+b,0);
    const avgT=qTimes.length>0?qTimes.reduce((a,b)=>a+b,0)/qTimes.length:20;
    const iq=calcIQ(raw,avgT);const cat=getCat(iq);const pct=iqPct(iq);
    const m=Math.floor(tTotal/60),s=tTotal%60;
    const timeLbl=avgT<12?'⚡ Fast':avgT<20?'⏱️ Steady':avgT<30?'🐢 Careful':'🧘 Methodical';
    // Strengths/weaknesses
    const best=scores.indexOf(Math.max(...scores)),worst=scores.indexOf(Math.min(...scores));

    return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{animation:'iq-in .5s ease-out'}},
      // IQ Score
      h('div',{style:{textAlign:'center',marginBottom:20}},
        h('div',{style:{fontSize:10,color:'#94a3b8',letterSpacing:2,textTransform:'uppercase',marginBottom:6}},'Assessment Complete'),
        h('div',{style:{fontSize:'clamp(48px,14vw,64px)',fontWeight:800,color:cat.color,lineHeight:1,animation:'iq-pop .6s ease-out'}},iq),
        h('div',{style:{fontSize:'clamp(10px,3vw,12px)',color:'#94a3b8',marginTop:4}},'Estimated IQ'),
        h('div',{className:'iq-badge',style:{background:cat.color+'12',color:cat.color,marginTop:10,padding:'5px 14px'}},cat.emoji+' '+cat.label),
        h('div',{style:{fontSize:'clamp(10px,3vw,12px)',color:'#64748b',marginTop:6}},'Top '+Math.max(0.1,100-pct).toFixed(1)+'% of population')),
      // Description
      h('div',{className:'iq-card',style:{padding:16,marginBottom:12}},
        h('p',{style:{fontSize:13,color:'#475569',lineHeight:1.6,textAlign:'center'}},cat.desc)),
      // Radar
      h('div',{className:'iq-card',style:{padding:16,marginBottom:12,display:'flex',justifyContent:'center'}},Radar({scores,size:230})),
      // Domain breakdown
      h('div',{className:'iq-card',style:{padding:16,marginBottom:12}},
        h('div',{style:{fontSize:11,color:'#94a3b8',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:10}},'Domain Breakdown'),
        SECTIONS.map((sec,i)=>h('div',{key:i,style:{display:'flex',alignItems:'center',gap:10,marginBottom:i<4?8:0}},
          h('div',{style:{fontSize:14,width:20}},sec.icon),
          h('div',{style:{flex:1}},
            h('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:3}},
              h('span',{style:{fontSize:12,fontWeight:600,color:'#334155'}},sec.name),
              h('span',{style:{fontSize:12,fontWeight:700,color:sec.color}},scores[i]+'/'+MAX_SEC)),
            h('div',{className:'iq-prog',style:{height:5}},h('div',{className:'iq-prog-fill',style:{width:`${scores[i]/MAX_SEC*100}%`,background:sec.color}})))))),
      // Difficulty analysis
      h('div',{className:'iq-card',style:{padding:16,marginBottom:12}},
        h('div',{style:{fontSize:11,color:'#94a3b8',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginBottom:10}},'Difficulty Analysis'),
        [{l:'Easy',d:1,c:'#059669'},{l:'Medium',d:2,c:'#d97706'},{l:'Hard',d:3,c:'#dc2626'},{l:'Expert',d:4,c:'#7c3aed'}].map(lv=>
          h('div',{key:lv.d,style:{display:'flex',alignItems:'center',gap:10,marginBottom:4}},
            h('div',{style:{width:55,fontSize:11,fontWeight:600,color:lv.c}},lv.l),
            h('div',{style:{flex:1},className:'iq-prog'},h('div',{className:'iq-prog-fill',style:{width:`${byDiff[lv.d].t>0?byDiff[lv.d].c/byDiff[lv.d].t*100:0}%`,background:lv.c}})),
            h('div',{style:{width:40,fontSize:11,color:'#64748b',textAlign:'right'}},byDiff[lv.d].c+'/'+byDiff[lv.d].t)))),
      // Stats + insights
      h('div',{className:'iq-card',style:{padding:16,marginBottom:12}},
        h('div',{style:{display:'flex',justifyContent:'space-around',textAlign:'center',marginBottom:12}},
          [{v:raw+'/'+MAX_TOTAL,l:'Score'},{v:`${m}m ${s}s`,l:'Time'},{v:Math.round(avgT)+'s',l:'Avg/Q'},{v:Math.round(correct/TOTAL_Q*100)+'%',l:'Accuracy'}].map((d,i)=>
            h('div',{key:i},h('div',{style:{fontSize:16,fontWeight:700}},d.v),h('div',{style:{fontSize:10,color:'#94a3b8',marginTop:2}},d.l)))),
        h('div',{style:{borderTop:'1px solid #e8eaef',paddingTop:12,fontSize:12,color:'#475569',lineHeight:1.6}},
          h('div',null,'💪 ',h('strong',null,'Strongest: '),SECTIONS[best].name,' (',scores[best],'/',MAX_SEC,')'),
          h('div',null,'📉 ',h('strong',null,'Weakest: '),SECTIONS[worst].name,' (',scores[worst],'/',MAX_SEC,')'),
          h('div',null,timeLbl,' processing speed (avg ',Math.round(avgT),'s/question)'),
          h('div',{style:{marginTop:4,fontSize:11,color:'#94a3b8'}},'⏱️ Time factor: '+(avgT<18?'+':'')+(avgT<8?5:avgT<12?3:avgT<18?1:avgT<25?0:avgT<35?-2:-5)+' IQ points'))),
      // Share + actions
      h('div',{style:{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}},
        h('button',{className:'iq-btn iq-btn-primary',style:{flex:'1 0 100%',minHeight:52},onClick:()=>{
          setPdfBusy(true);
          loadJsPDF().then(()=>{generatePDF(iq,cat,scores,tTotal,correct,avgT,byDiff);setPdfBusy(false);}).catch(()=>setPdfBusy(false));
        }},pdfBusy?'⏳ Generating...':'📄 Download PDF Report')),
      h('div',{style:{display:'flex',gap:8,marginBottom:12}},
        h('button',{className:'iq-btn iq-btn-ghost',style:{flex:1,minHeight:48},onClick:goHub},'Exit'),
        h('button',{className:'iq-btn iq-btn-primary',style:{flex:1.5,minHeight:48},onClick:init},'↻ Retake'))));
  }

  // ═══ QUESTIONS ═══
  if(screen!=='question')return null;
  const sid=SECTIONS[sec].id;

  // Pattern
  if(sid==='pattern'){
    const pz=patQs[qi];if(!pz)return null;
    const hps=i=>{if(fb)return;setSel(i);setFb(true);const diff=[1,1,2,2,3,4][qi];recordAnswer(i===pz.correctIdx,diff);setTimeout(advance,1500);};
    return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{animation:'iq-in .3s ease-out'}},PB(),
      h('div',{style:{fontSize:13,color:'#64748b',textAlign:'center',marginBottom:12,fontWeight:500}},'Find the missing piece'),
      h('div',{className:'iq-pgrid'},Array.from({length:9}).map((_,i)=>{const r=0|i/3,c=i%3,my=r===2&&c===2;
        return h('div',{key:i,className:`iq-pcell${my&&!fb?' mystery':''}${my&&fb?' rv':''}`},
          my&&!fb?h('span',{style:{fontSize:18,color:'#a5b4fc',fontWeight:800}},'?'):h(CSV,{cell:pz.grid[r][c],size:50}));})),
      h('div',{style:{display:'flex',alignItems:'center',gap:10,margin:'12px 0'}},h('div',{style:{flex:1,height:1,background:'#e8eaef'}}),
        h('span',{style:{fontSize:10,color:'#94a3b8',fontWeight:600,letterSpacing:1}},'SELECT'),h('div',{style:{flex:1,height:1,background:'#e8eaef'}})),
      h('div',{className:'iq-popts',style:{gridTemplateColumns:`repeat(${Math.min(pz.options.length,3)},1fr)`,maxWidth:300,margin:'0 auto'}},
        pz.options.map((o,i)=>{let c='iq-popt';if(fb){c+=i===pz.correctIdx?' ok':i===sel?' no':' dim';}return h('div',{key:i,className:c,onClick:()=>hps(i)},h(CSV,{cell:o,size:40}));}))));
  }

  // Numbers
  if(sid==='numbers'){
    const q=numQs[qi];if(!q)return null;
    const sub=()=>{const v=parseInt(numInp);if(isNaN(v))return;setSel(v);setFb(true);recordAnswer(v===q.a,q.d);setTimeout(advance,1800);};
    return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{animation:'iq-in .3s ease-out'}},PB(),
      h('div',{style:{fontSize:13,color:'#64748b',textAlign:'center',marginBottom:16,fontWeight:500}},'What comes next?'),
      h('div',{className:'iq-card',style:{padding:24,textAlign:'center'}},
        h('div',{style:{fontSize:24,fontWeight:700,letterSpacing:4,marginBottom:14}},q.s.join(', ')+', ',h('span',{style:{color:'#4f46e5'}},'?')),
        !fb&&h('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',gap:10}},
          h('input',{className:'iq-num-input',type:'number',value:numInp,onChange:e=>setNumInp(e.target.value),onKeyDown:e=>{if(e.key==='Enter')sub();},autoFocus:true,placeholder:'?'}),
          h('button',{className:'iq-btn iq-btn-primary',onClick:sub,style:{padding:'12px 20px'}},'→')),
        fb&&h('div',{style:{animation:'iq-pop .3s'}},
          sel===q.a?h('div',{style:{color:'#059669',fontSize:16,fontWeight:700}},'✓ Correct! ',q.a,' (',q.r,')'):
          h('div',null,h('div',{style:{color:'#dc2626',fontSize:16,fontWeight:700}},'✗ Answer: ',q.a),
            h('div',{style:{fontSize:12,color:'#64748b',marginTop:4}},'Rule: ',q.r))))));
  }

  // Verbal / Logic (shared MC)
  if(sid==='verbal'||sid==='logic'){
    const qs=sid==='verbal'?vrbQs:logQs;const q=qs[qi];if(!q)return null;
    const isOdd=q.t==='o';
    return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{animation:'iq-in .3s ease-out'}},PB(),
      h('div',{className:'iq-card',style:{padding:20,marginBottom:14}},
        isOdd&&h('div',{style:{fontSize:11,color:'#7c3aed',fontWeight:600,marginBottom:6,textTransform:'uppercase',letterSpacing:1}},'Odd One Out'),
        h('p',{style:{fontSize:15,fontWeight:600,lineHeight:1.6}},q.q)),
      h('div',{style:{display:'flex',flexDirection:'column',gap:8}},
        q.o.map((o,i)=>{let c='iq-opt';if(fb){c+=i===q.a?' ok':i===sel?' no':' dim';}
          return h('button',{key:i,className:c,onClick:()=>mc(i,q.a,q.d),disabled:fb},h('span',{className:'iq-k'},KEYS[i]),h('span',null,o));}))));
  }

  // Memory
  if(sid==='memory'){
    const tr=memTrials[qi];if(!tr)return null;const cfg=MEM_CFG[qi];const isRev=cfg&&cfg.rev;
    if(memPhase==='flash'){
      return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{justifyContent:'center',alignItems:'center'}},PB(),
        h('div',{style:{textAlign:'center',flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center'}},
          h('div',{style:{fontSize:12,color:'#94a3b8',fontWeight:600,letterSpacing:1,marginBottom:20}},memFI<0?'GET READY':'MEMORIZE'),
          memFI>=0&&memFI<tr.length?h('div',{key:memFI,className:'iq-flash',style:{color:SECTIONS[3].color}},tr[memFI]):
            h('div',{style:{fontSize:36,color:'#cbd5e1'}},'👁️'),
          h('div',{style:{display:'flex',gap:6,marginTop:20}},
            tr.map((_,i)=>h('div',{key:i,style:{width:10,height:10,borderRadius:5,background:i<=memFI?SECTIONS[3].color:'#e2e8f0',transition:'background .2s'}}))))));
    }
    if(memPhase==='recall'){
      const expected=isRev?[...tr].reverse():tr;
      return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{animation:'iq-in .3s ease-out'}},PB(),
        h('div',{style:{fontSize:13,color:'#64748b',textAlign:'center',marginBottom:4,fontWeight:500}},
          isRev?'Enter in REVERSE order':'Enter the sequence in order'),
        isRev&&h('div',{style:{fontSize:11,color:'#dc2626',textAlign:'center',marginBottom:10,fontWeight:600}},'⚠️ BACKWARDS'),
        h('div',{style:{display:'flex',justifyContent:'center',gap:6,marginBottom:20}},
          tr.map((_,i)=>h('div',{key:i,style:{width:38,height:46,borderRadius:10,
            border:`2px solid ${i<memEnt.length?SECTIONS[3].color:'#e2e8f0'}`,background:i<memEnt.length?'#ecfdf5':'#fff',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:SECTIONS[3].color}},
            i<memEnt.length?memEnt[i]:''))),
        h('div',{className:'iq-kpad',style:{marginBottom:8}},
          [1,2,3,4,5,6,7,8,9].map(d=>h('button',{key:d,className:'iq-kbtn',onClick:()=>{
            if(memEnt.length>=tr.length)return;const nx=[...memEnt,d];setMemEnt(nx);
            if(nx.length===tr.length){
              const ok=nx.every((v,i)=>v===expected[i]);recordAnswer(ok,MEM_D[qi]);
              setMemPhase('feedback');setTimeout(()=>{if(qi<QPS-1){const nq=qi+1;setQi(nq);flashSeq(memTrials[nq]);}else setScreen('sectionDone');},1800);
            }}},d))),
        h('div',{style:{display:'flex',justifyContent:'center',gap:8}},
          h('button',{className:'iq-btn iq-btn-ghost',style:{padding:'6px 14px',fontSize:12},onClick:()=>setMemEnt(p=>p.slice(0,-1))},'⌫ Undo'),
          h('button',{className:'iq-btn iq-btn-ghost',style:{padding:'6px 14px',fontSize:12},onClick:()=>setMemEnt([])},'Clear'))));
    }
    if(memPhase==='feedback'){
      const expected=isRev?[...tr].reverse():tr;const ok=memEnt.every((v,i)=>v===expected[i]);
      return h('div',{className:'iq'},h('div',{className:'iq-inner',style:{justifyContent:'center',alignItems:'center'}},PB(),
        h('div',{style:{textAlign:'center',animation:'iq-pop .3s'}},
          h('div',{style:{fontSize:40,marginBottom:6}},ok?'✅':'❌'),
          h('div',{style:{fontSize:16,fontWeight:700,color:ok?'#059669':'#dc2626',marginBottom:4}},ok?'Correct!':'Incorrect'),
          !ok&&h('div',{style:{fontSize:12,color:'#64748b'}},'Correct: ',h('strong',null,expected.join('  '))))));
    }
  }
  return null;
}

// ═══ MOUNT ═══
function _m(){const el=document.getElementById('neuro-link-root');if(el&&window.ReactDOM)ReactDOM.createRoot(el).render(h(App));}
function _n(){const c=document.getElementById('card-neuro-link');if(!c)return;c.addEventListener('click',()=>{
  const hub=document.getElementById('games-hub-view'),nav=document.querySelector('.nav-bar'),view=document.getElementById('neuro-link-view');
  if(hub)hub.classList.add('hidden');if(nav)nav.style.display='none';if(view)view.classList.remove('hidden');document.body.classList.add('game-active');});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{_m();_n();});else{_m();_n();}
})();
