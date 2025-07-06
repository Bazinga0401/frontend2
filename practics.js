
const BASE_URL = `https://backend-mxl6.onrender.com`;
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
// ✅ Remember Me Token Logic
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const isPersistent = !!localStorage.getItem('token');

if (!token) {
  window.location.href = "login.html";
}

// ✅ Admin UI Setup
let isAdmin = false;
fetch(`${BASE_URL}/api/me`, {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => {
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
})
.then(user => {
  const adminNames = ['Harsh Ninania', 'Bazinga!'];
  isAdmin = adminNames.includes(user.name);
  if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.classList.add('visible');
    });
  }
  fetchTasksFromDB();
})
.catch(err => {
  console.error('Error fetching user info:', err);

  if (!navigator.onLine) {
    console.warn('🛜 Offline — skipping logout');
    return; // ✅ Stay logged in if offline
  }

  if (err.message === 'Unauthorized') {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = "login.html";
  }
});


  //loading aniamtion code
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.style.opacity = 0;
    setTimeout(() => loader.remove(), 500); // smooth fade
  }, 1500); // ⏳ Show for 1.5 seconds minimum
});


// ✅ Logout Icon Logic
document.getElementById("logoutIconWrapper")?.addEventListener("click", function () {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  window.location.href = "login.html";
});

// ✅ Push Notification Setup
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', async () => {
    try {
     const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
await navigator.serviceWorker.ready; // ✅ wait until it's active
console.log('✅ Service Worker is ready and controlling this page');
         

      const isIOSDevice = isIOS();
const isPWA = isInStandaloneMode();

// 📱 Skip notification prompt for iOS unless PWA is installed
if (isIOSDevice && !isPWA) {
  console.log('📵 iPhone Safari: skipping notification request (not in PWA mode)');
  return;
}

const permission = await Notification.requestPermission();
if (permission !== 'granted') {
  return alert('🔕 Notifications disabled. You won’t get reminders.');
}

      // Firebase config (same as in SW)
      const firebaseConfig = {
        apiKey: "AIzaSyDZujeILCWJZbxp8sxn9LmbVyu-z5nn060",
        authDomain: "task-manager-185dc.firebaseapp.com",
        projectId: "task-manager-185dc",
        messagingSenderId: "1046024881090",
        appId: "1:1046024881090:web:58333b0313ebbc80ba4c5b"
      };
      firebase.initializeApp(firebaseConfig);
      const messaging = firebase.messaging();

      // Get token and send to backend
      const fcmToken = await messaging.getToken({
        vapidKey: 'BNwpgC5w_6ieYZnTcRmMOcWNeN3_YhAUDcHzvI2xYrwtHNPrIKH9LNWW77GaQxa6U18ypyp3ac53JuHLBtop1tc',
        serviceWorkerRegistration: reg
      });

      if (fcmToken) {
        await fetch(`${BASE_URL}/fcm-subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: fcmToken })
        });
        console.log('🔑 Token registered with backend');
      } else {
        console.warn('⚠️ Failed to get FCM token');
      }

      messaging.onMessage(payload => {
        console.log('[📬 Foreground Push]', payload);
        const { title, body } = payload.notification || {};
        new Notification(title || 'New Task 📝', { body });
        localStorage.setItem('unreadNotif', 'true');
        document.getElementById('notif-badge')?.style?.setProperty('display', 'block');
      });
    } catch (err) {
      console.error('🔥 Error during FCM setup:', err);
    }
  });
}

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
            ${task.file ? `<button class="deleteFileBtn" data-day="${i}" data-idx="${idx}" data-filename="${task.file}">Delete File</button>` : ''}
          ` : ''}
        `;
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

      if (task.id) {
        try {
          const res = await fetch(`${BASE_URL}/task/${task.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
          });
          const data = await res.json();
          if (!data.success) alert('Failed to delete task from DB.');
        } catch (err) {
          console.error('Error deleting task:', err);
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
          showToast('File uploaded successfully ✅');

          const patchRes = await fetch(`${BASE_URL}/task/${tasks[dayIdx][taskIdx].id}/add-file`, {
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
        console.error('Upload error:', err);
        alert('Server error while uploading');
      }
    };
  });

  document.querySelectorAll('.taskClickable').forEach(div => {
    div.onclick = async () => {
      const filename = div.getAttribute('data-filename');
      if (!filename) return showToast('Solution not uploaded yet.');

      try {
        const res = await fetch(`${BASE_URL}/download/${filename}`, {
          headers: { Authorization: 'Bearer ' + token }
        });

        if (!res.ok) return showToast('Download failed');

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
        console.error('Download error:', err);
        alert('Error downloading file.');
      }
    };
  });

  document.querySelectorAll('.deleteFileBtn').forEach(button => {
    button.onclick = async () => {
      const filename = button.getAttribute('data-filename');
      const dayIdx = +button.getAttribute('data-day');
      const taskIdx = +button.getAttribute('data-idx');
      const taskId = tasks[dayIdx][taskIdx].id;

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
        showToast('File deleted');
        renderWeek();
      } catch (err) {
        console.error('Error deleting file:', err);
        alert('Server error');
      }
    };
  });
}



// Form toggle
showFormBtn.onclick = () => addTaskForm.style.display = 'flex';
closeFormBtn.onclick = () => {
  addTaskForm.style.display = 'none';
  addTaskForm.reset();
};

// Submit task
addTaskForm.onsubmit = async e => {
  e.preventDefault();
  const dayIdx = +taskDay.value;
  const taskObj = {
  name: taskName.value,
  time: taskTime.value,
  week: currentTab
};

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
  if (!data.success) return alert('Failed to save task in DB.');

  const newTask = {
    ...taskObj,
    day: dayIdx,
    id: data.task._id  // ✅ Store MongoDB ObjectId
  };

  const targetArray = currentTab === 'this' ? tasksThisWeek : tasksNextWeek;
  targetArray[dayIdx].push(newTask);
  renderWeek();

} catch (err) {
  alert('Error connecting to server.');
}


};

// Load tasks from DB
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
  target[task.day].push({ ...task, id: task._id }); // ✅ normalize _id → id
});

      renderWeek();
    } else {
      alert('Failed to load tasks from DB');
    }
  } catch (err) {
    console.error('Error fetching tasks:', err);
    alert('Server error while loading tasks.');
  }
}
//Toast Setup
function showToast(message) {
  const toast = document.querySelector('.toast');
  if (!toast) return;

  toast.innerHTML = `${message} <span onclick="this.parentElement.style.display='none'">&times;</span>`;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 2000);
}


// Tab switching
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
