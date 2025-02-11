document.addEventListener("mouseup", () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
        chrome.runtime.sendMessage({ action: "selectedText", text: selectedText });
    }
});