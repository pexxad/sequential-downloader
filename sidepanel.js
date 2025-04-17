// sidepanel.js
// popup.jsとほぼ同じロジック

document.addEventListener('DOMContentLoaded', () => {
  const queueElem = document.getElementById('queue');
  const pauseBtn = document.getElementById('pause');
  const resumeBtn = document.getElementById('resume');
  const clearBtn = document.getElementById('clear');

  function renderQueue(queue, isDownloading) {
    queueElem.innerHTML = '';
    const emptyElem = document.getElementById('queue-empty');
    if (queue.length === 0) {
      emptyElem.style.display = '';
    } else {
      emptyElem.style.display = 'none';
    }
    queue.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'z-depth-1';
      li.style.listStyle = 'none';
      li.style.margin = '12px 0';
      li.style.borderRadius = '8px';
      li.style.background = idx === 0 && isDownloading ? '#e3f2fd' : '#fff';
      li.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
      li.style.padding = '12px 16px';
      li.style.display = 'flex';
      li.style.alignItems = 'center';

      // 状態アイコン
      const icon = document.createElement('i');
      icon.className = 'material-icons';
      icon.style.marginRight = '12px';
      if (idx === 0 && isDownloading) {
        icon.textContent = 'downloading';
        icon.style.color = '#1976d2';
        icon.title = 'ダウンロード中';
      } else {
        icon.textContent = 'schedule';
        icon.style.color = '#bbb';
        icon.title = '待機中';
      }
      li.appendChild(icon);

      // ファイル名
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.filename;
      nameSpan.style.flexGrow = 1;
      nameSpan.style.fontWeight = idx === 0 && isDownloading ? 'bold' : 'normal';
      li.appendChild(nameSpan);

      // ボタン群
      const btnGroup = document.createElement('span');
      btnGroup.style.display = 'flex';
      btnGroup.style.gap = '2px';
      btnGroup.style.marginLeft = 'auto';

      const upBtn = document.createElement('button');
      upBtn.className = 'btn-flat btn-small';
      upBtn.innerHTML = '<i class="material-icons">arrow_upward</i>';
      upBtn.onclick = () => moveInQueue(item.id, -1);
      upBtn.disabled = idx === 0;
      upBtn.title = '上へ移動';
      btnGroup.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.className = 'btn-flat btn-small';
      downBtn.innerHTML = '<i class="material-icons">arrow_downward</i>';
      downBtn.onclick = () => moveInQueue(item.id, 1);
      downBtn.disabled = idx === 0 || idx === queue.length - 1;
      downBtn.title = '下へ移動';
      btnGroup.appendChild(downBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-flat btn-small';
      delBtn.innerHTML = '<i class="material-icons">delete</i>';
      delBtn.onclick = () => removeFromQueue(item.id);
      delBtn.title = '削除';
      btnGroup.appendChild(delBtn);

      li.appendChild(btnGroup);
      queueElem.appendChild(li);
    });
    pauseBtn.disabled = !isDownloading;
    resumeBtn.disabled = isDownloading;
  }

  let queueRetryCount = 0;
  function getQueue() {
    chrome.runtime.sendMessage({action: 'getQueue'}, (res) => {
      if (chrome.runtime.lastError) {
        if (queueRetryCount < 3) {
          queueRetryCount++;
          setTimeout(getQueue, 300);
        } else {
          queueElem.innerHTML = '<li class="collection-item">キュー情報を取得できませんでした</li>';
        }
        return;
      }
      queueRetryCount = 0;
      renderQueue(res.queue, res.isDownloading);
    });
  }

  let queueInterval = setInterval(getQueue, 2000);

  function removeFromQueue(id) {
    chrome.runtime.sendMessage({action: 'removeFromQueue', id}, getQueue);
  }
  function moveInQueue(id, direction) {
    chrome.runtime.sendMessage({action: 'moveInQueue', id, direction}, getQueue);
  }
  pauseBtn.onclick = () => {
    chrome.runtime.sendMessage({action: 'pauseQueue'}, getQueue);
  };
  resumeBtn.onclick = () => {
    chrome.runtime.sendMessage({action: 'resumeQueue'}, getQueue);
  };
  clearBtn.onclick = () => {
    chrome.runtime.sendMessage({action: 'clearQueue'}, getQueue);
  };

  getQueue();
  window.addEventListener('unload', () => clearInterval(queueInterval));
});
