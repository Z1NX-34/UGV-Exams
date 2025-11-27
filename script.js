/* ============================
   Simple OES (single-file)
   - localStorage DB under key OES_DB_V2
   - roles: admin / teacher / student
   - teacher can create subjects & exams (MCQ)
   - student can take exam; auto-grading stored in results
   - only teacher & admin see results
   ============================ */

const DB_KEY = 'OES_DB_V2';

// ---------- seed data ----------
function seedDB(){
  const teacherId = uid('u');
  const adminId = uid('u');
  const studentId = uid('u');
  const sampleSubjectId = uid('sub');

  const users = [
    {id:adminId, name:'System Admin', email:'admin@ugv', pass:'admin123', role:'admin'},
    {id:teacherId, name:'Demo Teacher', email:'teacher@ugv', pass:'teach123', role:'teacher'},
    {id:studentId, name:'Demo Student', email:'student@ugv', pass:'stud123', role:'student'}
  ];

  const exams = [
    {
      id: uid('exam'), 
      subjectId: sampleSubjectId, 
      title:'General Knowledge', 
      description:'Short general knowledge quiz', 
      durationMin:5,
      passingScore: 60,
      maxAttempts: 3,
      randomizeQuestions: false,
      randomizeChoices: false,
      showFeedback: true,
      startDate: null,
      endDate: null,
      createdBy: teacherId, 
      questions:[
        { id: uid('q'), text:'What is the capital of Bangladesh?', choices:['Chittagong','Khulna','Dhaka','Barishal'], answerIndex:2, marks:1 },
        { id: uid('q'), text:'HTML stands for?', choices:['Hyper Trainer Marking Language','Hyper Text Markup Language','High Text Markup Language','None'], answerIndex:1, marks:1 }
      ]
    }
  ];

  const subjects = [
    { id: sampleSubjectId, title:'General', createdBy: teacherId, createdAt: now() }
  ];

  const results = []; // empty initially

  return { users, subjects, exams, results };
}

function loadDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(!raw){ const db = seedDB(); localStorage.setItem(DB_KEY, JSON.stringify(db)); return db; }
  try{ return JSON.parse(raw); }catch(e){ const db=seedDB(); localStorage.setItem(DB_KEY, JSON.stringify(db)); return db; }
}
function saveDB(){ localStorage.setItem(DB_KEY, JSON.stringify(DB)); }

let DB = loadDB();
let currentUser = null;
let currentView = 'login'; // keep track for styling etc

// ---------- small helpers ----------
function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function now(){ return new Date().toISOString(); }
function el(html){ const t=document.createElement('div'); t.innerHTML=html.trim(); return t.firstChild; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,(m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ---------- ADVANCED FEATURES ----------
// Shuffle array helper
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Check if exam is available based on schedule
function isExamAvailable(exam) {
  if (!exam.startDate && !exam.endDate) return true;
  const now = new Date();
  if (exam.startDate && new Date(exam.startDate) > now) return false;
  if (exam.endDate && new Date(exam.endDate) < now) return false;
  return true;
}

// Get attempt count for user
function getAttemptCount(userId, examId) {
  return DB.results.filter(r => r.userId === userId && r.examId === examId).length;
}

// Calculate exam statistics
function calculateExamStats(examId) {
  const results = DB.results.filter(r => r.examId === examId);
  if (results.length === 0) return null;
  
  const scores = results.map(r => (r.score / r.total) * 100);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const passed = results.filter(r => (r.score / r.total) * 100 >= (getExam(examId).passingScore || 0)).length;
  
  return {
    totalAttempts: results.length,
    averageScore: avg.toFixed(1),
    highestScore: max.toFixed(1),
    lowestScore: min.toFixed(1),
    passRate: ((passed / results.length) * 100).toFixed(1),
    uniqueStudents: new Set(results.map(r => r.userId)).size
  };
}

// Export results to CSV
function exportResultsToCSV(examId) {
  const exam = getExam(examId);
  const results = DB.results.filter(r => r.examId === examId);
  
  if (results.length === 0) {
    showToast('No results to export', 'warning');
    return;
  }
  
  let csv = 'Student Name,Email,Score,Total,Percentage,Correct Answers,Total Questions,Status,Submitted At\n';
  
  results.forEach(r => {
    const user = DB.users.find(u => u.id === r.userId);
    const percentage = ((r.score / r.total) * 100).toFixed(2);
    const status = percentage >= (exam.passingScore || 0) ? 'Passed' : 'Failed';
    csv += `"${user?.name || 'Unknown'}","${user?.email || 'N/A'}",${r.score},${r.total},${percentage}%,${r.correct},${r.totalQ},${status},"${new Date(r.submittedAt).toLocaleString()}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${exam.title.replace(/\s+/g, '_')}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Results exported successfully', 'success');
}

// ---------- TOAST NOTIFICATIONS ----------
function showToast(msg, type='info'){
  let box = document.getElementById('toast-container');
  if(!box){
    box = document.createElement('div');
    box.id = 'toast-container';
    box.style.cssText = 'position:fixed;bottom:20px;right:20px;display:flex;flex-direction:column;gap:10px;z-index:9999';
    document.body.appendChild(box);
  }
  const toast = document.createElement('div');
  const colors = { info:'#3b82f6', success:'#22c55e', error:'#ef4444', warning:'#f59e0b' };
  toast.style.cssText = `background:#fff;color:#1e293b;padding:12px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-left:4px solid ${colors[type]||colors.info};font-size:14px;min-width:250px;animation:slideIn 0.3s ease-out`;
  toast.innerHTML = `<strong>${type.toUpperCase()}</strong><div style="margin-top:4px">${escapeHtml(msg)}</div>`;
  box.appendChild(toast);
  setTimeout(()=>{
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-in';
    setTimeout(()=>toast.remove(), 300);
  }, 3000);
}
// Add keyframes for toast
const styleSheet = document.createElement("style");
styleSheet.innerText = `@keyframes slideIn { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }`;
document.head.appendChild(styleSheet);


// ---------- UI rendering ----------
const main = document.getElementById('main');
const sidebar = document.getElementById('sidebarContent');
const userBox = document.getElementById('userBox');

function renderUserBox(activeTab = ''){
  if(!currentUser){
    userBox.innerHTML = `<div class="info"><strong>Not logged in</strong><div class="role">Guest</div></div>`;
    sidebar.innerHTML = renderLoginForm();
    renderMainLogin();
    return;
  }
  userBox.innerHTML = `
    <div class="info"><strong>${escapeHtml(currentUser.name)}</strong><div class="role">${currentUser.role}</div></div>
    <button class="small btn-ghost" onclick="logout()"><i class="fas fa-sign-out-alt"></i></button>
  `;
  
  // Helper to check active state
  const isActive = (name) => activeTab === name ? 'active' : '';

  // sidebar menu by role
  if(currentUser.role === 'student'){
    sidebar.innerHTML = `
      <div class="list">
        <div class="item ${isActive('subjects')}"><button onclick="showSubjects()"><i class="fas fa-book"></i> Available Subjects</button></div>
        <div class="item ${isActive('attempts')}"><button onclick="showStudentAttempts()"><i class="fas fa-history"></i> My Attempts</button></div>
      </div>
    `;
  } else if(currentUser.role === 'teacher'){
    sidebar.innerHTML = `
      <div class="list">
        <div class="item ${isActive('subjects')}"><button onclick="showTeacherSubjects()"><i class="fas fa-chalkboard-teacher"></i> Manage Subjects</button></div>
        <div class="item ${isActive('create_exam')}"><button onclick="showCreateExam()"><i class="fas fa-plus-circle"></i> Create Exam</button></div>
        <div class="item ${isActive('results')}"><button onclick="showAllResults()"><i class="fas fa-poll"></i> View Results</button></div>
      </div>
    `;
  } else { // admin
    sidebar.innerHTML = `
      <div class="list">
        <div class="item ${isActive('users')}"><button onclick="showUsers()"><i class="fas fa-users"></i> Manage Users</button></div>
        <div class="item ${isActive('subjects')}"><button onclick="showSubjectsAdmin()"><i class="fas fa-layer-group"></i> Subjects & Exams</button></div>
        <div class="item ${isActive('results')}"><button onclick="showAllResults()"><i class="fas fa-chart-bar"></i> All Results</button></div>
      </div>
    `;
  }
}

// ---------- BREADCRUMBS ----------
function renderBreadcrumb(items){
  return `
    <div class="breadcrumb">
      <span onclick="goDashboard()">Dashboard</span>
      ${items.map(i => `<span class="sep">/</span> <span class="${i.action?'':'curr'}" ${i.action?`onclick="${i.action}"`:''}>${escapeHtml(i.label)}</span>`).join('')}
    </div>
  `;
}
function goDashboard(){
  if(currentUser.role==='student') renderMainStudent();
  else if(currentUser.role==='teacher') renderMainTeacher();
  else renderMainAdmin();
}

// ---------- LOGIN ----------
function renderLoginForm(){
  return `
    <div class="card">
      <h2>Login</h2>
      <div style="margin-top:16px">
        <label>Email</label>
        <input id="inEmail" placeholder="admin@ugv" />
        <label>Password</label>
        <input id="inPass" type="password" placeholder="••••••" />
        <label>Role</label>
        <select id="inRole"><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select>
        <div style="margin-top:20px;display:flex;gap:12px;flex-direction:column">
          <button onclick="doLogin()" style="width:100%">Login</button>
          <button class="btn-ghost" onclick="renderRegister()" style="width:100%">Create Account</button>
        </div>
        <div class="muted center" style="margin-top:16px;font-size:12px">Demo: admin@ugv/admin123, teacher@ugv/teach123, student@ugv/stud123</div>
      </div>
    </div>
  `;
}

function renderMainLogin(){
  main.innerHTML = `
    <div class="landing-hero fade-in">
      <div style="margin-bottom:20px">
        <i class="fas fa-atom fa-spin" style="font-size:64px;color:var(--primary);filter:drop-shadow(0 0 20px var(--primary))"></i>
      </div>
      <h1>Master Your Exams</h1>
      <p class="subtitle">The most advanced, secure, and intuitive online examination platform for students and educators.</p>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-shield-alt"></i></div>
          <h3>Secure & Reliable</h3>
          <p>Enterprise-grade security ensuring fair and cheat-proof examinations for everyone.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-bolt"></i></div>
          <h3>Real-time Results</h3>
          <p>Instant grading and detailed analytics to track performance and progress effectively.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon"><i class="fas fa-mobile-alt"></i></div>
          <h3>Anywhere Access</h3>
          <p>Take exams from any device, anywhere in the world with our responsive design.</p>
        </div>
      </div>

      <div class="about-section">
        <div class="about-content" style="text-align:left">
          <h2 style="font-size:32px;margin-bottom:20px">About UGV Exams</h2>
          <p style="font-size:16px;color:var(--text-secondary);margin-bottom:24px">
            UGV Exams is a next-generation assessment platform designed to streamline the evaluation process. 
            Whether you are an educator looking to create complex quizzes or a student aiming to test your knowledge, 
            our platform provides the tools you need.
          </p>
        </div>
        <div class="about-visual">
          <div class="brain-container">
            <i class="fas fa-brain brain-icon"></i>
            <div class="brain-energy"></div>
            <div class="brain-energy"></div>
            <div class="brain-energy"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function doLogin(){
  const email = document.getElementById('inEmail').value.trim();
  const pass = document.getElementById('inPass').value;
  const role = document.getElementById('inRole').value;
  const user = DB.users.find(u => u.email.toLowerCase()===email.toLowerCase() && u.pass===pass && u.role===role);
  if(!user){ showToast('Invalid credentials or role', 'error'); return; }
  currentUser = user;
  currentView = 'dashboard';
  renderUserBox();
  goDashboard(); // Redirect to role-specific dashboard
  showToast('Welcome back, ' + user.name, 'success');
}

// registration (quick)
function renderRegister(){
  main.innerHTML = `
    <h2>Create Account</h2>
    <div style="max-width:500px">
      <label>Full Name</label><input id="regName" placeholder="John Doe" />
      <label>Email</label><input id="regEmail" placeholder="john@example.com" />
      <label>Password</label><input id="regPass" type="password" />
      <label>Role</label>
      <select id="regRole"><option value="student">Student</option><option value="teacher">Teacher</option></select>
      <div style="margin-top:24px;display:flex;gap:12px">
        <button onclick="doRegister()">Sign Up</button> 
        <button class="btn-ghost" onclick="renderMainLogin()">Cancel</button>
      </div>
    </div>
  `;
}
function doRegister(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const role = document.getElementById('regRole').value;
  if(!name||!email||!pass){ showToast('All fields required', 'error'); return; }
  if(DB.users.some(u=>u.email.toLowerCase()===email.toLowerCase())){ showToast('Email already exists', 'error'); return; }
  const user = { id: uid('u'), name, email, pass, role };
  DB.users.push(user); saveDB();
  showToast('Account created! Please login.', 'success');
  sidebar.innerHTML = renderLoginForm();
  renderMainLogin();
}

function logout(){
  currentUser = null;
  currentView = 'login';
  renderUserBox();
  showToast('Logged out successfully');
}

// ---------- STUDENT VIEWS ----------
function renderMainStudent(){
  renderUserBox('subjects');
  main.innerHTML = `
    <h2>Student Dashboard</h2>
    <p class="muted">Select a subject to view available exams.</p>
    <div class="list" id="studentHomeList" style="margin-top:20px"></div>
  `;
  // show subjects
  const box = document.getElementById('studentHomeList');
  if(DB.subjects.length===0){ box.innerHTML = `<div class="muted">No subjects available yet.</div>`; return; }
  box.innerHTML = DB.subjects.map(s=>`
    <div class="item">
      <div>
        <strong>${escapeHtml(s.title)}</strong>
        <div class="muted">Instructor: ${getUserName(s.createdBy)}</div>
      </div>
      <div><button onclick="showSubjectExams('${s.id}')">View Exams <i class="fas fa-arrow-right"></i></button></div>
    </div>
  `).join('');
}

function showSubjects(){ renderMainStudent(); }

function showSubjectExams(subjectId){
  renderUserBox('subjects');
  const subject = DB.subjects.find(s=>s.id===subjectId);
  const exs = DB.exams.filter(e=>e.subjectId===subjectId);
  main.innerHTML = `
    ${renderBreadcrumb([{label:subject.title}])}
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <h2>${escapeHtml(subject.title)}</h2>
    </div>
    <p class="muted">${escapeHtml(subject.description || 'No description provided.')}</p>
    <div id="exList" class="list" style="margin-top:20px"></div>
  `;
  
  const examCards = exs.map(e=>{
    const available = isExamAvailable(e);
    const attempts = getAttemptCount(currentUser.id, e.id);
    // Default maxAttempts to 0 (unlimited) if undefined
    const maxAttempts = (e.maxAttempts === undefined || e.maxAttempts === null) ? 0 : e.maxAttempts;
    const canTake = available && (maxAttempts === 0 || attempts < maxAttempts);
    
    let statusBadge = '';
    if (!available) {
      if (e.startDate && new Date(e.startDate) > new Date()) {
        statusBadge = `<span class="badge badge-warning">Starts ${new Date(e.startDate).toLocaleString()}</span>`;
      } else {
        statusBadge = `<span class="badge badge-danger">Ended</span>`;
      }
    } else if (maxAttempts > 0) {
      statusBadge = `<span class="badge badge-info">Attempts: ${attempts}/${maxAttempts}</span>`;
    }
    
    return `
    <div class="item">
      <div>
        <strong>${escapeHtml(e.title)}</strong>
        <div class="muted"><i class="far fa-clock"></i> ${e.durationMin} mins &bull; ${e.questions.length} Questions &bull; Pass: ${e.passingScore || 60}%</div>
        <div class="muted">${escapeHtml(e.description)}</div>
        ${statusBadge ? `<div style="margin-top:8px">${statusBadge}</div>` : ''}
      </div>
      <div>
        ${canTake ? `<button onclick="startExam('${e.id}')"><i class="fas fa-play"></i> Start Exam</button>` : `<button disabled style="opacity:0.5;cursor:not-allowed">Unavailable</button>`}
      </div>
    </div>
  `;
  }).join('');
  
  document.getElementById('exList').innerHTML = exs.length ? examCards : `<div class="muted">No exams available for this subject.</div>`;
}

function showStudentAttempts(){
  renderUserBox('attempts');
  const myAttempts = DB.results.filter(r=>r.userId===currentUser.id);
  main.innerHTML = `
    <h2>My Attempts</h2>
    ${myAttempts.length ? `<div class="card" style="padding:0;overflow:hidden"><table><thead><tr><th>Exam</th><th>Score</th><th>Date</th></tr></thead><tbody>
      ${myAttempts.map(r=>`<tr><td>${escapeHtml(getExamTitle(r.examId))}</td><td><span style="font-weight:600;color:var(--primary)">${r.score}/${r.total}</span></td><td>${new Date(r.submittedAt).toLocaleDateString()}</td></tr>`).join('')}
    </tbody></table></div>` : `<div class="muted">You haven't taken any exams yet.</div>`}
  `;
}

// ---------- TEACHER VIEWS ----------
function renderMainTeacher(){
  renderUserBox('');
  main.innerHTML = `
    <h2>Teacher Dashboard</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));margin-top:20px">
      <div class="card center" onclick="showCreateSubject()" style="cursor:pointer;border:2px dashed var(--border)">
        <i class="fas fa-book-open" style="font-size:32px;color:var(--primary);margin-bottom:12px"></i>
        <div>Create Subject</div>
      </div>
      <div class="card center" onclick="showCreateExam()" style="cursor:pointer;border:2px dashed var(--border)">
        <i class="fas fa-file-alt" style="font-size:32px;color:var(--accent);margin-bottom:12px"></i>
        <div>Create Exam</div>
      </div>
    </div>
    <h3 style="margin-top:32px">Recent Activity</h3>
    <div class="muted">No recent activity.</div>
  `;
}

function showCreateSubject(){
  renderUserBox('subjects');
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Create Subject'}])}
    <h2>Create New Subject</h2>
    <div style="max-width:600px">
      <label>Subject Title</label><input id="subTitle" placeholder="e.g. Advanced Mathematics" />
      <label>Description</label><textarea id="subDesc" placeholder="Brief description of the subject..."></textarea>
      <div style="margin-top:24px;display:flex;gap:12px">
        <button onclick="createSubject()">Create Subject</button> 
        <button class="btn-ghost" onclick="renderMainTeacher()">Cancel</button>
      </div>
    </div>
  `;
}
function createSubject(){
  const title = document.getElementById('subTitle').value.trim();
  const description = document.getElementById('subDesc').value.trim();
  if(!title){ showToast('Title is required', 'error'); return; }
  const sub = { id: uid('sub'), title, description, createdBy: currentUser.id, createdAt: now() };
  DB.subjects.push(sub); saveDB();
  showToast('Subject created successfully', 'success');
  showTeacherSubjects();
}

function showTeacherSubjects(){
  renderUserBox('subjects');
  main.innerHTML = `<h2>Your Subjects</h2><div id="teacherSubs" class="list" style="margin-top:20px"></div>`;
  const mySubs = DB.subjects.filter(s=>s.createdBy===currentUser.id);
  const container = document.getElementById('teacherSubs');
  container.innerHTML = mySubs.length ? mySubs.map(s=>`
    <div class="item">
      <div><strong>${escapeHtml(s.title)}</strong><div class="muted">${escapeHtml(s.description || '')}</div></div>
      <div style="display:flex;gap:8px">
        <button class="small" onclick="showSubjectEditor('${s.id}')">Manage</button>
        <button class="small btn-ghost" onclick="deleteSubject('${s.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('') : `<div class="muted">You have not created any subjects yet.</div>`;
}

function deleteSubject(id){
  if(!confirm('Are you sure? This will delete the subject and all associated exams.')) return;
  DB.exams = DB.exams.filter(e=>e.subjectId !== id);
  DB.subjects = DB.subjects.filter(s=>s.id!==id);
  saveDB();
  showToast('Subject deleted', 'info');
  showTeacherSubjects();
}

function showSubjectEditor(subjectId){
  renderUserBox('subjects');
  const subject = DB.subjects.find(s=>s.id===subjectId);
  const examsOfSub = DB.exams.filter(e=>e.subjectId===subjectId);
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Subjects', action:'showTeacherSubjects()'}, {label:subject.title}])}
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <h2>${escapeHtml(subject.title)}</h2>
    </div>
    <div style="margin-bottom:24px"><button onclick="renderCreateExamForSubject('${subjectId}')"><i class="fas fa-plus"></i> Add Exam</button></div>
    <div id="exList" class="list"></div>
  `;
  document.getElementById('exList').innerHTML = examsOfSub.length ? examsOfSub.map(e=>`
    <div class="item">
      <div>
        <strong>${escapeHtml(e.title)}</strong>
        <div class="muted">${e.durationMin} mins • ${e.questions.length} Questions</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="small" onclick="editExam('${e.id}')">Edit</button>
        <button class="small btn-ghost" onclick="viewResultsForExam('${e.id}')">Results</button>
        <button class="small btn-ghost" style="color:var(--danger)" onclick="deleteExam('${e.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('') : `<div class="muted">No exams created for this subject yet.</div>`;
}

function renderCreateExamForSubject(subjectId){
  renderUserBox('subjects');
  const sub = DB.subjects.find(s=>s.id===subjectId);
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Subjects', action:'showTeacherSubjects()'}, {label:sub.title, action:`showSubjectEditor('${subjectId}')`}, {label:'Create Exam'}])}
    <h2>Create Exam</h2>
    <div style="max-width:800px">
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-bottom:16px">Basic Information</h3>
        <label>Exam Title</label><input id="examTitleInput" placeholder="e.g. Mid-term Quiz" />
        <label>Description</label><textarea id="examDescInput" rows="3"></textarea>
        <div class="form-row" style="margin-top:16px">
          <div><label>Duration (minutes)</label><input id="examDurationInput" type="number" value="10" min="1" /></div>
          <div><label>Initial Questions</label><input id="examQCount" type="number" value="3" min="1" /></div>
        </div>
      </div>
      
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-bottom:16px">Grading & Attempts</h3>
        <div class="form-row">
          <div><label>Passing Score (%)</label><input id="examPassingScore" type="number" value="60" min="0" max="100" /></div>
          <div><label>Max Attempts (0 = unlimited)</label><input id="examMaxAttempts" type="number" value="0" min="0" /></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:16px;cursor:pointer">
          <input type="checkbox" id="examShowFeedback" checked style="width:auto" />
          <span>Show correct answers after submission</span>
        </label>
      </div>
      
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-bottom:16px">Randomization</h3>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="examRandomizeQuestions" style="width:auto" />
          <span>Randomize question order</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer">
          <input type="checkbox" id="examRandomizeChoices" style="width:auto" />
          <span>Randomize answer choices</span>
        </label>
      </div>
      
      <div class="card" style="margin-bottom:20px">
        <h3 style="margin-bottom:16px">Scheduling (Optional)</h3>
        <div class="form-row">
          <div><label>Start Date & Time</label><input id="examStartDate" type="datetime-local" /></div>
          <div><label>End Date & Time</label><input id="examEndDate" type="datetime-local" /></div>
        </div>
      </div>
      
      <div style="margin-top:24px;display:flex;gap:12px">
        <button onclick="createExam('${subjectId}')"><i class="fas fa-plus"></i> Create & Edit Questions</button> 
        <button class="btn-ghost" onclick="showSubjectEditor('${subjectId}')">Cancel</button>
      </div>
    </div>
  `;
}

function createExam(subjectId){
  const title = document.getElementById('examTitleInput').value.trim();
  const desc = document.getElementById('examDescInput').value.trim();
  const durationMin = parseInt(document.getElementById('examDurationInput').value) || 10;
  const qCount = Math.max(1, parseInt(document.getElementById('examQCount').value) || 3);
  const passingScore = parseInt(document.getElementById('examPassingScore').value) || 60;
  const maxAttempts = parseInt(document.getElementById('examMaxAttempts').value) || 0;
  const showFeedback = document.getElementById('examShowFeedback').checked;
  const randomizeQuestions = document.getElementById('examRandomizeQuestions').checked;
  const randomizeChoices = document.getElementById('examRandomizeChoices').checked;
  const startDate = document.getElementById('examStartDate').value || null;
  const endDate = document.getElementById('examEndDate').value || null;
  
  if(!title){ showToast('Title required', 'error'); return; }
  
  const exam = { 
    id: uid('exam'), 
    subjectId, 
    title, 
    description:desc, 
    durationMin, 
    passingScore,
    maxAttempts,
    showFeedback,
    randomizeQuestions,
    randomizeChoices,
    startDate,
    endDate,
    createdBy: currentUser.id, 
    questions: [] 
  };
  
  for(let i=0;i<qCount;i++){
    exam.questions.push({ id: uid('q'), text:`Question ${i+1} text`, choices:['Option 1','Option 2','Option 3','Option 4'], answerIndex:0, marks:1 });
  }
  DB.exams.push(exam); saveDB();
  showToast('Exam created', 'success');
  editExam(exam.id);
}

function editExam(examId){
  renderUserBox('subjects');
  const ex = DB.exams.find(e=>e.id===examId);
  if(!ex){ showToast('Exam not found', 'error'); return; }
  const sub = DB.subjects.find(s=>s.id===ex.subjectId);
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Subjects', action:'showTeacherSubjects()'}, {label:sub.title, action:`showSubjectEditor('${ex.subjectId}')`}, {label:'Edit Exam'}])}
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <h2>Edit Exam: ${escapeHtml(ex.title)}</h2>
    </div>
    <div class="card" style="margin-bottom:24px">
      <label>Title</label><input id="editExamTitle" value="${escapeHtml(ex.title)}" />
      <label>Description</label><textarea id="editExamDesc">${escapeHtml(ex.description || '')}</textarea>
      <label>Duration (min)</label><input id="editExamDuration" type="number" value="${ex.durationMin}" />
    </div>
    <h3>Questions</h3>
    <div id="questionsEditor"></div>
    <div style="margin-top:24px;display:flex;gap:12px;position:sticky;bottom:20px;background:var(--bg-body);padding:10px 0;border-top:1px solid var(--border)">
      <button onclick="saveExam('${ex.id}')"><i class="fas fa-save"></i> Save Changes</button> 
      <button class="btn-ghost" onclick="showSubjectEditor('${ex.subjectId}')">Back</button>
    </div>
  `;
  renderQuestionsEditor(ex);
}
function renderQuestionsEditor(ex){
  const qBox = document.getElementById('questionsEditor');
  qBox.innerHTML = ex.questions.map((q,i)=>`
    <div class="question">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <strong>Question ${i+1}</strong>
        <button class="small btn-ghost" style="color:var(--danger)" onclick="removeQuestionFromExam('${ex.id}','${q.id}')"><i class="fas fa-trash"></i></button>
      </div>
      <input id="q_text_${q.id}" value="${escapeHtml(q.text)}" placeholder="Question text" style="margin-bottom:12px;font-weight:500" />
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
        <div><label>Choice A</label><input id="q_${q.id}_c0" value="${escapeHtml(q.choices[0] || '')}" /></div>
        <div><label>Choice B</label><input id="q_${q.id}_c1" value="${escapeHtml(q.choices[1] || '')}" /></div>
        <div><label>Choice C</label><input id="q_${q.id}_c2" value="${escapeHtml(q.choices[2] || '')}" /></div>
        <div><label>Choice D</label><input id="q_${q.id}_c3" value="${escapeHtml(q.choices[3] || '')}" /></div>
      </div>
      <div class="form-row" style="margin-top:12px;align-items:flex-end">
        <div><label>Correct Choice (0-3)</label><input id="q_${q.id}_ans" type="number" min="0" max="3" value="${q.answerIndex}" /></div>
        <div><label>Marks</label><input id="q_${q.id}_marks" type="number" value="${q.marks}" /></div>
      </div>
    </div>
  `).join('') + `<div style="margin-top:16px"><button class="btn-ghost" style="width:100%;border:2px dashed var(--border)" onclick="addBlankQuestion('${ex.id}')"><i class="fas fa-plus"></i> Add Question</button></div>`;
}

function addBlankQuestion(examId){
  const ex = DB.exams.find(e=>e.id===examId);
  ex.questions.push({ id: uid('q'), text:'New question', choices:['','','',''], answerIndex:0, marks:1 });
  saveDB(); editExam(examId);
}
function removeQuestionFromExam(examId, qid){
  if(!confirm('Remove this question?')) return;
  const ex = DB.exams.find(e=>e.id===examId);
  ex.questions = ex.questions.filter(q=>q.id!==qid);
  saveDB(); editExam(examId);
}
function saveExam(examId){
  const ex = DB.exams.find(e=>e.id===examId);
  ex.title = document.getElementById('editExamTitle').value.trim();
  ex.description = document.getElementById('editExamDesc').value.trim();
  ex.durationMin = parseInt(document.getElementById('editExamDuration').value) || 10;
  // update questions
  ex.questions.forEach(q=>{
    q.text = document.getElementById(`q_text_${q.id}`).value.trim();
    q.choices[0] = document.getElementById(`q_${q.id}_c0`).value;
    q.choices[1] = document.getElementById(`q_${q.id}_c1`).value;
    q.choices[2] = document.getElementById(`q_${q.id}_c2`).value;
    q.choices[3] = document.getElementById(`q_${q.id}_c3`).value;
    q.answerIndex = Math.max(0, Math.min(3, parseInt(document.getElementById(`q_${q.id}_ans`).value) || 0));
    q.marks = parseFloat(document.getElementById(`q_${q.id}_marks`).value) || 1;
  });
  saveDB();
  showToast('Exam saved successfully', 'success');
  showSubjectEditor(ex.subjectId);
}

function deleteExam(examId){
  if(!confirm('Delete this exam permanently?')) return;
  DB.exams = DB.exams.filter(e=>e.id!==examId);
  saveDB();
  showToast('Exam deleted', 'info');
  renderMainTeacher();
}

function viewResultsForExam(examId){
  renderUserBox('results');
  const res = DB.results.filter(r=>r.examId===examId);
  const stats = calculateExamStats(examId);
  
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Results', action:'showAllResults()'}, {label:getExamTitle(examId)}])}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2>Results: ${escapeHtml(getExamTitle(examId))}</h2>
      ${res.length > 0 ? `<button onclick="exportResultsToCSV('${examId}')"><i class="fas fa-download"></i> Export CSV</button>` : ''}
    </div>
    
    ${stats ? `
    <div class="stats-grid" style="margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-value">${stats.totalAttempts}</div>
        <div class="stat-label">Total Attempts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.uniqueStudents}</div>
        <div class="stat-label">Unique Students</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.averageScore}%</div>
        <div class="stat-label">Average Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>
    ` : ''}
    
    ${res.length ? `<div class="card" style="padding:0;overflow:hidden"><table><thead><tr><th>Student</th><th>Score</th><th>Percentage</th><th>Status</th><th>Date</th></tr></thead><tbody>
      ${res.map(r=>{
        const percentage = ((r.score / r.total) * 100).toFixed(1);
        const exam = getExam(examId);
        const passed = percentage >= (exam.passingScore || 0);
        return `<tr><td>${escapeHtml(getUserName(r.userId))}</td><td><span style="font-weight:600;color:var(--primary)">${r.score}/${r.total}</span></td><td>${percentage}%</td><td><span class="badge ${passed ? 'badge-success' : 'badge-danger'}">${passed ? 'Passed' : 'Failed'}</span></td><td>${new Date(r.submittedAt).toLocaleString()}</td></tr>`;
      }).join('')}
    </tbody></table></div>` : `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No Submissions Yet</h3><p>No students have taken this exam yet.</p></div>`}
  `;
}

function showAllResults(){
  renderUserBox('results');
  let results = DB.results.slice();
  if(currentUser.role==='teacher'){
    const myExamIds = DB.exams.filter(e=>e.createdBy===currentUser.id).map(e=>e.id);
    results = results.filter(r=>myExamIds.includes(r.examId));
  }
  main.innerHTML = `
    ${renderBreadcrumb([{label:'All Results'}])}
    <h2>All Results</h2>
    ${results.length ? `<div class="card" style="padding:0;overflow:hidden"><table><thead><tr><th>Exam</th><th>Student</th><th>Score</th><th>Date</th></tr></thead><tbody>
      ${results.map(r=>`<tr><td>${escapeHtml(getExamTitle(r.examId))}</td><td>${escapeHtml(getUserName(r.userId))}</td><td>${r.score}/${r.total}</td><td>${new Date(r.submittedAt).toLocaleString()}</td></tr>`).join('')}
    </tbody></table></div>` : `<div class="muted">No results available.</div>`}
  `;
}

// ---------- ADMIN VIEWS ----------
function renderMainAdmin(){
  renderUserBox('');
  main.innerHTML = `
    <h2>Admin Dashboard</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));margin-top:20px">
      <div class="card center" onclick="showUsers()" style="cursor:pointer;border:2px dashed var(--border)">
        <i class="fas fa-users" style="font-size:32px;color:var(--primary);margin-bottom:12px"></i>
        <div>Manage Users</div>
      </div>
      <div class="card center" onclick="showSubjectsAdmin()" style="cursor:pointer;border:2px dashed var(--border)">
        <i class="fas fa-layer-group" style="font-size:32px;color:var(--accent);margin-bottom:12px"></i>
        <div>Manage Subjects</div>
      </div>
    </div>
  `;
}

function showUsers(){
  renderUserBox('users');
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Users'}])}
    <h2>Users</h2>
    <div class="list" style="margin-top:20px">${DB.users.map(u=>`<div class="item">
      <div><strong>${escapeHtml(u.name)}</strong><div class="muted">${escapeHtml(u.email)} • ${u.role.toUpperCase()}</div></div>
      <div style="display:flex;gap:8px">
        <button class="small" onclick="impersonate('${u.id}')">Impersonate</button> 
        <button class="small btn-ghost" style="color:var(--danger)" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('')}</div>
    <div style="margin-top:20px"><button class="btn-ghost" onclick="renderMainAdmin()">Back</button></div>
  `;
}
function deleteUser(userId){
  if(!confirm('Delete user?')) return;
  DB.users = DB.users.filter(u=>u.id!==userId);
  DB.results = DB.results.filter(r=>r.userId!==userId);
  saveDB(); showUsers();
  showToast('User deleted', 'info');
}
function impersonate(userId){
  const u = DB.users.find(x=>x.id===userId);
  if(!u){ showToast('User not found', 'error'); return; }
  currentUser = u;
  renderUserBox();
  goDashboard();
  showToast('Now impersonating ' + u.name, 'warning');
}

function showSubjectsAdmin(){
  renderUserBox('subjects');
  main.innerHTML = `
    ${renderBreadcrumb([{label:'All Subjects'}])}
    <h2>All Subjects</h2><div class="list" style="margin-top:20px">${DB.subjects.map(s=>`<div class="item"><div><strong>${escapeHtml(s.title)}</strong><div class="muted">By ${getUserName(s.createdBy)}</div></div><div><button onclick="showSubjectAdmin('${s.id}')">View</button></div></div>`).join('')}</div>
    <div style="margin-top:20px"><button class="btn-ghost" onclick="renderMainAdmin()">Back</button></div>`;
}
function showSubjectAdmin(subId){
  renderUserBox('subjects');
  const sub = DB.subjects.find(s=>s.id===subId);
  const exs = DB.exams.filter(e=>e.subjectId===subId);
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Subjects', action:'showSubjectsAdmin()'}, {label:sub.title}])}
    <h2>Subject: ${escapeHtml(sub.title)}</h2><div class="list" style="margin-top:20px">${exs.map(e=>`<div class="item"><div><strong>${escapeHtml(e.title)}</strong><div class="muted">${escapeHtml(e.description)}</div></div><div><button onclick="viewResultsForExam('${e.id}')">Results</button></div></div>`).join('')}</div><div style="margin-top:20px"><button class="btn-ghost" onclick="showSubjectsAdmin()">Back</button></div>`;
}

// ---------- EXAM FLOW (STUDENT) ----------
let activeAttempt = null;
let countdownInterval = null;

function startExam(examId){
  renderUserBox('subjects');
  const ex = DB.exams.find(e=>e.id===examId);
  if(!ex){ showToast('Exam not found', 'error'); return; }
  
  // Check availability
  if (!isExamAvailable(ex)) {
    showToast('This exam is not currently available', 'error');
    return;
  }
  
  // Check attempt limit
  const attempts = getAttemptCount(currentUser.id, ex.id);
  if (ex.maxAttempts > 0 && attempts >= ex.maxAttempts) {
    showToast(`You have reached the maximum number of attempts (${ex.maxAttempts})`, 'error');
    return;
  }
  
  // Prepare questions (with randomization if enabled)
  let questions = [...ex.questions];
  if (ex.randomizeQuestions) {
    questions = shuffle(questions);
  }
  
  // Randomize choices if enabled
  if (ex.randomizeChoices) {
    questions = questions.map(q => {
      const choices = [...q.choices];
      const correctAnswer = choices[q.answerIndex];
      const shuffledChoices = shuffle(choices);
      const newAnswerIndex = shuffledChoices.indexOf(correctAnswer);
      return { ...q, choices: shuffledChoices, answerIndex: newAnswerIndex };
    });
  }
  
  activeAttempt = { 
    examId: ex.id, 
    userId: currentUser.id, 
    startedAt: now(), 
    responses: {}, 
    total: questions.reduce((s,q)=>s+(q.marks||1),0),
    questions: questions // Store the randomized questions
  };
  
  // render exam
  main.innerHTML = `
    ${renderBreadcrumb([{label:getSubjectTitle(ex.subjectId), action:`showSubjectExams('${ex.subjectId}')`}, {label:ex.title}])}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h2>${escapeHtml(ex.title)}</h2>
        <div class="muted">${escapeHtml(getSubjectTitle(ex.subjectId))} &bull; Attempt ${attempts + 1}${ex.maxAttempts > 0 ? `/${ex.maxAttempts}` : ''}</div>
      </div>
      <div class="timer" id="countdown">--:--</div>
    </div>
    <div id="examQuestions"></div>
    <div style="margin-top:32px;display:flex;gap:12px;border-top:1px solid var(--border);padding-top:20px">
      <button onclick="submitAttempt()" style="flex:1"><i class="fas fa-check"></i> Submit Exam</button>
      <button class="btn-ghost" onclick="cancelAttempt()"><i class="fas fa-times"></i> Exit</button>
    </div>
  `;
  
  const qArea = document.getElementById('examQuestions');
  qArea.innerHTML = questions.map((q,i)=>`
    <div class="question" data-qid="${q.id}">
      <div><strong>Question ${i+1}</strong> <span class="muted" style="float:right">${q.marks} Marks</span></div>
      <div style="margin-bottom:12px">${escapeHtml(q.text)}</div>
      <div class="choices">${q.choices.map((c,ci)=>`<label><input name="ans_${q.id}" type="radio" value="${ci}" /> <span>${String.fromCharCode(65+ci)}. ${escapeHtml(c)}</span></label>`).join('')}</div>
    </div>
  `).join('');
  
  // start timer
  startCountdown(ex.durationMin * 60);
}

function startCountdown(seconds){
  const el = document.getElementById('countdown');
  let s = seconds;
  el.textContent = formatTime(s);
  if(countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(()=>{
    s--;
    if(s<0){ clearInterval(countdownInterval); showToast('Time up! Auto submitting...', 'warning'); submitAttempt(); return; }
    el.textContent = formatTime(s);
    if(s < 60) el.style.color = 'var(--danger)';
  },1000);
}
function formatTime(s){ const m=Math.floor(s/60); const sec=s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

function submitAttempt(){
  if(!activeAttempt) return;
  const ex = DB.exams.find(e=>e.id===activeAttempt.examId);
  const questions = activeAttempt.questions || ex.questions;
  
  // gather answers
  questions.forEach(q=>{
    const sel = document.querySelector(`input[name="ans_${q.id}"]:checked`);
    if(sel) activeAttempt.responses[q.id] = parseInt(sel.value);
  });
  
  // grade
  let score=0, correct=0;
  questions.forEach(q=>{
    const ans = activeAttempt.responses[q.id];
    if(typeof ans === 'number' && ans === q.answerIndex){ score += (q.marks || 1); correct++; }
  });
  
  activeAttempt.score = score;
  activeAttempt.correct = correct;
  activeAttempt.total = questions.reduce((s,q)=>s+(q.marks||1),0);
  activeAttempt.totalQ = questions.length;
  activeAttempt.submittedAt = now();
  
  // save result
  DB.results.push(activeAttempt);
  saveDB();
  
  // clear timers
  if(countdownInterval) clearInterval(countdownInterval);
  
  // Calculate percentage and pass/fail
  const percentage = ((score / activeAttempt.total) * 100).toFixed(1);
  const passed = percentage >= (ex.passingScore || 0);
  
  // show success with feedback
  let feedbackHtml = '';
  if (ex.showFeedback) {
    feedbackHtml = `
      <div class="card" style="margin-top:24px;max-width:600px;margin-left:auto;margin-right:auto">
        <h3 style="margin-bottom:16px">Answer Review</h3>
        ${questions.map((q, i) => {
          const userAnswer = activeAttempt.responses[q.id];
          const isCorrect = userAnswer === q.answerIndex;
          return `
            <div style="margin-bottom:16px;padding:12px;background:var(--bg-surface);border-radius:8px;border-left:3px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}">
              <div style="font-weight:600;margin-bottom:8px">Question ${i+1}: ${escapeHtml(q.text)}</div>
              <div style="color:var(--text-secondary);font-size:13px">
                Your answer: ${userAnswer !== undefined ? String.fromCharCode(65 + userAnswer) + '. ' + escapeHtml(q.choices[userAnswer]) : 'Not answered'}
              </div>
              ${!isCorrect ? `<div style="color:var(--success);font-size:13px;margin-top:4px">Correct answer: ${String.fromCharCode(65 + q.answerIndex)}. ${escapeHtml(q.choices[q.answerIndex])}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  main.innerHTML = `
    <div class="center" style="padding:40px">
      <i class="fas ${passed ? 'fa-check-circle' : 'fa-times-circle'}" style="font-size:64px;color:var(${passed ? '--success' : '--danger'});margin-bottom:24px"></i>
      <h2>Exam Submitted!</h2>
      <p class="muted">Your responses have been recorded successfully.</p>
      <div class="stats-grid" style="max-width:600px;margin:32px auto">
        <div class="stat-card">
          <div class="stat-value">${score}/${activeAttempt.total}</div>
          <div class="stat-label">Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${percentage}%</div>
          <div class="stat-label">Percentage</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${correct}/${activeAttempt.totalQ}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(${passed ? '--success' : '--danger'})">${passed ? 'Passed' : 'Failed'}</div>
          <div class="stat-label">Status</div>
        </div>
      </div>
      ${feedbackHtml}
      <button onclick="renderMainStudent()" style="margin-top:24px"><i class="fas fa-home"></i> Return to Dashboard</button>
    </div>`;
  activeAttempt = null;
}

function cancelAttempt(){
  if(confirm('Exit without submitting? Your answers will be lost.')){ if(countdownInterval) clearInterval(countdownInterval); activeAttempt=null; renderMainStudent(); }
}

// ---------- UTILS ----------
function getUserName(userId){ const u = DB.users.find(x=>x.id===userId); return u ? u.name : '(unknown)'; }
function getExam(examId){ return DB.exams.find(e=>e.id===examId) || {}; }
function getExamTitle(examId){ const e = getExam(examId); return e.title || '(removed)'; }
function getSubjectTitle(subjectId){ const s = DB.subjects.find(x=>x.id===subjectId); return s ? s.title : '(unknown)'; }

// ---------- small admin/teacher helpers ----------
function getUserByEmail(email){ return DB.users.find(u=>u.email.toLowerCase()===email.toLowerCase()); }

function showCreateExam(){
  renderUserBox('create_exam');
  // show subjects (teacher's)
  const mySubs = DB.subjects.filter(s=>s.createdBy===currentUser.id);
  if(mySubs.length===0){ if(!confirm('No subject found. Create a new subject?')) return; showCreateSubject(); return; }
  main.innerHTML = `
    ${renderBreadcrumb([{label:'Create Exam'}])}
    <h2>Create Exam</h2>
    <div style="max-width:600px">
      <label>Select Subject</label>
      <select id="selSub">${mySubs.map(s=>`<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('')}</select>
      <label>Exam Title</label><input id="newExamTitle" />
      <label>Description</label><textarea id="newExamDesc"></textarea>
      <div class="form-row" style="margin-top:16px">
        <div><label>Duration (min)</label><input id="newExamDur" type="number" value="10" /></div>
        <div><label>Questions</label><input id="newExamQ" type="number" value="3" /></div>
      </div>
      <div style="margin-top:24px;display:flex;gap:12px">
        <button onclick="createExamFromForm()">Create</button> 
        <button class="btn-ghost" onclick="renderMainTeacher()">Cancel</button>
      </div>
    </div>
  `;
}
function createExamFromForm(){
  const subjectId = document.getElementById('selSub').value;
  const title = document.getElementById('newExamTitle').value.trim();
  const desc = document.getElementById('newExamDesc').value.trim();
  const dur = parseInt(document.getElementById('newExamDur').value) || 10;
  const qnum = Math.max(1, parseInt(document.getElementById('newExamQ').value) || 3);
  if(!title){ showToast('Title required', 'error'); return; }
  const ex = { 
    id: uid('exam'), 
    subjectId, 
    title, 
    description:desc, 
    durationMin:dur, 
    createdBy: currentUser.id, 
    questions:[],
    // Defaults for properties not in this simple form
    passingScore: 60,
    maxAttempts: 0,
    showFeedback: true,
    randomizeQuestions: false,
    randomizeChoices: false,
    startDate: null,
    endDate: null
  };
  for(let i=0;i<qnum;i++){
    ex.questions.push({ id: uid('q'), text:`Question ${i+1} text`, choices:['Option 1','Option 2','Option 3','Option 4'], answerIndex:0, marks:1 });
  }
  DB.exams.push(ex); saveDB();
  showToast('Exam created', 'success');
  editExam(ex.id);
}

// ---------- helper functions to get exam by id for student start ----------
function showSubjects(){
  if(currentUser.role==='student') renderMainStudent();
  else if(currentUser.role==='teacher') showTeacherSubjects();
  else showSubjectsAdmin();
}

function getExamById(id){ return DB.exams.find(e=>e.id===id); }

// ---------- init ----------
function init(){
  // ensure DB arrays exist
  DB.users = DB.users || [];
  DB.subjects = DB.subjects || [];
  DB.exams = DB.exams || [];
  DB.results = DB.results || [];
  renderUserBox();
}
init();

// ---------- expose some functions for onclick usage in HTML string contexts ----------
window.doLogin = doLogin;
window.logout = logout;
window.renderRegister = renderRegister;
window.createSubject = createSubject;
window.showCreateExam = showCreateExam;
window.showTeacherSubjects = showTeacherSubjects;
window.showSubjects = showSubjects;
window.showSubjectsAdmin = showSubjectsAdmin;
window.showCreateSubject = showCreateSubject;
window.renderMainTeacher = renderMainTeacher;
window.renderMainAdmin = renderMainAdmin;
window.renderMainStudent = renderMainStudent;
window.startExam = startExam;
window.submitAttempt = submitAttempt;
window.cancelAttempt = cancelAttempt;
window.showStudentAttempts = showStudentAttempts;
window.showAllResults = showAllResults;
window.showUsers = showUsers;
window.showSubjectEditor = showSubjectEditor;
window.editExam = editExam;
window.viewResultsForExam = viewResultsForExam;
window.showSubjectExams = showSubjectExams;
window.showCreateExam = showCreateExam;
window.showSubjectAdmin = showSubjectAdmin;
window.deleteExam = deleteExam;
window.getExam = getExam;
window.getExamTitle = getExamTitle;
window.getSubjectTitle = getSubjectTitle;
window.startCountdown = startCountdown;
window.impersonate = impersonate;
window.deleteUser = deleteUser;
window.deleteSubject = deleteSubject;
window.removeQuestionFromExam = removeQuestionFromExam;
window.addBlankQuestion = addBlankQuestion;
window.saveExam = saveExam;
window.createExam = createExam;
window.createExamFromForm = createExamFromForm;
window.doRegister = doRegister;
window.goDashboard = goDashboard;





