// background.js
// サービスワーカー：ダウンロードキューとコンテキストメニュー管理

let downloadQueue = [];
let isDownloading = false;
let downloadPath = '';
let queueLoaded = false;

// downloadQueueの永続化
function saveQueue() {
  chrome.storage.local.set({downloadQueue});
}
function loadQueue(callback) {
  chrome.storage.local.get(['downloadQueue'], (result) => {
    if (result.downloadQueue) downloadQueue = result.downloadQueue;
    queueLoaded = true;
    if (callback) callback();
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sequential-download",
    title: "ダウンロードキューに追加",
    contexts: ["link"]
  });
});

// 拡張機能ボタン押下時にサイドパネルを開く
chrome.action.onClicked.addListener((tab) => {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    chrome.sidePanel.open({windowId: tab.windowId});
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sequential-download") {
    chrome.tabs.sendMessage(tab.id, {
      action: "showDownloadInput",
      url: info.linkUrl,
      text: info.selectionText || info.linkText || ''
    });
  }
});

// メッセージ受信（popupやcontent scriptから）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 初回のみストレージから復元
  if (!queueLoaded) {
    loadQueue(() => {
      handleMessage(message, sender, sendResponse);
    });
    return true; // async response
  } else {
    return handleMessage(message, sender, sendResponse);
  }
});

function handleMessage(message, sender, sendResponse) {
  if (message.action === "moveInQueue") {
    const idx = downloadQueue.findIndex(item => item.id === message.id);
    if (idx !== -1) {
      const newIdx = idx + message.direction;
      if (newIdx >= 0 && newIdx < downloadQueue.length) {
        const tmp = downloadQueue[idx];
        downloadQueue[idx] = downloadQueue[newIdx];
        downloadQueue[newIdx] = tmp;
      }
    }
    saveQueue();
    sendResponse({status: 'moved'});
    chrome.action.setBadgeText({text: String(downloadQueue.length)});
    return;
  }
  if (message.action === "addToQueue") {
    // item.idがなければ生成
    if (!message.item.id) message.item.id = Date.now();
    downloadQueue.push(message.item);
    // isDownloadingがfalseなら開始
    if (!isDownloading) {
      isDownloading = true;
      processQueue();
    }
    saveQueue();
    sendResponse({status: 'queued'});
  } else if (message.action === "removeFromQueue") {
    // ダウンロード中の項目が削除された場合は一時停止
    if (downloadQueue.length > 0 && downloadQueue[0].id === message.id) {
      downloadQueue = downloadQueue.filter(item => item.id !== message.id);
      isDownloading = false;
    } else {
      downloadQueue = downloadQueue.filter(item => item.id !== message.id);
    }
    saveQueue();
    sendResponse({status: 'removed'});
  } else if (message.action === "getQueue") {
    sendResponse({queue: downloadQueue, isDownloading});
  } else if (message.action === "pauseQueue") {
    isDownloading = false;
    sendResponse({status: 'paused'});
  } else if (message.action === "resumeQueue") {
    isDownloading = true;
    processQueue();
    sendResponse({status: 'resumed'});
  } else if (message.action === "clearQueue") {
    downloadQueue = [];
    isDownloading = false;
    saveQueue();
    sendResponse({status: 'cleared'});
  }
  // バッジ更新
  chrome.action.setBadgeText({text: String(downloadQueue.length)});
};

function processQueue() {
  console.log('processQueue called', {isDownloading, queue: downloadQueue});
  if (!isDownloading || downloadQueue.length === 0) {
    isDownloading = false;
    return;
  }
  isDownloading = true;
  const item = downloadQueue[0];
  chrome.downloads.download({
    url: item.url,
    filename: item.filename,
    saveAs: false
  }, (downloadId) => {
    if (!downloadId) {
      // エラー時はキューから削除して次へ
      downloadQueue.shift();
      saveQueue();
      processQueue();
      return;
    }
    // ダウンロード完了・キャンセル監視
    const onChanged = function(delta) {
      if (delta.id === downloadId && (delta.state && (delta.state.current === "complete" || delta.state.current === "interrupted"))) {
        chrome.downloads.onChanged.removeListener(onChanged);
        downloadQueue.shift();
        saveQueue();
        processQueue();
      }
    };
    chrome.downloads.onChanged.addListener(onChanged);
  });
}
