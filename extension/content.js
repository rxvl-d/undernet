chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startDrawingMode") {
        startDrawingMode(sendResponse);
    } else if (request.action === "stopDrawingMode") {
        stopDrawingMode();
    }
    return true;
});

let overlay, boundingBoxes = [];

function startDrawingMode(sendResponse) {
    overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '10000';
    document.body.appendChild(overlay);

    let startX, startY, endX, endY;
    let drawing = false;

    overlay.addEventListener('mousedown', startDrawing);
    overlay.addEventListener('mousemove', draw);
    overlay.addEventListener('mouseup', endDrawing);

    function startDrawing(e) {
        drawing = true;
        startX = e.clientX;
        startY = e.clientY;
    }

    function draw(e) {
        if (!drawing) return;
        endX = e.clientX;
        endY = e.clientY;
        drawRect();
    }

    function endDrawing() {
        drawing = false;
        const boundingBox = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY)
        };
        boundingBoxes.push({ box: boundingBox });
        chrome.runtime.sendMessage({
            action: "captureBoundingBox",
            boundingBox: boundingBox,
            index: boundingBoxes.length - 1
        });
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.action === "boundingBoxCaptured") {
                boundingBoxes[request.index].image = request.dataUrl;
                chrome.runtime.sendMessage({
                    action: "updateBoundingBoxes",
                    boundingBoxes: boundingBoxes
                });
            }
        });
    }

    function drawRect() {
        const rect = document.createElement('div');
        rect.style.position = 'absolute';
        rect.style.left = `${Math.min(startX, endX)}px`;
        rect.style.top = `${Math.min(startY, endY)}px`;
        rect.style.width = `${Math.abs(endX - startX)}px`;
        rect.style.height = `${Math.abs(endY - startY)}px`;
        rect.style.border = '2px solid red';
        overlay.innerHTML = '';
        overlay.appendChild(rect);
    }
}

function stopDrawingMode() {
    if (overlay) {
        document.body.removeChild(overlay);
        overlay = null;
    }
    boundingBoxes = [];
}

function captureScreenshot(boundingBox, callback) {
    chrome.runtime.sendMessage({
        action: "captureVisibleTab",
        area: boundingBox
    }, function(response) {
        callback(response.dataUrl);
    });
}