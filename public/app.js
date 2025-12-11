const $=s=>document.querySelector(s),main=$('#main');
async function post(url,data){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});if(!r.ok){let txt;try{txt=await r.json()}catch(e){txt=await r.text()}throw txt;}return r.json();}
async function get(url){const r=await fetch(url);if(!r.ok){let txt;try{txt=await r.json()}catch(e){txt=await r.text()}throw txt;}return r.json();}

// DASHBOARD
function showDashboard(){
 main.innerHTML=`<div class="container"><div class="card"><h3>Dashboard</h3>
 <div class="form-row"><button class="btn" id="allBtn">Overall</button><button class="btn" id="lmBtn">Last month</button><button class="btn" id="lwBtn">Last week</button>
 <label>From</label><input id="from" class="input" type="date"/><label>To</label><input id="to" class="input" type="date"/><button id="rbtn" class="btn">Show</button></div><div id="stats"></div></div></div>`;
 const setRange=(from,to)=>{if(from)$('#from').value=from;if(to)$('#to').value=to;$('#rbtn').click()};
 $('#allBtn').onclick=()=>{$('#from').value='';$('#to').value='';$('#rbtn').click()};
 $('#lmBtn').onclick=()=>{const t=new Date();const from=new Date(t.getFullYear(),t.getMonth()-1,t.getDate()).toISOString().slice(0,10);setRange(from,new Date().toISOString().slice(0,10))};
 $('#lwBtn').onclick=()=>{const t=new Date();const from=new Date(t.getFullYear(),t.getMonth(),t.getDate()-7).toISOString().slice(0,10);setRange(from,new Date().toISOString().slice(0,10))};
 $('#rbtn').onclick=async()=>{const from=$('#from').value,to=$('#to').value;try{const stats=await get('/api/stats?from='+(from||'0000-00-00')+'&to='+(to||'9999-12-31'));renderStats(stats);}catch(e){alert(JSON.stringify(e))}}}
function renderStats(stats){
 const el=$('#stats');el.innerHTML=`<table class="table"><tr><th>Student</th><th>Attended</th><th>Total</th><th>%</th></tr>${stats.map(s=>`<tr><td><a class="link" data-id="${s.student_id}">${s.student_id}</a></td><td>${s.attended}</td><td>${s.total}</td><td class="percent">${s.percent}%</td></tr>`).join('')}</table>`;
 el.querySelectorAll('.link').forEach(a=>a.onclick=()=>showStudent(a.dataset.id));
}

// STUDENT PAGE + EXPORT
async function showStudent(id){
 const students=await get('/api/students');const user=students.find(x=>x.id===id)||{id};
 main.innerHTML=`<div class="container"><div class="card"><h3>${user.name||id} (${id})</h3><div id="att"></div></div></div>`;
 const rows=await get('/api/attendance/get?student_id='+encodeURIComponent(id)+'&from=0000-00-00&to=9999-12-31');renderStudentAttendance(rows);
 const exp=document.createElement('div');exp.className='form-row';exp.innerHTML=`<button id="expBtn" class="btn">Export CSV</button><input id="efrom" type="date" class="input"/><input id="eto" type="date" class="input"/>`;document.querySelector('.card').appendChild(exp);
 $('#expBtn').onclick=()=>{const f=$('#efrom').value,to=$('#eto').value;const url='/api/export?student_id='+encodeURIComponent(id)+(f?('&from='+f):'')+(to?('&to='+to):'');location.href=url;};
}
function renderStudentAttendance(rows){const el=$('#att');const att=rows.filter(r=>r.status==='attended').length;const total=rows.length;el.innerHTML=`<div class="small">Attended: ${att} / ${total} &nbsp; <span class="percent">${total?Math.round(att/total*10000)/100:0}%</span></div><table class="table"><tr><th>Date</th><th>Subject</th><th>Status</th></tr>${rows.map(r=>`<tr><td>${r.date}</td><td>${r.subject}</td><td>${r.status}</td></tr>`).join('')}</table>`;}

// ENTRY (subjects loaded from server)
function showEntry(){main.innerHTML=`<div class="container"><div class="card"><h3>Attendance Entry</h3><div class="form-row"><input id="sid" class="input" placeholder="student id"/><input id="pwd" class="input" placeholder="password" type="password"/><button id="login" class="btn">Login</button></div><div id="entryArea"></div></div></div>`;$('#login').onclick=async()=>{const id=$('#sid').value,pwd=$('#pwd').value;try{await post('/api/login',{id,password:pwd});renderEntryForm(id);}catch(e){alert('invalid')}}}
async function fetchSubjects(){try{return await get('/api/subjects')}catch(e){return [{id:0,name:'Math'},{id:1,name:'CS'}]}}
async function renderEntryForm(id){
 const today=new Date().toISOString().slice(0,10);
 main.querySelector('#entryArea').innerHTML=`<div class="small">Logged in: ${id}</div><div class="form-row"><label>Date</label><input id="adate" type="date" value="${today}"/></div><div id="subjects"></div><button id="addSub" class="btn">Add Subject</button><button id="done" class="btn">Done</button>`;
 const subjects=await fetchSubjects();addSubRow(subjects);
 $('#addSub').onclick=async()=>{const s=await fetchSubjects();addSubRow(s)};
 $('#done').onclick=async()=>{const date=$('#adate').value,rows=[];document.querySelectorAll('.subject-row').forEach(r=>{rows.push({subject:r.querySelector('select').value,status:r.querySelector('input[type=radio]:checked').value})});try{await post('/api/attendance/save',{student_id:id,date,entries:rows});alert('saved');showStudent(id)}catch(e){alert(JSON.stringify(e))}};
}
function addSubRow(subjects){const sdiv=document.createElement('div');sdiv.className='subject-row';const options=(subjects||[]).map(s=>`<option>${s.name}</option>`).join('');sdiv.innerHTML=`<select class="input">${options}</select><label><input type="radio" name="r${Date.now()}" value="attended" checked/> Attended</label><label><input type="radio" name="r${Date.now()}" value="missed"/> Missed</label><button class="btn rem">Remove</button>`;sdiv.querySelector('.rem').onclick=()=>sdiv.remove();document.getElementById('subjects').appendChild(sdiv)}

// ADMIN UI (loadList declared before showAdmin)
async function loadList(){
 const l=await get('/api/students');document.getElementById('list').innerHTML=`<table class="table"><tr><th>id</th><th>name</th></tr>${l.map(x=>`<tr><td>${x.id}</td><td>${x.name}</td></tr>`).join('')}</table>`;
 const subs=await get('/api/subjects');document.getElementById('subjectsList').innerHTML=`<div><h4>Subjects</h4><div id="srows">${subs.map(s=>`<div class="form-row"><div class="small">${s.name}</div><button class="btn remS" data-id="${s.id}">Remove</button></div>`).join('')}</div><div class="form-row"><input id="newSub" class="input" placeholder="new subject"/><button id="addSubBtn" class="btn">Add subject</button></div></div>`;
 document.querySelectorAll('.remS').forEach(b=>b.onclick=async()=>{if(!window._adminPass){alert('login required');return}await post('/api/subjects/remove',{id:b.dataset.id,admin_pass:window._adminPass});loadList()});
 $('#addSubBtn').onclick=async()=>{if(!window._adminPass){alert('login required');return}await post('/api/subjects/add',{name:$('#newSub').value,admin_pass:window._adminPass});$('#newSub').value='';loadList()};
}

// admin scaffolding
function showAdmin(){
 if(window._adminPass){main.innerHTML=adminUI();bindAdminButtons();loadList();return;}
 main.innerHTML=`<div class="container"><div class="card"><h3>Admin Login</h3><div class="form-row"><input id="adminPass" class="input" placeholder="admin password" type="password"/><button id="alogin" class="btn">Login</button></div><div id="adminMsg" class="small"></div></div></div>`;
 $('#alogin').onclick=async()=>{const pass=$('#adminPass').value;try{await post('/api/admin/login',{admin_pass:pass});window._adminPass=pass;showAdmin()}catch(e){$('#adminMsg').textContent='invalid password'}};
}
function adminUI(){return `<div class="container"><div class="card"><h3>Admin</h3><div class="form-row"><input id="aname" class="input" placeholder="student name"/><input id="aid" class="input" placeholder="id"/><input id="apwd" class="input" placeholder="password"/><button id="add" class="btn">Add</button></div><div class="form-row"><input id="delid" class="input" placeholder="id to remove"/><button id="del" class="btn">Remove</button></div><div id="list"></div><div id="subjectsList"></div><div class="form-row"><button id="alogout" class="btn">Logout</button></div></div></div>`;}
function bindAdminButtons(){
 $('#add').onclick=async()=>{try{await post('/api/admin/add-student',{s:$('#aname').value,id:$('#aid').value,password:$('#apwd').value,admin_pass:window._adminPass});alert('added');loadList()}catch(e){alert(JSON.stringify(e))}};
 $('#del').onclick=async()=>{try{await post('/api/admin/remove-student',{id:$('#delid').value,admin_pass:window._adminPass});alert('removed');loadList()}catch(e){alert(JSON.stringify(e))}};
 $('#alogout').onclick=()=>{window._adminPass=null;showAdmin()};
}

// nav
$('#dashBtn').onclick=showDashboard;$('#entryBtn').onclick=showEntry;$('#adminBtn').onclick=showAdmin;showDashboard();
