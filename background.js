chrome.runtime.onInstalled.addListener(() => {
    console.log("Dify Wisdom 插件已安装！");
});

// **监听快捷键触发**
chrome.commands.onCommand.addListener((command) => {
    console.log(`快捷键触发：${command}`);

    if (command === "save_page") {
        saveContent("page");
    } else if (command === "save_selection") {
        saveContent("selection");
    }
});

// **监听存储变化，动态更新快捷键**
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
        if (changes.shortcutSavePage || changes.shortcutSaveSelection) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon-128.png",
                title: "快捷键更新提示",
                message: "快捷键已更新，请在 chrome://extensions/shortcuts 手动更新快捷键。"
            });

            console.log("快捷键设置已更新，但 Chrome 需要用户手动更新快捷键！");
        }
    }
});
// **保存网页或选中文本到知识库**
function saveContent(contentType) {
    chrome.storage.sync.get(["serverUrl", "apiKey", "defaultDataset"], (settings) => {
        if (!settings.serverUrl || !settings.apiKey || !settings.defaultDataset) {
            console.error("服务器地址或 API Key 未设置！");
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            const tab = tabs[0];

            if (contentType === "selection") {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tab.id },
                        function: () => window.getSelection().toString()
                    },
                    (results) => {
                        if (results && results[0] && results[0].result) {
                            const selectedText = results[0].result.trim();
                            sendToKnowledgeBase(tab.title, selectedText, settings);
                        }
                    }
                );
            } else {
                sendToKnowledgeBase(tab.title, "整页内容", settings);
            }
        });
    });
}

// **发送内容到知识库**
function sendToKnowledgeBase(title, text, settings) {
    fetch(`${settings.serverUrl}/datasets/${settings.defaultDataset}/document/create-by-text`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: title,
            text: text,
            indexing_technique: "high_quality",
            process_rule: { mode: "automatic" }
        })
    })
    .then(response => {
        if (response.ok) {
            showToast("✅ 内容保存成功！");
        } else {
            showToast("❌ 保存失败，请检查配置！");
        }
    })
    .catch(err => {
        showToast("❌ 网络错误，请检查配置！");
        console.error(err);
    });
}

// **桌面通知**
function showToast(message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-128.png",
        title: "Dify Wisdom",
        message: message
    });
}