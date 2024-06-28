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

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureVisibleTab") {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
            // Create an off-screen canvas
            const canvas = new OffscreenCanvas(request.area.width, request.area.height);
            const ctx = canvas.getContext('2d');
      
            // Create a blob from the dataUrl
            fetch(dataUrl)
              .then(res => res.blob())
              .then(blob => createImageBitmap(blob))
              .then(imageBitmap => {
                // Draw the portion of the image to the canvas
                ctx.drawImage(imageBitmap, 
                  request.area.x, request.area.y, request.area.width, request.area.height, 
                  0, 0, request.area.width, request.area.height);
                
                // Convert the canvas to a blob
                return canvas.convertToBlob();
              })
              .then(blob => {
                // Convert the blob to a data URL
                const reader = new FileReader();
                reader.onloadend = function() {
                  sendResponse({dataUrl: reader.result});
                }
                reader.readAsDataURL(blob);
              })
              .catch(error => {
                console.error('Error processing image:', error);
                sendResponse({error: 'Failed to process image'});
              });
        });
        return true;
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureBoundingBox") {
        chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
            // Create an off-screen canvas
            const canvas = new OffscreenCanvas(request.boundingBox.width, request.boundingBox.height);
            const ctx = canvas.getContext('2d');
      
            // Create a blob from the dataUrl
            fetch(dataUrl)
              .then(res => res.blob())
              .then(blob => createImageBitmap(blob))
              .then(imageBitmap => {
                // Draw the portion of the image to the canvas
                ctx.drawImage(imageBitmap, 
                  request.boundingBox.x, request.boundingBox.y, request.boundingBox.width, request.boundingBox.height, 
                  0, 0, request.boundingBox.width, request.boundingBox.height);
                
                // Convert the canvas to a blob
                return canvas.convertToBlob();
              })
              .then(blob => {
                // Convert the blob to a data URL
                const reader = new FileReader();
                reader.onloadend = function() {
                  chrome.tabs.sendMessage(sender.tab.id, {
                    action: "boundingBoxCaptured",
                    dataUrl: reader.result,
                    index: request.index
                  });
                }
                reader.readAsDataURL(blob);
              });
        });
        return true;  // Indicates that the response is sent asynchronously
    }
});