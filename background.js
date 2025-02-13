chrome.runtime.onInstalled.addListener(() => {
    console.log("🚀 Dify Wisdom 插件已安装！");
});

// **监听快捷键触发**
chrome.commands.onCommand.addListener((command) => {
    console.log(`🎯 快捷键触发：${command}`);

    if (command === "save_page") {
        saveContent("page");
    } else if (command === "save_selection") {
        saveContent("selection");
    }
});

// **保存网页或选中文本到知识库**
function saveContent(contentType) {
    chrome.storage.sync.get(["serverUrl", "apiKey", "defaultDataset"], (settings) => {
        if (!settings.serverUrl || !settings.apiKey || !settings.defaultDataset) {
            console.error("❌ 服务器地址或 API Key 未设置！");
            showToast("❌ 请先配置 API Key 和服务器地址！");
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.warn("⚠️ 未找到活动页面");
                return;
            }

            const tab = tabs[0];

            if (contentType === "selection") {
                console.log("🔍 获取选中的文本...");
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tab.id },
                        function: () => window.getSelection().toString()
                    },
                    (results) => {
                        if (results && results[0] && results[0].result) {
                            const selectedText = results[0].result.trim();
                            if (selectedText) {
                                console.log("✏️ 选中的文本:", selectedText);
                                sendToKnowledgeBase(tab.title, selectedText, settings);
                            } else {
                                showToast("⚠️ 请先选中文本后再尝试保存！");
                            }
                        } else {
                            console.warn("❌ 获取选中文本失败");
                        }
                    }
                );
            } else {
                console.log("📖 获取整个页面文本...");
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tab.id },
                        function: () => document.body.innerText.trim()
                    },
                    (results) => {
                        if (results && results[0] && results[0].result) {
                            const pageText = results[0].result;
                            console.log("📖 获取的网页文本:", pageText.substring(0, 200), "...(后续省略)");
                            sendToKnowledgeBase(tab.title, pageText, settings);
                        } else {
                            showToast("⚠️ 无法获取网页文本！");
                        }
                    }
                );
            }
        });
    });
}

// **发送内容到知识库**
function sendToKnowledgeBase(title, text, settings) {
    console.log("🚀 准备上传内容到知识库...");
    const requestUrl = `${settings.serverUrl}/datasets/${settings.defaultDataset}/document/create-by-text`;
    const requestBody = {
        name: title,
        text: text,
        indexing_technique: "high_quality",
        process_rule: { mode: "automatic" }
    };

    console.log("📡 发送 API 请求:", requestUrl);
    console.log("📦 请求内容:", JSON.stringify(requestBody));

    fetch(requestUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    })
    .then(async (response) => {
        const responseData = await response.json();
        console.log("📩 API 响应数据:", responseData);

        if (response.ok) {
            console.log("✅ 内容保存成功:", responseData);
            showToast("✅ 内容已成功保存到知识库！");
        } else {
            console.error("❌ API 请求失败:", responseData);
            showToast(`❌ 保存失败: ${responseData.message || "请检查 API 配置"}`);
        }
    })
    .catch(err => {
        console.error("🚨 网络请求异常:", err);
        showToast("❌ 网络错误，请检查您的服务器连接！");
    });
}

// **桌面通知**
function showToast(message) {
    console.log("🔔 发送桌面通知:", message);
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-128.png",
        title: "Dify Wisdom",
        message: message
    }, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error("⚠️ 通知创建失败:", chrome.runtime.lastError);
        } else {
            console.log("📢 通知 ID:", notificationId);
        }
    });
}