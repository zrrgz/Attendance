const DB=require('better-sqlite3'),db=new DB('attendance.db');
db.prepare('CREATE TABLE IF NOT EXISTS students(id TEXT PRIMARY KEY,name TEXT,password TEXT)').run();
db.prepare('CREATE TABLE IF NOT EXISTS attendance(id INTEGER PRIMARY KEY AUTOINCREMENT,student_id TEXT,date TEXT,subject TEXT,status TEXT,UNIQUE(student_id,date,subject))').run();
try{db.prepare('INSERT INTO students(id,name,password) VALUES(?,?,?)').run('alice','Alice','pass1');db.prepare('INSERT INTO students(id,name,password) VALUES(?,?,?)').run('bob','Bob','pass2')}catch(e){}
db.prepare('CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE)').run();
try{db.prepare('INSERT INTO subjects(name) VALUES(?)').run('Math');db.prepare('INSERT INTO subjects(name) VALUES(?)').run('Physics');db.prepare('INSERT INTO subjects(name) VALUES(?)').run('Chemistry')}catch(e){}

console.log('db init done');
