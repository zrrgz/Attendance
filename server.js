const express=require('express'),path=require('path'),bp=require('body-parser'),DB=require('better-sqlite3');
const db=new DB('attendance.db'),app=express();
app.use(bp.json());app.use(express.static(path.join(__dirname,'public')));

// init tables
db.prepare('CREATE TABLE IF NOT EXISTS students(id TEXT PRIMARY KEY,name TEXT,password TEXT)').run();
db.prepare('CREATE TABLE IF NOT EXISTS attendance(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id TEXT,date TEXT,subject TEXT,status TEXT,UNIQUE(student_id,date,subject))').run();
db.prepare('CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE)').run();
try{db.prepare('INSERT INTO subjects(name) VALUES(?)').run('Math');db.prepare('INSERT INTO subjects(name) VALUES(?)').run('Physics');}catch(e){}

// admin config
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
function requireAdmin(req,res,next){
  const pass = req.body?.admin_pass || req.query?.admin_pass || req.get('x-admin-pass');
  if(pass !== ADMIN_PASS) return res.status(401).json({err:'admin auth required'});
  next();
}
app.post('/api/admin/login',(req,res)=>{const{admin_pass}=req.body; if(admin_pass===ADMIN_PASS) return res.json({ok:true}); return res.status(401).json({err:'invalid'});});

// list students (id + name)
app.get('/api/students',(req,res)=>{try{const rows=db.prepare('SELECT id,name FROM students ORDER BY name').all();res.json(rows);}catch(e){res.status(500).json({err:e.message})}});

// public subjects
app.get('/api/subjects',(req,res)=>{const rows=db.prepare('SELECT id,name FROM subjects ORDER BY name').all();res.json(rows)});

// admin: add/remove students (protected)
app.post('/api/admin/add-student',requireAdmin,(req,res)=>{const{s,id,password}=req.body;if(!s||!id||!password)return res.status(400).json({err:'missing'});try{db.prepare('INSERT INTO students(id,name,password) VALUES(?,?,?)').run(id,s,password);res.json({ok:true})}catch(e){res.status(400).json({err:e.message})}});
app.post('/api/admin/remove-student',requireAdmin,(req,res)=>{const{id}=req.body;if(!id)return res.status(400).json({err:'missing'});db.prepare('DELETE FROM attendance WHERE student_id=?').run(id);db.prepare('DELETE FROM students WHERE id=?').run(id);res.json({ok:true})});

// subjects admin (protected)
app.post('/api/subjects/add',requireAdmin,(req,res)=>{const{name}=req.body;if(!name)return res.status(400).json({err:'missing'});try{db.prepare('INSERT INTO subjects(name) VALUES(?)').run(name);res.json({ok:true})}catch(e){res.status(400).json({err:e.message})}});
app.post('/api/subjects/remove',requireAdmin,(req,res)=>{const{id}=req.body;if(!id)return res.status(400).json({err:'missing'});db.prepare('DELETE FROM subjects WHERE id=?').run(id);res.json({ok:true})});

// login (student)
app.post('/api/login',(req,res)=>{const{id,password}=req.body;const u=db.prepare('SELECT id,name FROM students WHERE id=? AND password=?').get(id,password);if(u)res.json({ok:true,user:u});else res.status(401).json({err:'invalid'})});

// Save attendance (replace day's entries)
app.post('/api/attendance/save',(req,res)=>{const{student_id,date,entries}=req.body;if(!student_id||!date||!Array.isArray(entries))return res.status(400).json({err:'missing'});const del=db.prepare('DELETE FROM attendance WHERE student_id=? AND date=?');del.run(student_id,date);const ins=db.prepare('INSERT OR REPLACE INTO attendance(student_id,date,subject,status) VALUES(?,?,?,?)');const tx=db.transaction(rows=>{for(const r of rows)ins.run(student_id,date,r.subject,r.status)});try{tx(entries);res.json({ok:true})}catch(e){res.status(500).json({err:e.message})}});

// Get attendance with optional filters
app.get('/api/attendance/get',(req,res)=>{const{student_id,from,to}=req.query;let q='SELECT student_id,date,subject,status FROM attendance WHERE 1=1';const p=[];if(student_id){q+=' AND student_id=?';p.push(student_id)}if(from){q+=' AND date>=?';p.push(from)}if(to){q+=' AND date<=?';p.push(to)}q+=' ORDER BY date DESC';res.json(db.prepare(q).all(...p))});

// Stats simple calc
app.get('/api/stats',(req,res)=>{const{from,to}=req.query;const f=from||'0000-00-00',t=to||'9999-12-31';const rows=db.prepare('SELECT student_id,date,subject,status FROM attendance WHERE date>=? AND date<=?').all(f,t);const m={};for(const r of rows){m[r.student_id]=m[r.student_id]||{att:0,total:0};m[r.student_id].total++;if(r.status==='attended')m[r.student_id].att++}const out=Object.keys(m).map(k=>({student_id:k,attended:m[k].att,total:m[k].total,percent: m[k].total?Math.round(m[k].att/m[k].total*10000)/100:0}));res.json(out)});

// CSV export
app.get('/api/export',(req,res)=>{const{student_id,from,to}=req.query;if(!student_id)return res.status(400).send('missing student_id');const f=from||'0000-00-00',t=to||'9999-12-31';const rows=db.prepare('SELECT date,subject,status FROM attendance WHERE student_id=? AND date>=? AND date<=? ORDER BY date').all(student_id,f,t);let csv='date,subject,status\\n';for(const r of rows)csv+=`${r.date},${r.subject},${r.status}\\n`;res.setHeader('Content-Type','text/csv');res.setHeader('Content-Disposition',`attachment; filename="${student_id}_attendance.csv"`);res.send(csv)});

const PORT=3000;app.listen(PORT,()=>console.log('listening',PORT));
