chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 400,
      height: 600
    });
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateTab") {
      chrome.tabs.update(request.tabId, { url: request.url }, () => {
        sendResponse({ success: true });
      });
      return true;  // Indicates that the response is sent asynchronously
    }
  });