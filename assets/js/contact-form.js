/* MeCollage Contact form（mailto，无后端，不存储数据）
 * - 渐进增强：无 JS 时 form action="mailto:" 仍可工作
 * - 提交：打开本机邮件客户端，预填 subject/body
 * - 复制邮箱：Clipboard API，失败时回退选中文本
 * - 无 alert；状态通过 aria-live 区域反馈
 */
(function () {
  'use strict';

  var EMAIL = 'contact@mecollage.top';
  var SUBJECT_PREFIX = '[MeCollage] ';

  function text(id) {
    var el = document.getElementById(id);
    return el ? el.textContent.trim() : '';
  }

  function buildMailto(name, email, topic, message) {
    var labels = {
      name: text('mc-label-name'),
      email: text('mc-label-email'),
      subject: text('mc-label-subject'),
      message: text('mc-label-message')
    };

    var body = (labels.name || 'Name') + ': ' + name + '\n' +
               (labels.email || 'Email') + ': ' + email + '\n' +
               (labels.subject || 'Topic') + ': ' + topic + '\n\n' +
               (labels.message || 'Message') + ':\n' + message;

    return 'mailto:' + EMAIL +
      '?subject=' + encodeURIComponent(SUBJECT_PREFIX + topic) +
      '&body=' + encodeURIComponent(body);
  }

  function init() {
    var form = document.getElementById('mc-contact-form');
    var copyBtn = document.getElementById('mc-copy-email');
    var status = document.getElementById('mc-contact-status');
    var directLink = document.getElementById('mc-contact-email-link');

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        var name = form.elements.namedItem('name').value.trim();
        var email = form.elements.namedItem('email').value.trim();
        var message = form.elements.namedItem('message').value.trim();
        var topicSelect = form.elements.namedItem('subject');
        var topic = topicSelect.options[topicSelect.selectedIndex].textContent.trim();

        if (status) status.textContent = text('mc-status-opening');
        window.location.href = buildMailto(name, email, topic, message);
      });

      // 输入后清掉旧状态，避免误导
      form.addEventListener('input', function () {
        if (status) status.textContent = '';
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var done = text('mc-status-copied');
        var failed = text('mc-status-copy-failed');

        function markOk() { if (status) status.textContent = done; }
        function markFail() {
          if (status) status.textContent = failed;
          if (directLink && window.getSelection) {
            var range = document.createRange();
            range.selectNodeContents(directLink);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }

        function fallbackCopy() {
          var ok = false;
          if (directLink && window.getSelection) {
            var range = document.createRange();
            range.selectNodeContents(directLink);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
          }
          if (ok) markOk(); else markFail();
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(EMAIL).then(markOk, fallbackCopy);
        } else {
          fallbackCopy();
        }
      });
    }
  }

  // 可测试/可复用的 mailto 构造（无后端；不存储数据）
  window.mcContactForm = { buildMailto: buildMailto };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
