var currentEditingId = null;

function renderAdminStatus(message, type) {
  var listContainer = document.getElementById('admin-post-list');
  if (!listContainer) return;
  var className = type === 'error' ? 'admin-error' : 'admin-placeholder';
  listContainer.innerHTML = '<p class="' + className + '">' + message + '</p>';
}

async function loadPosts() {
  var listContainer = document.getElementById('admin-post-list');
  if (!listContainer) return;
  renderAdminStatus('正在从服务器获取文章...');

  try {
    var res = await fetch(CONFIG.POSTS_URL);
    if (!res.ok) throw new Error('HTTP错误: ' + res.status);

    var posts = await res.json();
    if (posts.length === 0) {
      renderAdminStatus('暂无文章，快去发布一篇吧！');
      return;
    }

    listContainer.innerHTML = posts
      .map(function (post) {
        return (
          '<div class="admin-post-card">' +
          '  <div class="admin-post-summary">' +
          '    <div class="admin-post-title">' + escapeHtml(post.title) + '</div>' +
          '    <div class="admin-post-meta">📅 ' +
          escapeHtml(post.date.substring(0, 10)) +
          ' | 🏷️ ' +
          escapeHtml(post.tags || '无标签') +
          '</div>' +
          '  </div>' +
          '  <div class="admin-post-actions">' +
          '    <button type="button" class="admin-action-btn admin-action-btn--edit" data-action="edit" data-id="' +
          escapeHtml(post.id) +
          '">✎ 修改</button>' +
          '    <button type="button" class="admin-action-btn admin-action-btn--delete" data-action="delete" data-id="' +
          escapeHtml(post.id) +
          '">🗑️ 删除</button>' +
          '  </div>' +
          '</div>'
        );
      })
      .join('');
  } catch (err) {
    console.error('加载列表失败详情:', err);
    renderAdminStatus('加载失败: ' + err.message + '<br>请按 F12 查看控制台 Console', 'error');
  }
}

function safeResetForm() {
  currentEditingId = null;
  var btn = document.getElementById('publish-button');
  if (btn) btn.innerText = '立即发布到服务器';
  document.querySelectorAll('input:not([type="button"])').forEach(function (input) {
    if (input.type !== 'button') input.value = '';
  });
  document.querySelectorAll('textarea').forEach(function (area) {
    area.value = '';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function publishPost() {
  var getVal = function (id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  };
  var title = getVal('title');
  var tags = getVal('tags');
  var cover = getVal('cover');
  var token = getVal('admin-token');
  var content = getVal('markdown-editor');

  if (!title) { showToast('标题不能为空！'); return; }
  if (!token) { showToast('请输入口令！'); return; }

  var data = { title: title, tags: tags, cover: cover, content: content, token: token };
  var url = CONFIG.POSTS_URL;
  var method = 'POST';
  if (currentEditingId) {
    url = CONFIG.POSTS_URL + '/' + currentEditingId;
    method = 'PUT';
  }

  try {
    var res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    var text = await res.text();
    if (res.ok) {
      showToast(currentEditingId ? '✅ 修改成功！' : '🎉 发布成功！');
      await loadPosts();
      safeResetForm();
    } else {
      showToast('❌ 操作失败: ' + text);
    }
  } catch (err) {
    console.error(err);
    showToast('❌ 网络错误或代码报错: ' + err.message);
  }
}

window.editPost = async function (id) {
  var token = document.getElementById('admin-token').value;
  if (!token) { showToast('⚠️ 请先在底部输入口令，再点击修改！'); return; }

  try {
    var res = await fetch(CONFIG.POSTS_URL + '/' + id);
    var post = await res.json();
    var setVal = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('title', post.title);
    setVal('tags', post.tags);
    setVal('cover', post.cover);
    var area = document.getElementById('markdown-editor');
    if (area) area.value = post.content;
    currentEditingId = id;
    var btn = document.getElementById('publish-button');
    if (btn) btn.innerText = '💾 保存修改 (ID: ' + post.id + ')';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    showToast('无法获取文章详情: ' + err.message);
  }
};

window.deletePost = async function (id) {
  var token = document.getElementById('admin-token').value;
  if (!token) { showToast('⚠️ 请先在底部输入口令，再点击删除！'); return; }
  if (!confirm('🗑️ 确定要彻底删除这篇文章吗？')) return;
  try {
    var res = await fetch(CONFIG.POSTS_URL + '/' + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token }),
    });
    if (res.ok) {
      showToast('已删除！');
      loadPosts();
    } else {
      showToast('删除失败: ' + await res.text());
    }
  } catch (err) {
    showToast('网络错误');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  var adminForm = document.getElementById('admin-form');
  if (adminForm) {
    adminForm.addEventListener('submit', function (event) {
      event.preventDefault();
      publishPost();
    });
  }

  var adminList = document.getElementById('admin-post-list');
  if (adminList) {
    adminList.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-action]');
      if (!button) return;
      var id = button.dataset.id;
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
