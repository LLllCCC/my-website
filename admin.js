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

  var commentList = document.getElementById("admin-comment-list");
  var commentFilter = document.getElementById("admin-comment-filter");
  var commentCount = document.getElementById("admin-comment-count");
  var commentStatus = document.getElementById("admin-comment-status");
  var commentLabels = { pending: "待审核", approved: "已显示", rejected: "已拒绝" };

  function formatCommentTime(value) {
    if (!value) return "";
    var date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    function pad(part) { return String(part).padStart(2, "0"); }
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
      " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function renderComments(comments) {
    commentList.replaceChildren();
    commentCount.textContent = String(comments.length).padStart(2, "0");
    if (!comments.length) {
      var empty = document.createElement("p");
      empty.className = "admin-list-placeholder";
      empty.textContent = commentFilter.value === "pending" ? "没有待审核的评论。" : "这个状态下还没有评论。";
      commentList.appendChild(empty);
      return;
    }

    comments.forEach(function (comment) {
      var item = document.createElement("article");
      item.className = "admin-comment-item" + (comment.status === "pending" ? " is-pending" : "");

      var main = document.createElement("div");
      main.className = "admin-comment-main";

      var head = document.createElement("div");
      head.className = "admin-comment-head";
      var name = document.createElement("span");
      name.className = "admin-comment-name";
      name.textContent = comment.nickname || "匿名访客";
      var time = document.createElement("span");
      time.className = "admin-comment-time";
      time.textContent = formatCommentTime(comment.created_at);
      var badge = document.createElement("span");
      badge.className = "admin-comment-badge is-" + comment.status;
      badge.textContent = commentLabels[comment.status] || comment.status;
      head.append(name, time, badge);

      var body = document.createElement("p");
      body.className = "admin-comment-body";
      body.textContent = comment.content || "";

      var source = document.createElement("p");
      source.className = "admin-comment-source";
      if (comment.post_id) {
        var link = document.createElement("a");
        link.href = "post.html?id=" + encodeURIComponent(String(comment.post_id));
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = comment.post_title || "文章 #" + comment.post_id;
        source.appendChild(link);
      } else {
        source.textContent = "来源文章已删除";
      }

      main.append(head, body, source);

      var actions = document.createElement("div");
      actions.className = "admin-comment-actions";
      function action(label, className, handler) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = label;
        button.addEventListener("click", handler);
        actions.appendChild(button);
      }
      if (comment.status !== "approved") {
        action("通过", "admin-action-button", function () { reviewComment(comment.id, "approved"); });
      }
      if (comment.status !== "rejected") {
        action("拒绝", "admin-action-button", function () { reviewComment(comment.id, "rejected"); });
      }
      action("删除", "admin-action-button admin-action-button--danger", function () { removeComment(comment); });

      item.append(main, actions);
      commentList.appendChild(item);
    });
  }

  async function loadComments() {
    commentList.innerHTML = '<p class="admin-list-placeholder">正在读取评论…</p>';
    try {
      var query = commentFilter.value === "all" ? "" : "?status=" + encodeURIComponent(commentFilter.value);
      var comments = await apiRequest("/admin/comments" + query);
      renderComments(Array.isArray(comments) ? comments : []);
    } catch (error) {
      commentList.replaceChildren();
      var message = document.createElement("p");
      message.className = "admin-list-placeholder is-error";
      message.textContent = error.status === 401 ? "令牌已失效，请退出后重新验证。" : "评论读取失败，请检查 API 服务与评论数据表。";
      commentList.appendChild(message);
      if (error.status === 401) lockWorkspace();
    }
  }

  async function reviewComment(id, status) {
    setStatus(commentStatus, "正在处理…", false);
    try {
      await apiRequest("/admin/comments/" + encodeURIComponent(String(id)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status }),
      });
      setStatus(commentStatus, status === "approved" ? "评论已通过，会显示在文章页。" : "评论已拒绝。", false);
      await loadComments();
    } catch (error) {
      setStatus(commentStatus, error.status === 401 ? "令牌无效，请重新验证。" : "操作失败，请检查 API 服务。", true);
    }
  }

  async function removeComment(comment) {
    if (!window.confirm("确定删除这条评论吗？此操作无法撤销。")) return;
    try {
      await apiRequest("/admin/comments/" + encodeURIComponent(String(comment.id)), { method: "DELETE" });
      setStatus(commentStatus, "评论已删除。", false);
      await loadComments();
    } catch (error) {
      setStatus(commentStatus, error.status === 401 ? "令牌无效，请重新验证。" : "删除失败，请检查 API 服务。", true);
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
    loadComments();
  }

  function lockWorkspace() {
    token = "";
    workspace.hidden = true;
    authSection.hidden = false;
    resetEditor();
    commentList.innerHTML = '<p class="admin-list-placeholder">登录后显示评论。</p>';
    commentCount.textContent = "—";
    setStatus(commentStatus, "", false);
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
  commentFilter.addEventListener("change", loadComments);
  document.getElementById("admin-comments-refresh").addEventListener("click", loadComments);
});
