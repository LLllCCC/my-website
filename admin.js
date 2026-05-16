const API_URL = 'https://yopoo.888431.xyz/api/posts';
let currentEditingId = null;

function renderAdminStatus(message, type = 'placeholder') {
  const listContainer = document.getElementById('admin-post-list');
  if (!listContainer) return;
  const className = type === 'error' ? 'admin-error' : 'admin-placeholder';
  listContainer.innerHTML = `<p class="${className}">${message}</p>`;
}

async function loadPosts() {
  const listContainer = document.getElementById('admin-post-list');
  if (!listContainer) return;
  renderAdminStatus('正在从服务器获取文章...');

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP错误: ${res.status}`);

    const posts = await res.json();
    if (posts.length === 0) {
      renderAdminStatus('暂无文章，快去发布一篇吧！');
      return;
    }

    listContainer.innerHTML = posts
      .map(
        (post) => `
          <div class="admin-post-card">
              <div class="admin-post-summary">
                  <div class="admin-post-title">${post.title}</div>
                  <div class="admin-post-meta">📅 ${post.date.substring(0, 10)} | 🏷️ ${post.tags || '无标签'}</div>
              </div>
              <div class="admin-post-actions">
                  <button type="button" class="admin-action-btn admin-action-btn--edit" data-action="edit" data-id="${post.id}">✎ 修改</button>
                  <button type="button" class="admin-action-btn admin-action-btn--delete" data-action="delete" data-id="${post.id}">🗑️ 删除</button>
              </div>
          </div>
      `,
      )
      .join('');
  } catch (err) {
    console.error('加载列表失败详情:', err);
    renderAdminStatus(`加载失败: ${err.message}<br>请按 F12 查看控制台 Console`, 'error');
  }
}

function safeResetForm() {
  currentEditingId = null;
  const btn = document.getElementById('publish-button');
  if (btn) btn.innerText = '立即发布到服务器';
  document.querySelectorAll('input:not([type="button"])').forEach((input) => {
    if (input.type !== 'button') input.value = '';
  });
  document.querySelectorAll('textarea').forEach((area) => {
    area.value = '';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function publishPost() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };
  const title = getVal('title');
  const tags = getVal('tags');
  const cover = getVal('cover');
  const token = getVal('admin-token');
  const content = getVal('markdown-editor');

  if (!title) return alert('标题不能为空！');
  if (!token) return alert('请输入口令！');

  const data = { title, tags, cover, content, token };
  let url = API_URL;
  let method = 'POST';
  if (currentEditingId) {
    url = `${API_URL}/${currentEditingId}`;
    method = 'PUT';
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const text = await res.text();
    if (res.ok) {
      alert(currentEditingId ? '✅ 修改成功！' : '🎉 发布成功！');
      await loadPosts();
      safeResetForm();
    } else {
      alert('❌ 操作失败: ' + text);
    }
  } catch (err) {
    console.error(err);
    alert('❌ 网络错误或代码报错: ' + err.message);
  }
}

window.editPost = async function (id) {
  const token = document.getElementById('admin-token').value;
  if (!token) return alert('⚠️ 请先在底部输入口令，再点击修改！');

  try {
    const res = await fetch(`${API_URL}/${id}`);
    const post = await res.json();
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('title', post.title);
    setVal('tags', post.tags);
    setVal('cover', post.cover);
    const area = document.getElementById('markdown-editor');
    if (area) area.value = post.content;
    currentEditingId = id;
    const btn = document.getElementById('publish-button');
    if (btn) btn.innerText = `💾 保存修改 (ID: ${post.id})`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    alert('无法获取文章详情: ' + err.message);
  }
};

window.deletePost = async function (id) {
  const token = document.getElementById('admin-token').value;
  if (!token) return alert('⚠️ 请先在底部输入口令，再点击删除！');
  if (!confirm('🗑️ 确定要彻底删除这篇文章吗？')) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      alert('已删除！');
      loadPosts();
    } else {
      alert('删除失败: ' + await res.text());
    }
  } catch (err) {
    alert('网络错误');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  const adminForm = document.getElementById('admin-form');
  if (adminForm) {
    adminForm.addEventListener('submit', (event) => {
      event.preventDefault();
      publishPost();
    });
  }

  const adminList = document.getElementById('admin-post-list');
  if (adminList) {
    adminList.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const id = button.dataset.id;
      if (!id) return;
      if (button.dataset.action === 'edit') {
        editPost(id);
      } else if (button.dataset.action === 'delete') {
        deletePost(id);
      }
    });
  }

  loadPosts();
});