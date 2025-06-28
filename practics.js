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
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    }
    fetchTasksFromDB();
  })
  .catch(() => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = "login.html";
  });

// ✅ Logout
document.getElementById("logoutIconWrapper")?.addEventListener("click", () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  window.location.href = "login.html";
});

// === Notification Logic ===
const PUBLIC_VAPID_KEY = 'BBuTvJaXDDMC4-uqJ2oYMnw2-JAaGwl1FzjwmAKGt_BdBQxmCnrOSVOafgS_vCpCMzYi9ayR3WqPBJNCibx03eg';

async function subscribeUserToPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();

    if (existing) {
      console.log('✅ Already subscribed to push');
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });

    await fetch(`${BASE_URL}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(subscription)
    });

    console.log('📬 Subscribed to push notifications');
  } catch (err) {
    console.error('❌ Failed to subscribe to push:', err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

window.addEventListener('load', () => {
  const notifToast = document.getElementById('notifToast');
  const notifAllowBtn = document.getElementById('notifAllowBtn');
  const notifToastClose = document.getElementById('notifToastClose');

  const permission = Notification?.permission;

  if ('Notification' in window && permission !== 'granted') {
    notifToast.style.display = 'flex';
  }

  notifAllowBtn?.addEventListener('click', async () => {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        localStorage.setItem('notifPermission', 'granted');
        showToast("Notifications enabled!");

        await navigator.serviceWorker.register('/frontend2/sw.js');
        await subscribeUserToPush();

        notifToast.style.display = 'none';
      } else {
        localStorage.removeItem('notifPermission');
        showToast("Notifications denied", "red");
        notifToast.style.display = 'none';
      }
    } catch {
      showToast("Error requesting notification permission", "red");
      notifToast.style.display = 'none';
    }
  });

  notifToastClose?.addEventListener('click', () => {
    localStorage.removeItem('notifPermission');
    notifToast.style.display = 'none';
  });
});

// === Core Task Logic ===
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
            <span style="color:#b71c1c;cursor:pointer;font-weight:bold;" title="Delete Task" data-day="${i}" data-idx="${idx}">&times;</span>
            <form class="uploadForm" data-day="${i}" data-idx="${idx}" enctype="multipart/form-data">
              <input type="file" name="file" required>
              <button type="submit">Upload</button>
            </form>
            ${task.file ? `<button class="deleteFileBtn" data-day="${i}" data-idx="${idx}" data-filename="${task.file}">Delete File</button>` : ''}` : ''}`;

        card.appendChild(taskDiv);
      });
    }

    weekGrid.appendChild(card);
  });

  setupTaskEvents(tasks);
}

function setupTaskEvents(tasks) {
  document.querySelectorAll('.task span[title="Delete Task"]').forEach(span => {
    span.onclick = async () => {
      const dayIdx = +span.getAttribute('data-day');
      const taskIdx = +span.getAttribute('data-idx');
      const task = tasks[dayIdx][taskIdx];
      if (!confirm("Are you sure you want to delete this task?")) return;

      try {
        const res = await fetch(`${BASE_URL}/task/${task._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) showToast("Task deleted");
        else showToast("Failed to delete task", "red");
      } catch {
        showToast("Server error while deleting task", "red");
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
            showToast("File uploaded!");
            renderWeek();
          } else {
            showToast('Failed to link file to task', 'red');
          }
        } else {
          showToast('Upload failed', 'red');
        }
      } catch {
        showToast('Server error while uploading', 'red');
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
      } catch {
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
        if (!delData.success) return showToast('Failed to delete file.', 'red');

        const patchRes = await fetch(`${BASE_URL}/task/${taskId}/remove-file`, {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + token }
        });

        const patchData = await patchRes.json();
        if (!patchData.success) return showToast('File deleted but reference remains.', 'red');

        tasks[dayIdx][taskIdx].file = '';
        showToast('File deleted');
        renderWeek();
      } catch {
        showToast('Server error', 'red');
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
    if (!data.success) showToast('Failed to save task in DB.', 'red');
    else fetchTasksFromDB();
  } catch {
    showToast('Error connecting to server.', 'red');
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
      showToast('Failed to load tasks from DB', 'red');
    }
  } catch {
    showToast('Server error while loading tasks.', 'red');
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
