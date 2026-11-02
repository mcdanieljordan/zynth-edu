/*!
 * zynth-edu v1.0.1 - shared TEKS library for ZynthWav education apps.
 *
 * Gives any HTML page instant access to every Texas TEKS standard (stored in Supabase),
 * with browser caching so lookups are fast and keep working if the Wi-Fi drops.
 *
 * ADD THIS ONE LINE TO ANY EDUCATION HTML:
 *   <script src="https://mcdanieljordan.github.io/zynth-edu/v1/zynth-edu.js"></script>
 *
 * THEN USE (all functions return Promises):
 *   Teks.forGrade(3, {subject: 'pe'})        -> all 3rd grade PE student expectations
 *   Teks.byCode('116.15.b.1.A')              -> one standard
 *   Teks.lineage('116.15.b.1.A')             -> chain: course > knowledge/skills > strand > standard
 *   Teks.children(id)                        -> items directly under an item
 *   Teks.search('fraction', {grade: 3})      -> text search
 *   Teks.prerequisites('111.5.b.3.C')        -> earlier-grade standards it builds on (draft map)
 *   Teks.scaffold('111.5.b.3.C', {depth: 2}) -> the chain two grades back
 *   Teks.subjects()                          -> list of chapters
 * Each item has: id, code, item_type, text, grade_level, grade_course_title, parent_id, ...
 * Grades: 'PK', 'K', 1-8, or '6A'/'7A'/'8A' for the Middle School Advanced Mathematics courses (plain 6/7/8 = regular grade).
 * Options: lang ('en' or 'es', default 'en'), type (default 'standard' = every real standard; or 'all'; or an item type such as 'Student Expectation'), html (true adds raw html).
 * Subjects: ela, math, science, socialstudies, lote, health, pe, finearts, tech, cte, spanishla (or a chapter number like '116').
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.1';

  var CFG = {
    url: 'https://aiczpuoskwzqtzvoomll.supabase.co',
    key: 'sb_publishable_wMVaIIC55i2IhcR4DKXweg_RZtJdUTY', // public read-only key, safe to share
    lang: 'en',
    ttlDays: 30,
    pageSize: 1000
  };

  var CHAPTERS = {
    ela: '110', math: '111', science: '112', socialstudies: '113', lote: '114', health: '115',
    pe: '116', finearts: '117', other: '120', tech: '126', cte: '127', spanishla: '128'
  };

  var ALIASES = {
    mathematics: 'math', maths: 'math',
    reading: 'ela', languagearts: 'ela', englishlanguagearts: 'ela', englishlanguageartsandreading: 'ela', literacy: 'ela',
    sciences: 'science',
    social: 'socialstudies', history: 'socialstudies',
    physicaleducation: 'pe', physed: 'pe',
    healtheducation: 'health',
    art: 'finearts', music: 'finearts', theatre: 'finearts', dance: 'finearts',
    technology: 'tech', technologyapplications: 'tech', computers: 'tech',
    languagesotherthanenglish: 'lote', worldlanguages: 'lote',
    spanishlanguagearts: 'spanishla', spanish: 'spanishla',
    career: 'cte', careertechnicaleducation: 'cte'
  };

  var BASE_COLS = 'id,code,item_type,is_standard,statement_text,grade_level,grade_course_code,grade_course_title,parent_id,document_id,depth,list_order,language';
  var PREFIX = 'zynthedu:v1:';
  var mem = {};

  // ---------- helpers ----------
  function enc(v) { return encodeURIComponent(String(v)); }

  function cols(o) { return BASE_COLS + (o && o.html ? ',statement_html' : ''); }

  function normGrade(g) {
    var s = String(g).trim().toLowerCase();
    if (/^pre/.test(s)) return 'PK';
    if (/^k/.test(s)) return 'K';
    var m = s.match(/\d+/);
    if (!m) return s.toUpperCase();
    var n = String(parseInt(m[0], 10));
    return /adv|\d\s*a\s*$/.test(s) ? n + 'A' : n; // '7A' = Grade 7 Middle School Advanced Mathematics
  }

  function prefixFor(subject) {
    if (subject === undefined || subject === null || subject === '') return null;
    var s = String(subject);
    if (/^\d{3}$/.test(s)) return s;
    var n = s.toLowerCase().replace(/[^a-z]/g, '');
    var key = ALIASES[n] || n;
    if (CHAPTERS[key]) return CHAPTERS[key];
    throw new Error('Unknown subject "' + subject + '". Try one of: ' + Object.keys(CHAPTERS).join(', '));
  }

  function shape(rows) {
    for (var i = 0; i < rows.length; i++) {
      rows[i].text = rows[i].statement_text;
      if (rows[i].statement_html !== undefined) rows[i].html = rows[i].statement_html;
    }
    return rows;
  }

  // ---------- network + cache ----------
  function readCache(u) {
    try { var s = global.localStorage.getItem(PREFIX + u); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function writeCache(u, d) {
    try { global.localStorage.setItem(PREFIX + u, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { /* storage full or blocked: skip */ }
  }

  function request(path) {
    var u = CFG.url + '/rest/v1/' + path;
    if (mem[u]) return Promise.resolve(mem[u]);
    var c = readCache(u);
    if (c && (Date.now() - c.t) < CFG.ttlDays * 864e5) { mem[u] = c.d; return Promise.resolve(c.d); }
    return global.fetch(u, { headers: { apikey: CFG.key, Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('TEKS lookup failed (HTTP ' + r.status + ')');
        return r.json();
      })
      .then(function (d) { mem[u] = d; writeCache(u, d); return d; })
      .catch(function (e) {
        if (c) { mem[u] = c.d; return c.d; } // offline or error: use the older saved copy
        throw e;
      });
  }

  function fetchAll(params) {
    var out = [];
    function page(offset) {
      var path = 'teks_items?' + params.concat(['limit=' + CFG.pageSize, 'offset=' + offset]).join('&');
      return request(path).then(function (rows) {
        out = out.concat(rows);
        return rows.length === CFG.pageSize ? page(offset + CFG.pageSize) : out;
      });
    }
    return page(0);
  }

  function baseParams(o) {
    o = o || {};
    var p = ['select=' + cols(o), 'language=eq.' + enc(o.lang || CFG.lang)];
    if (o.grade !== undefined && o.grade !== null) p.push('grade_level=eq.' + enc(normGrade(o.grade)));
    if (o.type === undefined || o.type === 'standard') p.push('is_standard=eq.true'); // every real standard
    else if (o.type && o.type !== 'all') p.push('item_type=eq.' + enc(o.type));
    if (o.prefix) p.push('code=like.' + enc(o.prefix) + '.*');
    return p;
  }

  var ORDER = 'order=list_order.asc.nullslast,id.asc';

  // ---------- public API ----------
  var Teks = {
    version: VERSION,
    chapters: CHAPTERS,

    configure: function (o) {
      o = o || {};
      for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k) && k in CFG) CFG[k] = o[k]; }
      return Teks;
    },

    forGrade: function (grade, o) {
      o = o || {};
      return Promise.resolve().then(function () {
        var p = baseParams({ grade: grade, type: o.type, lang: o.lang, html: o.html, prefix: prefixFor(o.subject) });
        return fetchAll(p.concat([ORDER])).then(shape);
      });
    },

    byCode: function (code, o) {
      o = o || {};
      var p = ['select=' + cols(o), 'language=eq.' + enc(o.lang || CFG.lang), 'code=eq.' + enc(code), 'limit=5'];
      return request('teks_items?' + p.join('&')).then(function (rows) { return shape(rows)[0] || null; });
    },

    lineage: function (code, o) {
      o = o || {};
      function up(item, chain) {
        chain.unshift(item);
        if (!item.parent_id) return chain;
        var p = ['select=' + cols(o), 'id=eq.' + enc(item.parent_id), 'limit=1'];
        return request('teks_items?' + p.join('&')).then(function (rows) {
          return rows[0] ? up(shape(rows)[0], chain) : chain;
        });
      }
      return Teks.byCode(code, o).then(function (item) { return item ? up(item, []) : []; });
    },

    children: function (id, o) {
      o = o || {};
      var p = ['select=' + cols(o), 'parent_id=eq.' + enc(id), ORDER];
      return request('teks_items?' + p.join('&')).then(shape);
    },

    search: function (text, o) {
      o = o || {};
      var clean = String(text || '').replace(/[*,()]/g, ' ').trim();
      if (!clean) return Promise.resolve([]);
      return Promise.resolve().then(function () {
        var p = baseParams({ grade: o.grade, type: o.type, lang: o.lang, html: o.html, prefix: prefixFor(o.subject) });
        p.push('statement_text=ilike.*' + enc(clean) + '*');
        p.push(ORDER);
        p.push('limit=' + (o.limit || 25));
        return request('teks_items?' + p.join('&')).then(shape);
      });
    },

    // What this standard builds on (usually earlier grades). minStrength: 'weak' | 'medium' (default) | 'strong'.
    prerequisites: function (code, o) {
      o = o || {};
      var rank = { weak: 0, medium: 1, strong: 2 };
      var min = rank[o.minStrength || 'medium'];
      return Teks.byCode(code, o).then(function (item) {
        if (!item) return [];
        var p = ['select=strength,score,level,reviewed,prereq:teks_items!prereq_id(' + cols(o) + ')',
                 'item_id=eq.' + enc(item.id), 'level=eq.' + enc(o.level || 'standard')];
        return request('teks_prerequisites?' + p.join('&')).then(function (rows) {
          return rows.filter(function (r) { return r.prereq && rank[r.strength] >= min; })
            .sort(function (a, b) { return (b.score || 0) - (a.score || 0); })
            .map(function (r) {
              var x = shape([r.prereq])[0];
              x.strength = r.strength; x.score = r.score; x.reviewed = r.reviewed;
              return x;
            });
        });
      });
    },

    // Walk down the prerequisite chain: [{depth:1, items:[...]}, {depth:2, items:[...]}]. Options: depth (default 2), minStrength.
    scaffold: function (code, o) {
      o = o || {};
      var maxDepth = o.depth || 2, seen = {};
      function step(codes, d) {
        if (d > maxDepth || !codes.length) return Promise.resolve([]);
        return Promise.all(codes.map(function (c) { return Teks.prerequisites(c, o); })).then(function (lists) {
          var level = [], next = [];
          lists.forEach(function (l) {
            l.forEach(function (it) { if (!seen[it.id]) { seen[it.id] = 1; level.push(it); next.push(it.code); } });
          });
          return step(next, d + 1).then(function (rest) { return [{ depth: d, items: level }].concat(rest); });
        });
      }
      return step([code], 1).then(function (levels) { return levels.filter(function (l) { return l.items.length; }); });
    },

    subjects: function (o) {
      o = o || {};
      return request('teks_documents?select=id,title,subject,language,item_count&language=eq.' + enc(o.lang || CFG.lang) + '&order=title.asc');
    },

    clearCache: function () {
      mem = {};
      try {
        var ls = global.localStorage, dead = [], i;
        for (i = 0; i < ls.length; i++) { if (ls.key(i).indexOf(PREFIX) === 0) dead.push(ls.key(i)); }
        for (i = 0; i < dead.length; i++) ls.removeItem(dead[i]);
      } catch (e) { /* ignore */ }
    }
  };

  global.ZynthEdu = global.ZynthEdu || {};
  global.ZynthEdu.version = VERSION;
  global.ZynthEdu.Teks = Teks;
  global.Teks = Teks;
})(typeof window !== 'undefined' ? window : this);
