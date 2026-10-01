document.addEventListener("DOMContentLoaded", function () {
  var token = "";
  var editingId = null;
  var authForm = document.getElementById("admin-auth-form");
  var tokenInput = document.getElementById("admin-token");
  var authSection = document.getElementById("admin-auth");
  var workspace = document.getElementById("admin-workspace");
  var authStatus = document.getElementById("admin-auth-status");
  var formStatus = document.getElementById("admin-form-status");
  var form = document.getElementById("admin-post-form");
  var list = document.getElementById("admin-post-list");
  var saveButton = document.getElementById("admin-save");
  var charCount = document.getElementById("admin-char-count");

  function setStatus(element, message, isError) {
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("is-error", Boolean(isError));
    element.classList.toggle("is-success", Boolean(message) && !isError);
  }

  async function apiRequest(path, options) {
    var requestOptions = Object.assign({ cache: "no-store" }, options || {});
    requestOptions.headers = Object.assign({ Accept: "application/json" }, requestOptions.headers || {});
    if (token) requestOptions.headers.Authorization = "Bearer " + token;
    var response = await fetch(CONFIG.API_BASE + path, requestOptions);
    var result = {};
    try { result = await response.json(); } catch (_) { /* API may return an empty response */ }
    if (!response.ok) {
      var error = new Error(result.error || "请求失败（HTTP " + response.status + "）");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function formValue(id) {
    var field = document.getElementById(id);
    return field ? field.value.trim() : "";
  }

  function resetEditor() {
    editingId = null;
    form.reset();
    document.getElementById("admin-editor-mode").textContent = "NEW ENTRY";
    document.getElementById("admin-editor-title").textContent = "写一篇新文章";
    saveButton.innerHTML = '发布文章 <span aria-hidden="true">↗</span>';
    document.getElementById("admin-cancel-edit").hidden = true;
    charCount.textContent = "0 字符";
    setStatus(formStatus, "", false);
  }

  function renderPosts(posts) {
    list.replaceChildren();
    document.getElementById("admin-post-count").textContent = String(posts.length).padStart(2, "0");
    if (!posts.length) {
      var empty = document.createElement("p");
      empty.className = "admin-list-placeholder";
      empty.textContent = "还没有文章，写下第一篇吧。";
      list.appendChild(empty);
      return;
    }

    posts.forEach(function (post) {
      var item = document.createElement("article");
      item.className = "admin-post-item";
      var info = document.createElement("div");
      info.className = "admin-post-info";
      var title = document.createElement("h4");
      title.textContent = post.title || "未命名文章";
      var meta = document.createElement("p");
      var date = typeof post.date === "string" ? post.date.substring(0, 10) : "日期未知";
      meta.textContent = date + " · " + (post.tags || "无标签");
      info.append(title, meta);

      var actions = document.createElement("div");
      actions.className = "admin-post-actions";
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "admin-action-button";
      edit.textContent = "编辑";
      edit.setAttribute("aria-label", "编辑：" + (post.title || "未命名文章"));
      edit.addEventListener("click", function () { editPost(post.id); });
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "admin-action-button admin-action-button--danger";
      remove.textContent = "删除";
      remove.setAttribute("aria-label", "删除：" + (post.title || "未命名文章"));
      remove.addEventListener("click", function () { deletePost(post); });
      actions.append(edit, remove);

      item.append(info, actions);
      list.appendChild(item);
    });
  }

  async function loadPosts() {
    list.innerHTML = '<p class="admin-list-placeholder">正在读取文章…</p>';
    try {
      var posts = await apiRequest("/posts");
      renderPosts(Array.isArray(posts) ? posts : []);
    } catch (error) {
      list.replaceChildren();
      var message = document.createElement("p");
      message.className = "admin-list-placeholder is-error";
      message.textContent = error.status === 401 ? "令牌已失效，请退出后重新验证。" : "文章列表读取失败，请检查 API 服务。";
      list.appendChild(message);
      if (error.status === 401) lockWorkspace();
    }
  }

  async function editPost(id) {
    setStatus(formStatus, "正在载入文章…", false);
    try {
      var post = await apiRequest("/posts/" + encodeURIComponent(String(id)));
      editingId = post.id;
      document.getElementById("post-title").value = post.title || "";
      document.getElementById("post-tags").value = post.tags || "";
      document.getElementById("post-cover").value = post.cover || "";
      document.getElementById("post-content").value = post.content || "";
      document.getElementById("admin-editor-mode").textContent = "EDITING · ID " + post.id;
      document.getElementById("admin-editor-title").textContent = "修改文章";
      saveButton.innerHTML = '保存修改 <span aria-hidden="true">↗</span>';
      document.getElementById("admin-cancel-edit").hidden = false;
      updateCharacterCount();
      setStatus(formStatus, "文章已载入，可以开始编辑。", false);
      document.getElementById("post-title").focus();
    } catch (_) {
      setStatus(formStatus, "文章载入失败，请稍后重试。", true);
    }
  }

  async function deletePost(post) {
    if (!window.confirm('确定删除《' + (post.title || "未命名文章") + '》吗？此操作无法撤销。')) return;
    try {
      await apiRequest("/posts/" + encodeURIComponent(String(post.id)), { method: "DELETE" });
      if (String(editingId) === String(post.id)) resetEditor();
      await loadPosts();
      setStatus(formStatus, "文章已删除。", false);
    } catch (error) {
      setStatus(formStatus, error.status === 401 ? "令牌无效，请重新验证。" : "删除失败，请检查 API 服务。", true);
    }
  }

  function unlockWorkspace(value) {
    token = value;
    authSection.hidden = true;
    workspace.hidden = false;
    tokenInput.value = "";
    setStatus(authStatus, "", false);
    loadPosts();
  }

  function lockWorkspace() {
    token = "";
    workspace.hidden = true;
    authSection.hidden = false;
    resetEditor();
    tokenInput.focus();
  }

  authForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var candidate = tokenInput.value;
    if (!candidate) return;
    var button = authForm.querySelector("button[type=submit]");
    button.disabled = true;
    setStatus(authStatus, "正在验证令牌…", false);
    try {
      var response = await fetch(CONFIG.API_BASE + "/admin/session", {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: "Bearer " + candidate, Accept: "application/json" },
      });
      if (!response.ok) throw new Error(response.status === 401 ? "令牌不正确。" : "验证失败（HTTP " + response.status + "）。");
      unlockWorkspace(candidate);
    } catch (error) {
      setStatus(authStatus, error.message || "无法连接 API，请检查网络。", true);
    } finally {
      button.disabled = false;
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var title = formValue("post-title");
    var content = document.getElementById("post-content").value;
    if (!title || !content.trim()) {
      setStatus(formStatus, "标题和正文都需要填写。", true);
      return;
    }

    var payload = {
      title: title,
      tags: formValue("post-tags"),
      cover: formValue("post-cover"),
      content: content,
    };
    var wasEditing = editingId !== null;
    saveButton.disabled = true;
    setStatus(formStatus, "正在保存…", false);
    try {
      await apiRequest(editingId ? "/posts/" + editingId : "/posts", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      resetEditor();
      setStatus(formStatus, wasEditing ? "文章已更新。" : "文章已发布。", false);
      await loadPosts();
    } catch (error) {
      setStatus(formStatus, error.status === 401 ? "令牌无效，请重新验证。" : "保存失败：" + error.message, true);
    } finally {
      saveButton.disabled = false;
    }
  });

  function updateCharacterCount() {
    charCount.textContent = document.getElementById("post-content").value.length.toLocaleString("zh-CN") + " 字符";
  }

  document.getElementById("post-content").addEventListener("input", updateCharacterCount);
  document.getElementById("admin-reset").addEventListener("click", resetEditor);
  document.getElementById("admin-cancel-edit").addEventListener("click", resetEditor);
  document.getElementById("admin-lock").addEventListener("click", lockWorkspace);
});
