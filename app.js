/* Simple SPA logic + fake data storage for the prototype.
   - Stores tasks and submissions in localStorage
   - Allows client to create tasks, contributors to annotate tasks and earn credits
*/

const state = {
  currentUser: { id: 'contrib-1', name: 'You (demo contributor)', type: 'contributor' }, // simple demo user
  tasks: [],         // {id, title, type, content, reward, createdBy, createdAt, status}
  submissions: [],   // {id, taskId, userId, result, createdAt}
  users: []          // track contributors for admin view
}

/* Utility helpers */
const $ = sel => document.querySelector(sel)
const $$ = sel => Array.from(document.querySelectorAll(sel))
const uid = (p='id') => `${p}-${Math.random().toString(36).slice(2,9)}`

/* init: load from localStorage */
function loadState(){
  const raw = localStorage.getItem('crowdtrain.v1')
  if(raw) {
    const parsed = JSON.parse(raw)
    Object.assign(state, parsed)
  } else {
    // seed demo tasks
    state.tasks = [
      { id: uid('t'), title: "Label Sentiment (Text)", type: "text", content: "This movie was awesome! Best I've seen.", reward: 5, createdBy: 'client-demo', createdAt: Date.now(), status: 'open' },
      { id: uid('t'), title: "Rate AI Answer", type: "rating", content: "Q: What's climate change? A: It's when weather changes.", reward: 3, createdBy: 'client-demo', createdAt: Date.now(), status: 'open' },
      { id: uid('t'), title: "Image: Identify object", type: "image", content: "https://via.placeholder.com/300?text=Car", reward: 6, createdBy: 'client-demo', createdAt: Date.now(), status: 'open' }
    ]
    state.users = [{id: state.currentUser.id, name: state.currentUser.name, balance: 0}]
    persist()
  }
}

function persist(){
  localStorage.setItem('crowdtrain.v1', JSON.stringify({
    tasks: state.tasks,
    submissions: state.submissions,
    users: state.users
  }))
}

/* Routing (simple) */
function routeTo(name){
  $$('.page').forEach(p => p.classList.add('hidden'))
  const el = $(`#${name}`)
  if(el) el.classList.remove('hidden')
  // update highlight (optional)
}

/* --- Contributor UI --- */
function renderTaskList(){
  const ul = $('#task-list-ul')
  ul.innerHTML = ''
  const openTasks = state.tasks.filter(t=>t.status==='open')
  if(openTasks.length===0){
    ul.innerHTML = '<li>No tasks available — create one as a client.</li>'
    return
  }
  openTasks.forEach(t=>{
    const li = document.createElement('li')
    li.innerHTML = `<strong>${t.title}</strong><div class="task-meta">${t.type} • Reward ${t.reward} credits</div>`
    li.onclick = ()=> openTaskView(t.id)
    ul.appendChild(li)
  })
}

function findUser(userId){
  return state.users.find(u=>u.id===userId)
}

function openTaskView(taskId){
  const task = state.tasks.find(t=>t.id===taskId)
  const view = $('#task-view')
  view.classList.remove('empty')
  view.innerHTML = ''
  const h = document.createElement('h3'); h.textContent = task.title
  const contentWrap = document.createElement('div')
  contentWrap.className = 'task-content'
  if(task.type === 'image'){
    contentWrap.innerHTML = `<img src="${task.content}" alt="${task.title}" style="max-width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.03)" />`
  } else {
    contentWrap.innerHTML = `<p style="white-space:pre-wrap">${task.content}</p>`
  }

  const form = document.createElement('div')
  form.className = 'annotation-form'
  form.innerHTML = `
    <label style="display:block; margin:10px 0 6px">Your response / label</label>
    <textarea id="annotation-input" rows="4" style="width:100%; padding:8px; border-radius:8px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:inherit"></textarea>
    <div style="margin-top:8px; display:flex; gap:8px; align-items:center">
      <button id="submit-annotation" class="btn primary">Submit — Earn ${task.reward}</button>
      <button id="skip-task" class="btn outline">Skip</button>
    </div>
  `
  view.appendChild(h)
  view.appendChild(contentWrap)
  view.appendChild(form)

  $('#skip-task').onclick = ()=> {
    view.innerHTML = '<h4>Task skipped. Select another task.</h4>'
    view.classList.add('empty')
  }
  $('#submit-annotation').onclick = () => {
    const val = $('#annotation-input').value.trim()
    if(!val){ alert('Please enter a label or response to submit.'); return }
    const sub = { id: uid('s'), taskId: task.id, userId: state.currentUser.id, result: val, createdAt: Date.now()}
    state.submissions.push(sub)
    // reward credited (simple immediate reward demo)
    let u = findUser(state.currentUser.id)
    if(!u){
      u = {id: state.currentUser.id, name: state.currentUser.name, balance:0}
      state.users.push(u)
    }
    u.balance = (u.balance||0) + (task.reward||1)
    persist()
    renderWallet()
    renderTaskList()
    view.innerHTML = `<h4>Thanks! Submission saved. You earned ${task.reward} credits.</h4>`
    // Optionally mark task as 'completed' after x submissions; simplified here - mark closed
    // For demo: keep open
  }
}

function renderWallet(){
  const u = findUser(state.currentUser.id) || {balance:0}
  $('#wallet-balance').textContent = `Credits: ${u.balance || 0}`
}

/* --- Client UI --- */
function initClientForm(){
  $('#client-upload-form').onsubmit = ev => {
    ev.preventDefault()
    const title = $('#task-title').value.trim() || 'Untitled Task'
    const type = $('#task-type').value
    const content = $('#task-content').value.trim() || (type==='image' ? 'https://via.placeholder.com/300' : 'No content')
    const reward = Number($('#task-reward').value) || 5
    const t = { id: uid('t'), title, type, content, reward, createdBy: 'client-demo', createdAt: Date.now(), status: 'open'}
    state.tasks.push(t)
    persist()
    alert('Task created: ' + title)
    $('#client-upload-form').reset()
    renderClientTasks()
  }

  $('#client-view-tasks').onclick = () => {
    $('#client-tasks-list').classList.toggle('hidden')
    renderClientTasks()
  }
}

function renderClientTasks(){
  const ul = $('#client-tasks-ul')
  ul.innerHTML = ''
  const my = state.tasks.filter(t => t.createdBy === 'client-demo')
  if(my.length===0){ ul.innerHTML = '<li>No tasks posted</li>'; return }
  my.forEach(t=>{
    const li = document.createElement('li')
    li.innerHTML = `<strong>${t.title}</strong> <div class="task-meta">${t.type} • Reward ${t.reward} • ${new Date(t.createdAt).toLocaleString()}</div>`
    ul.appendChild(li)
  })
}

/* --- Admin UI --- */
function renderAdmin(){
  const tasksUl = $('#admin-tasks-ul')
  tasksUl.innerHTML = ''
  state.tasks.forEach(t=>{
    const li = document.createElement('li')
    const numSub = state.submissions.filter(s=>s.taskId===t.id).length
    li.innerHTML = `<strong>${t.title}</strong> <div class="task-meta">${t.type} • reward ${t.reward} • ${numSub} submissions</div>`
    tasksUl.appendChild(li)
  })

  const usersUl = $('#admin-users-ul')
  usersUl.innerHTML = ''
  state.users.forEach(u=>{
    const li = document.createElement('li')
    const contributions = state.submissions.filter(s=>s.userId===u.id).length
    li.innerHTML = `<strong>${u.name}</strong> <div class="task-meta">Credits: ${u.balance || 0} • Submissions: ${contributions}</div>`
    usersUl.appendChild(li)
  })
}

/* --- navigation hooks --- */
function attachNav(){
  $$('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const route = btn.dataset.route
      routeTo(route)
      // render relevant
      if(route==='contrib'){ renderTaskList(); renderWallet() }
      if(route==='client'){ renderClientTasks() }
      if(route==='admin'){ renderAdmin() }
    })
  })
  // CTA buttons
  $('#cta-contrib').onclick = ()=> { routeTo('contrib'); renderTaskList(); renderWallet() }
  $('#cta-client').onclick = ()=> { routeTo('client') }
}

/* bootstrap */
function boot(){
  loadState()
  attachNav()
  initClientForm()
  // default route
  routeTo('home')

  // initial renders
  renderTaskList()
  renderWallet()
  renderClientTasks()
  renderAdmin()
}

boot()
