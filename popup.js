document.addEventListener("DOMContentLoaded", () => {
    const knowledgeBaseSelect = document.getElementById("knowledgeBaseSelect");
    const savePageButton = document.getElementById("savePageButton");
    const saveSelectionButton = document.getElementById("saveSelectionButton");
    const openSettingsButton = document.getElementById("openSettingsButton");
    const selectedTextArea = document.getElementById("selectedText");

    console.log("📌 Popup 页面已加载，开始初始化...");

    // **确保按钮点击触发**
    savePageButton.addEventListener("click", () => {
        console.log("🚀 点击保存整个页面");
        saveFullPageContent();
    });

    saveSelectionButton.addEventListener("click", () => {
        console.log("🚀 点击保存选中文字");
        saveContent("selection");
    });

    openSettingsButton.addEventListener("click", () => {
        console.log("⚙️ 打开设置页面");
        chrome.runtime.openOptionsPage();
    });

    // **获取选中的文本**
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
            console.error("❌ 未找到活动页面，无法获取选中文本");
            return;
        }

        console.log("🔍 发现当前活动页面:", tabs[0].title);

        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => window.getSelection().toString()
        }, (results) => {
            if (results && results[0] && results[0].result) {
                const selectedText = results[0].result.trim();
                selectedTextArea.value = selectedText || "请在网页上选中文字...";
                console.log("✅ 选中文本:", selectedText);
            } else {
                console.warn("⚠️ 没有检测到选中的文本");
            }
        });
    });

    // **加载知识库列表**
    chrome.storage.sync.get(["serverUrl", "apiKey", "defaultDataset"], (settings) => {
        if (!settings.serverUrl || !settings.apiKey) {
            knowledgeBaseSelect.innerHTML = `<option value="">请先设置服务器和 API 密钥</option>`;
            savePageButton.disabled = true;
            saveSelectionButton.disabled = true;
            return;
        }

        console.log("🌍 服务器地址:", settings.serverUrl);
        console.log("🔑 API Key:", settings.apiKey ? "已存储" : "未存储");

        fetch(`${settings.serverUrl}/datasets`, {
            headers: {
                Authorization: `Bearer ${settings.apiKey}`,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                knowledgeBaseSelect.innerHTML = "";
                data.data.forEach((dataset) => {
                    const option = document.createElement("option");
                    option.value = dataset.id;
                    option.textContent = dataset.name;
                    if (dataset.id === settings.defaultDataset) {
                        option.selected = true;
                    }
                    knowledgeBaseSelect.appendChild(option);
                });

                console.log("📚 知识库加载成功，共", data.data.length, "个");
            })
            .catch(error => {
                console.error("❌ 加载知识库失败:", error);
                knowledgeBaseSelect.innerHTML = `<option value="">加载失败，请检查配置</option>`;
            });
    });

    // **保存整页文本**
    function saveFullPageContent() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.error("❌ 未找到活动页面");
                return;
            }

            const tab = tabs[0];

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => document.body.innerText.trim() // 抓取页面所有可见文本
            }, (results) => {
                if (results && results[0] && results[0].result) {
                    const pageText = results[0].result;
                    console.log("📖 获取的网页文本:", pageText.substring(0, 200), "...(后续省略)");
                    saveContentToAPI(tab.title, pageText);
                } else {
                    console.error("🚨 无法获取网页文本内容");
                    alert("无法获取网页文本，请检查页面内容是否可见！");
                }
            });
        });
    }

    // ... existing code ...

    function saveContent(contentType) {
        console.log(`📌 [${new Date().toISOString()}] 开始保存内容: ${contentType}`);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.error("❌ 未找到活动页面");
                return;
            }

            const tab = tabs[0];
            const selectedDataset = knowledgeBaseSelect.value;

            if (!selectedDataset) {
                console.warn("⚠️ 未选择知识库，保存失败");
                alert("请选择一个知识库！");
                return;
            }

            // **获取 API 配置**
            chrome.storage.sync.get(["serverUrl", "apiKey"], (settings) => {
                if (!settings.serverUrl || !settings.apiKey) {
                    console.error("❌ 服务器 URL 或 API 密钥缺失");
                    alert("请先在设置页面填写服务器 URL 和 API 密钥！");
                    return;
                }

                if (contentType === "selection") {
                    const text = selectedTextArea.value.trim();
                    if (!text) {
                        console.warn("⚠️ 未选中文字，保存失败");
                        alert("请先选中文本或手动输入内容！");
                        return;
                    }
                    sendPageContent(tab, text, selectedDataset, settings);
                } else {
                    // 获取整页内容
                    chrome.scripting.executeScript(
                        {
                            target: { tabId: tab.id },
                            function: () => {
                                // 获取整个页面的文本内容
                                return document.body.innerText || document.body.textContent;
                            }
                        },
                        (results) => {
                            if (results && results[0] && results[0].result) {
                                const pageContent = results[0].result.trim();
                                if (!pageContent) {
                                    console.error("❌ 页面内容为空");
                                    alert("无法获取页面内容，请重试！");
                                    return;
                                }
                                sendPageContent(tab, pageContent, selectedDataset, settings);
                            } else {
                                console.error("❌ 无法获取页面内容");
                                alert("无法获取页面内容，请重试！");
                            }
                        }
                    );
                }
            });
        });
    }

    // 统一的发送内容函数
    function sendPageContent(tab, content, datasetId, settings) {
        const requestUrl = `${settings.serverUrl}/datasets/${datasetId}/document/create-by-text`;
        // 生成时间戳，格式：YYYY-MM-DD HH:mm:ss
        const timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '-');
        
        const requestBody = {
            name: `${tab.title} (${timestamp})`,
            text: content,
            indexing_technique: "high_quality",
            process_rule: { mode: "automatic" }
        };

        console.log("🚀 发送 API 请求:", {
            url: requestUrl,
            method: "POST",
            headers: {
                Authorization: `Bearer ${settings.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

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
                    console.log(`✅ [${new Date().toISOString()}] 内容保存成功:`, responseData);
                    alert("内容保存成功！");
                } else {
                    console.error(`❌ [${new Date().toISOString()}] API 请求失败:`, responseData);
                    alert(`保存失败: ${responseData.message || "请检查配置"}`);
                }
            })
            .catch((err) => {
                console.error(`🚨 [${new Date().toISOString()}] 网络请求异常:`, err);
                alert("网络错误，请检查配置！");
            });
    }

    // **向 API 发送请求**
    function saveContentToAPI(title, text) {
        const selectedDataset = knowledgeBaseSelect.value;
        if (!selectedDataset) {
            console.warn("⚠️ 未选择知识库，保存失败");
            alert("请选择一个知识库！");
            return;
        }

        chrome.storage.sync.get(["serverUrl", "apiKey"], (settings) => {
            if (!settings.serverUrl || !settings.apiKey) {
                console.error("❌ 服务器 URL 或 API 密钥缺失");
                alert("请先在设置页面填写服务器 URL 和 API 密钥！");
                return;
            }

            const requestUrl = `${settings.serverUrl}/datasets/${selectedDataset}/document/create-by-text`;
            // 生成时间戳，格式：YYYY-MM-DD HH:mm:ss
            const timestamp = new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-');

            const requestBody = {
                name: `${title} (${timestamp})`,
                text: text,
                indexing_technique: "high_quality",
                process_rule: { mode: "automatic" }
            };

            console.log("🚀 发送 API 请求:", {
                url: requestUrl,
                method: "POST",
                headers: {
                    Authorization: `Bearer ${settings.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

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
                        console.log(`✅ [${new Date().toISOString()}] 内容保存成功:`, responseData);
                        alert("内容保存成功！");
                    } else {
                        console.error(`❌ [${new Date().toISOString()}] API 请求失败:`, responseData);
                        alert(`保存失败: ${responseData.message || "请检查配置"}`);
                    }
                })
                .catch((err) => {
                    console.error(`🚨 [${new Date().toISOString()}] 网络请求异常:`, err);
                    alert("网络错误，请检查配置！");
                });
        });
    }
});