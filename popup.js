// popup.js
// popup.htmlのロジック

document.addEventListener('DOMContentLoaded', () => {
  const queueElem = document.getElementById('queue');
  const pauseBtn = document.getElementById('pause');
  const resumeBtn = document.getElementById('resume');
  const clearBtn = document.getElementById('clear');

  function renderQueue(queue, isDownloading) {
    queueElem.innerHTML = '';
    queue.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'collection-item';
      // 中身をflexで横並びに
      const rowDiv = document.createElement('div');
      rowDiv.style.display = 'flex';
      rowDiv.style.alignItems = 'center';
      rowDiv.style.justifyContent = 'space-between';

      // ファイル名
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.filename;
      nameSpan.style.flexGrow = 1; // ファイル名の表示幅を最大化
      rowDiv.appendChild(nameSpan);

      // ボタン類を横並び
      const btnGroup = document.createElement('span');
      btnGroup.style.display = 'flex';
      btnGroup.style.gap = '0px';
      btnGroup.style.marginLeft = 'auto';

      const upBtn = document.createElement('button');
      upBtn.className = 'btn-flat btn-small';
      upBtn.innerHTML = '<i class="material-icons">arrow_upward</i>';
      upBtn.onclick = () => moveInQueue(item.id, -1);
      upBtn.disabled = idx === 0;
      upBtn.style.minWidth = '24px';
      upBtn.style.padding = '0 4px';
      upBtn.style.margin = '0';
      btnGroup.appendChild(upBtn);

      const downBtn = document.createElement('button');
      downBtn.className = 'btn-flat btn-small';
      downBtn.innerHTML = '<i class="material-icons">arrow_downward</i>';
      downBtn.onclick = () => moveInQueue(item.id, 1);
      downBtn.disabled = idx === 0 || idx === queue.length - 1;
      downBtn.style.minWidth = '24px';
      downBtn.style.padding = '0 4px';
      downBtn.style.margin = '0';
      btnGroup.appendChild(downBtn);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-flat btn-small';
      delBtn.innerHTML = '<i class="material-icons">delete</i>';
      delBtn.onclick = () => removeFromQueue(item.id);
      delBtn.style.minWidth = '24px';
      delBtn.style.padding = '0 4px';
      delBtn.style.margin = '0';
      btnGroup.appendChild(delBtn);

      rowDiv.appendChild(btnGroup);
      li.appendChild(rowDiv);
      queueElem.appendChild(li);
    });
    pauseBtn.disabled = !isDownloading;
    resumeBtn.disabled = isDownloading;
  }

  let queueRetryCount = 0;
  function getQueue() {
    chrome.runtime.sendMessage({action: 'getQueue'}, (res) => {
      if (chrome.runtime.lastError) {
        // 最大3回までリトライ
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

  // 2秒ごとに自動でキュー再取得
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
  // popupが閉じられたらinterval解除
  window.addEventListener('unload', () => clearInterval(queueInterval));

  // サイドパネルで開くボタン
  const openSidePanelBtn = document.getElementById('open-sidepanel');
  if (openSidePanelBtn && chrome.sidePanel && chrome.sidePanel.open) {
    openSidePanelBtn.onclick = () => {
      chrome.sidePanel.open({windowId: chrome.windows.WINDOW_ID_CURRENT});
    };
  }
});
