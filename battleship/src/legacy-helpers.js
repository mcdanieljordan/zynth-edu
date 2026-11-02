const GRADES=['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];
const GSHORT=['K','Gr 1','Gr 2','Gr 3','Gr 4','Gr 5','Gr 6','Gr 7','Gr 8','Gr 9','Gr 10'];
const dec=r=>({q:r[0],a:r[1],w:r[2].split('|'),exp:r[3]});
const build=it=>{const opts=shuffle([it.a,...it.w]);return{q:it.q,opts,ans:opts.indexOf(it.a),exp:it.exp};};
const IDEAS=['10 jumping jacks','Balance on one foot for 10 seconds','5 squats','Hop on one foot 8 times','High knees: 5 on each leg','Freeze like a statue for 5 seconds','Tiptoe to the board and back','Wall sit for 10 seconds','Clap a 4-beat rhythm and have your squad copy it','8 mountain climbers','Bear crawl 5 steps','Stand like a flamingo and count to 10'];
