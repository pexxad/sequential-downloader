// content.js
// ハイパーリンク右クリック時に入力フォームを表示する

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showDownloadInput") {
    showDownloadInput(message.url, message.text);
  }
});

function showDownloadInput(url, text) {
  // 既存フォームがあれば削除
  const old = document.getElementById('sequential-dl-form');
  if (old) old.remove();

  const form = document.createElement('form');
  form.id = 'sequential-dl-form';
  form.style.position = 'fixed';
  form.style.top = '20%';
  form.style.left = '50%';
  form.style.transform = 'translate(-50%, 0)';
  form.style.background = '#f6f8fa';
  form.style.color = '#222';
  form.style.padding = '16px';
  form.style.zIndex = 9999;
  form.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  form.style.borderRadius = '10px';
  form.style.border = '1px solid #d0d7de';
  form.innerHTML = `
    <div style="margin-bottom:8px;">URL: <input id="dl-url" type="text" value="${url}" style="width:90%;background:#fff;color:#222;border:1px solid #ccc;border-radius:4px;padding:4px;"></div>
    <div style="margin-bottom:8px;">ファイル名: <input id="dl-filename" type="text" value="${text || ''}" style="width:90%;background:#fff;color:#222;border:1px solid #ccc;border-radius:4px;padding:4px;"></div>

    <button type="submit" style="background:#1976d2;color:#fff;border:none;border-radius:4px;padding:8px 20px;margin-right:8px;box-shadow:0 1px 4px rgba(0,0,0,0.08);font-size:1rem;cursor:pointer;">キューに追加</button>
    <button type="button" id="dl-cancel" style="background:#f1f3f4;color:#222;border:1px solid #bbb;border-radius:4px;padding:8px 18px;box-shadow:0 1px 4px rgba(0,0,0,0.05);font-size:1rem;cursor:pointer;">キャンセル</button>
  `;
  document.body.appendChild(form);


  form.onsubmit = (e) => {
    e.preventDefault();
    const item = {
      id: Date.now(),
      url: form.querySelector('#dl-url').value,
      filename: form.querySelector('#dl-filename').value,

    };

    chrome.runtime.sendMessage({action: 'addToQueue', item}, () => {
      form.remove();
    });
  };
  document.getElementById('dl-cancel').onclick = () => form.remove();
}
