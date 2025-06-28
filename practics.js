const BASE_URL = "https://backend-mxl6.onrender.com";

// ✅ Remember Me Token Logic
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const isPersistent = !!localStorage.getItem('token');
if (!token) window.location.href = "login.html";

// ✅ Admin UI Setup
let isAdmin = false;
document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

fetch(`${BASE_URL}/api/me`, {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(res => res.json())
  .then(user => {
    const adminNames = ['Harsh Ninania', 'Satyam Pr'];
    isAdmin = adminNames.includes(user.name);
    if (isAdmin) {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'inline-block';
      });
    }
    fetchTasksFromDB();
  })
  .catch(err => {
    console.error('Error fetching user info:', err);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = "login.html";
  });

// ✅ Logout
document.getElementById("logoutIconWrapper")?.addEventListener("click", function () {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  window.location.href = "login.html";
});

// ✅ Notification Toast Setup
function showNotifToast() {
  const toast = document.getElementById("notifToast");
  if (!toast) return;
  toast.style.display = "flex";
  document.getElementById("notifToastClose").onclick = () => toast.style.display = "none";
  document.getElementById("notifAllowBtn").onclick = () => {
    toast.style.display = "none";
    registerForPush();
  };
}

async function registerForPush() {
  try {
    const reg = await navigator.serviceWorker.register('/frontend2/sw.js');
    console.log('[SW] Registered:', reg);

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return alert("Notifications not enabled");

    const existingSub = await reg.pushManager.getSubscription();
    if (!existingSub) {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'BBuTvJaXDDMC4-uqJ2oYMnw2-JAaGwl1FzjwmAKGt_BdBQxmCnrOSVOafgS_vCpCMzYi9ayR3WqPBJNCibx03eg'
      });

      await fetch(`${BASE_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });

      console.log("Push subscribed.");
    } else {
      console.log("Already subscribed.");
    }
  } catch (err) {
    console.error("Push setup failed:", err);
  }
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
  const alreadyAsked = localStorage.getItem("notifAsked");
  if (!alreadyAsked && Notification.permission === 'default') {
    setTimeout(() => {
      showNotifToast();
      localStorage.setItem("notifAsked", "true");
    }, 5000);
  } else if (Notification.permission === 'granted') {
    registerForPush();
  }
}

// ✅ Core Logic Continues

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const weekGrid = document.getElementById('weekGrid');
const addTaskForm = document.getElementById('addTaskForm');
const showFormBtn = document.getElementById('showFormBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const taskDay = document.getElementById('taskDay');
const taskName = document.getElementById('taskName');
const taskTime = document.getElementById('taskTime');

let currentTab = 'this';
const tasksThisWeek = [[], [], [], [], [], [], []];
const tasksNextWeek = [[], [], [], [], [], [], []];

function renderWeek() {
  const tasks = currentTab === 'this' ? tasksThisWeek : tasksNextWeek;
  weekGrid.innerHTML = '';

  weekDays.forEach((day, i) => {
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `<div class="day-title">${day}</div>`;

    if (tasks[i].length === 0) {
      card.innerHTML += `<div class="empty-msg">No tasks yet 🙃</div>`;
    } else {
      tasks[i].forEach((task, idx) => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task';
        taskDiv.innerHTML = `
          <div class="taskClickable" data-filename="${task.file || ''}" style="flex:1;">
            ${task.name} | <b>Time:</b> ${task.time}
          </div>
          ${isAdmin ? `
            <span style="color:#b71c1c;cursor:pointer;font-weight:bold;" title="Delete" data-day="${i}" data-idx="${idx}">&times;</span>
            <form class="uploadForm" data-day="${i}" data-idx="${idx}" enctype="multipart/form-data">
              <input type="file" name="file" required>
              <button type="submit">Upload</button>
            </form>
            ${task.file ? `<button class="deleteFileBtn" data-day="${i}" data-idx="${idx}" data-filename="${task.file}">Delete File</button>` : ''}`
          : ''}`;
        card.appendChild(taskDiv);
      });
    }

    weekGrid.appendChild(card);
  });

  setupTaskEvents(tasks);
}

function setupTaskEvents(tasks) {
  document.querySelectorAll('.task span[title="Delete"]').forEach(span => {
    span.onclick = async () => {
      const dayIdx = +span.getAttribute('data-day');
      const taskIdx = +span.getAttribute('data-idx');
      const task = tasks[dayIdx][taskIdx];

      if (task._id) {
        try {
          const res = await fetch(`${BASE_URL}/task/${task._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
          });
          const data = await res.json();
          if (!data.success) alert('Failed to delete task from DB.');
        } catch (err) {
          alert('Server error while deleting task.');
        }
      }

      tasks[dayIdx].splice(taskIdx, 1);
      renderWeek();
    };
  });

  document.querySelectorAll('.uploadForm').forEach(form => {
    form.onsubmit = async e => {
      e.preventDefault();
      const dayIdx = +form.getAttribute('data-day');
      const taskIdx = +form.getAttribute('data-idx');
      const formData = new FormData(form);

      try {
        const uploadRes = await fetch(`${BASE_URL}/upload`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          const patchRes = await fetch(`${BASE_URL}/task/${tasks[dayIdx][taskIdx]._id}/add-file`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ filename: uploadData.file.filename })
          });

          const patchData = await patchRes.json();
          if (patchData.success) {
            tasks[dayIdx][taskIdx].file = uploadData.file.filename;
            renderWeek();
          } else {
            alert('Failed to link file to task');
          }
        } else {
          alert('Upload failed');
        }
      } catch (err) {
        alert('Server error while uploading');
      }
    };
  });

  document.querySelectorAll('.taskClickable').forEach(div => {
    div.onclick = async () => {
      const filename = div.getAttribute('data-filename');
      if (!filename) return alert('Solution not uploaded yet.');

      try {
        const res = await fetch(`${BASE_URL}/download/${filename}`, {
          headers: { Authorization: 'Bearer ' + token }
        });

        if (!res.ok) return alert('Download failed');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert('Error downloading file.');
      }
    };
  });

  document.querySelectorAll('.deleteFileBtn').forEach(button => {
    button.onclick = async () => {
      const filename = button.getAttribute('data-filename');
      const dayIdx = +button.getAttribute('data-day');
      const taskIdx = +button.getAttribute('data-idx');
      const taskId = tasks[dayIdx][taskIdx]._id;

      if (!filename) return alert('No file to delete');
      if (!confirm('Delete this file?')) return;

      try {
        const delRes = await fetch(`${BASE_URL}/delete-file/${filename}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const delData = await delRes.json();
        if (!delData.success) return alert('Failed to delete file.');

        const patchRes = await fetch(`${BASE_URL}/task/${taskId}/remove-file`, {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const patchData = await patchRes.json();
        if (!patchData.success) return alert('File deleted but reference remains.');

        tasks[dayIdx][taskIdx].file = '';
        alert('File deleted');
        renderWeek();
      } catch (err) {
        alert('Server error');
      }
    };
  });
}

showFormBtn.onclick = () => addTaskForm.style.display = 'flex';
closeFormBtn.onclick = () => {
  addTaskForm.style.display = 'none';
  addTaskForm.reset();
};

addTaskForm.onsubmit = async e => {
  e.preventDefault();
  const dayIdx = +taskDay.value;
  const taskObj = {
    name: taskName.value,
    time: taskTime.value,
    week: currentTab
  };

  const targetArray = currentTab === 'this' ? tasksThisWeek : tasksNextWeek;
  targetArray[dayIdx].push(taskObj);
  renderWeek();
  addTaskForm.style.display = 'none';
  addTaskForm.reset();

  try {
    const res = await fetch(`${BASE_URL}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ day: dayIdx, ...taskObj })
    });

    const data = await res.json();
    if (!data.success) alert('Failed to save task in DB.');
    else fetchTasksFromDB();
  } catch (err) {
    alert('Error connecting to server.');
  }
};

async function fetchTasksFromDB() {
  try {
    const res = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      for (let i = 0; i < 7; i++) tasksThisWeek[i] = [], tasksNextWeek[i] = [];
      data.tasks.forEach(task => {
        const target = task.week === 'next' ? tasksNextWeek : tasksThisWeek;
        target[task.day].push({ ...task });
      });
      renderWeek();
    } else {
      alert('Failed to load tasks from DB');
    }
  } catch (err) {
    alert('Server error while loading tasks.');
  }
}

document.getElementById('thisWeekBtn').onclick = () => {
  currentTab = 'this';
  document.getElementById('thisWeekBtn').classList.add('active-tab');
  document.getElementById('nextWeekBtn').classList.remove('active-tab');
  renderWeek();
};

document.getElementById('nextWeekBtn').onclick = () => {
  currentTab = 'next';
  document.getElementById('nextWeekBtn').classList.add('active-tab');
  document.getElementById('thisWeekBtn').classList.remove('active-tab');
  renderWeek();
};
