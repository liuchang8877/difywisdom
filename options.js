document.addEventListener("DOMContentLoaded", () => {
    const serverUrlInput = document.getElementById("serverUrl");
    const apiKeyInput = document.getElementById("apiKey");
    const defaultDatasetSelect = document.getElementById("defaultDataset");
    const shortcutSavePageInput = document.getElementById("shortcutSavePage");
    const shortcutSaveSelectionInput = document.getElementById("shortcutSaveSelection");
    const saveButton = document.getElementById("saveSettingsButton");
    const status = document.getElementById("status");

    // 用于存储真实的 API Key
    let storedApiKey = "";

    // **读取存储的配置**
    chrome.storage.sync.get(["serverUrl", "apiKey", "defaultDataset", "shortcutSavePage", "shortcutSaveSelection"], (settings) => {
        if (settings.serverUrl) {
            serverUrlInput.value = settings.serverUrl;
        }
        if (settings.apiKey) {
            storedApiKey = settings.apiKey;
            apiKeyInput.value = "********"; // 显示遮罩
        }
        if (settings.defaultDataset) {
            defaultDatasetSelect.value = settings.defaultDataset;
        }
        if (settings.shortcutSavePage) {
            shortcutSavePageInput.value = settings.shortcutSavePage;
        }
        if (settings.shortcutSaveSelection) {
            shortcutSaveSelectionInput.value = settings.shortcutSaveSelection;
        }
        // 如果配置中有服务器地址和 API Key，则加载知识库列表
        if (settings.serverUrl && settings.apiKey) {
            loadKnowledgeBases(settings.serverUrl, settings.apiKey);
        }
    });

    // **监听快捷键输入（仅捕获组合键）**
    function listenShortcutInput(inputElement) {
        inputElement.addEventListener("keydown", (event) => {
            event.preventDefault(); // 阻止默认输入
            let keys = new Set();
            if (event.ctrlKey) keys.add("Ctrl");
            if (event.shiftKey) keys.add("Shift");
            if (event.altKey) keys.add("Alt");
            if (event.metaKey) keys.add("Cmd"); // Mac

            // 捕获字符键和功能键 (F1-F12)
            if (event.key.length === 1 || /^(F[1-9]|F1[0-2])$/.test(event.key)) {
                keys.add(event.key.toUpperCase());
            }
            inputElement.value = [...keys].join("+");
        });
    }

    // 设置只读后，监听点击事件让其获取焦点以捕获快捷键输入
    shortcutSavePageInput.addEventListener("click", () => {
        shortcutSavePageInput.readOnly = false;
        shortcutSavePageInput.focus();
    });
    shortcutSavePageInput.addEventListener("blur", () => {
        shortcutSavePageInput.readOnly = true;
    });

    shortcutSaveSelectionInput.addEventListener("click", () => {
        shortcutSaveSelectionInput.readOnly = false;
        shortcutSaveSelectionInput.focus();
    });
    shortcutSaveSelectionInput.addEventListener("blur", () => {
        shortcutSaveSelectionInput.readOnly = true;
    });

    listenShortcutInput(shortcutSavePageInput);
    listenShortcutInput(shortcutSaveSelectionInput);

    // **加载知识库列表**
    function loadKnowledgeBases(serverUrl, apiKey) {
        fetch(`${serverUrl}/datasets`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            defaultDatasetSelect.innerHTML = "";
            data.data.forEach((dataset) => {
                const option = document.createElement("option");
                option.value = dataset.id;
                option.textContent = dataset.name;
                defaultDatasetSelect.appendChild(option);
            });
        })
        .catch(() => {
            defaultDatasetSelect.innerHTML = `<option value="">加载失败，请检查配置</option>`;
        });
    }

    // **保存设置**
    saveButton.addEventListener("click", () => {
        // 如果用户没有修改 API Key 输入框，则使用已存储的
        let newApiKey = apiKeyInput.value.trim();
        if (newApiKey === "********") {
            newApiKey = storedApiKey;
        }
        const settings = {
            serverUrl: serverUrlInput.value.trim(),
            apiKey: newApiKey,
            defaultDataset: defaultDatasetSelect.value,
            shortcutSavePage: shortcutSavePageInput.value.trim(),
            shortcutSaveSelection: shortcutSaveSelectionInput.value.trim()
        };

        chrome.storage.sync.set(settings, () => {
            storedApiKey = settings.apiKey; // 更新真实 API Key
            apiKeyInput.value = "********"; // 重新显示遮罩
            status.textContent = "✅ 设置已保存！";
            setTimeout(() => status.textContent = "", 2000);
            if (settings.serverUrl && settings.apiKey) {
                loadKnowledgeBases(settings.serverUrl, settings.apiKey);
            }
        });
    });
});