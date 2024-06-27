chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "drawBoundingBox") {
        console.log('here')
        // Create a div for the overlay
        const overlay = document.createElement('div');
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
            document.body.removeChild(overlay);
            sendResponse({boundingBox: boundingBox}); // Send the bounding box back to the popup
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
        return true; // Indicates that the response will be sent asynchronously
    }
});