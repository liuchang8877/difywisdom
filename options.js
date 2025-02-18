document.addEventListener("DOMContentLoaded", () => {
    const serverUrlInput = document.getElementById("serverUrl");
    const apiKeyInput = document.getElementById("apiKey");
    const defaultDatasetSelect = document.getElementById("defaultDataset");
    // 快捷键部分，如果不需要可以忽略这两行
    const shortcutSavePageInput = document.getElementById("shortcutSavePage");
    const shortcutSaveSelectionInput = document.getElementById("shortcutSaveSelection");
    const saveButton = document.getElementById("saveSettingsButton");
    const status = document.getElementById("status");

    // 用于存储真实的 API Key
    let storedApiKey = "";

    // **读取存储的配置**
    chrome.storage.sync.get(
      ["serverUrl", "apiKey", "defaultDataset", "shortcutSavePage", "shortcutSaveSelection"],
      (settings) => {
          console.log("读取到的设置：", settings);
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
          // 快捷键部分：如果需要启用，请取消注释下面两行代码
          if (settings.shortcutSavePage) {
              if (shortcutSavePageInput) shortcutSavePageInput.value = settings.shortcutSavePage;
          }
          if (settings.shortcutSaveSelection) {
              if (shortcutSaveSelectionInput) shortcutSaveSelectionInput.value = settings.shortcutSaveSelection;
          }
          // 如果配置中有服务器地址和 API Key，则加载知识库列表
          if (settings.serverUrl && settings.apiKey) {
              loadKnowledgeBases(settings.serverUrl, settings.apiKey);
          } else {
              console.log("尚未设置服务器地址或 API 密钥，暂时不加载知识库列表。");
          }
      }
    );

    // **监听快捷键输入（仅捕获组合键），仅在启用快捷键设置时使用**
    function listenShortcutInput(inputElement) {
        if (!inputElement) return; // 如果元素不存在则跳过
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
    // 如果快捷键输入框存在，启用监听（若不启用可注释掉）
    listenShortcutInput(shortcutSavePageInput);
    listenShortcutInput(shortcutSaveSelectionInput);

    // 设置只读后，监听点击事件解除只读以捕获快捷键输入
    if (shortcutSavePageInput) {
        shortcutSavePageInput.addEventListener("click", () => {
            shortcutSavePageInput.readOnly = false;
            shortcutSavePageInput.focus();
        });
        shortcutSavePageInput.addEventListener("blur", () => {
            shortcutSavePageInput.readOnly = true;
        });
    }
    if (shortcutSaveSelectionInput) {
        shortcutSaveSelectionInput.addEventListener("click", () => {
            shortcutSaveSelectionInput.readOnly = false;
            shortcutSaveSelectionInput.focus();
        });
        shortcutSaveSelectionInput.addEventListener("blur", () => {
            shortcutSaveSelectionInput.readOnly = true;
        });
    }

    // **加载知识库列表**
    function loadKnowledgeBases(serverUrl, apiKey) {
        console.log("开始加载知识库列表...");
        // 格式化服务器地址：确保以 http(s):// 开头、结尾没有 /
        let url = serverUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        if (url.endsWith("/")) {
            url = url.slice(0, -1);
        }
        console.log("格式化后的服务器地址：", url);

        defaultDatasetSelect.innerHTML = `<option value="">正在加载知识库列表...</option>`;

        fetch(`${url}/datasets`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            console.log("知识库接口响应状态：", response.status);
            return response.json();
        })
        .then(data => {
            console.log("知识库接口返回数据：", data);
            defaultDatasetSelect.innerHTML = "";
            if (!data.data || !Array.isArray(data.data)) {
                console.error("返回数据格式不正确:", data);
                defaultDatasetSelect.innerHTML = `<option value="">加载失败：数据格式错误</option>`;
                return;
            }
            if (data.data.length === 0) {
                defaultDatasetSelect.innerHTML = `<option value="">暂无可用的知识库</option>`;
                console.log("未找到可用的知识库");
                return;
            }
            data.data.forEach((dataset) => {
                const option = document.createElement("option");
                option.value = dataset.id;
                option.textContent = dataset.name;
                defaultDatasetSelect.appendChild(option);
            });
            console.log(`成功加载 ${data.data.length} 个知识库`);
        })
        .catch((error) => {
            console.error("加载知识库失败：", error);
            defaultDatasetSelect.innerHTML = `<option value="">加载失败：${error.message}</option>`;
            status.textContent = "❌ 加载知识库失败";
            setTimeout(() => status.textContent = "", 3000);
        });
    }

    // **保存设置**
    saveButton.addEventListener("click", () => {
        status.textContent = "⏳ 正在保存设置...";
        saveButton.disabled = true;

        // 如果用户没有修改 API Key 输入框，则使用已存储的
        let newApiKey = apiKeyInput.value.trim();
        if (newApiKey === "********") {
            newApiKey = storedApiKey;
        }

        // 格式化服务器地址
        let serverUrl = serverUrlInput.value.trim();
        if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
            serverUrl = "https://" + serverUrl;
        }
        if (serverUrl.endsWith("/")) {
            serverUrl = serverUrl.slice(0, -1);
        }

        const settings = {
            serverUrl: serverUrl,
            apiKey: newApiKey,
            defaultDataset: defaultDatasetSelect.value,
            // 快捷键部分，如果启用请保存
            shortcutSavePage: shortcutSavePageInput ? shortcutSavePageInput.value.trim() : "",
            shortcutSaveSelection: shortcutSaveSelectionInput ? shortcutSaveSelectionInput.value.trim() : ""
        };

        chrome.storage.sync.set(settings, () => {
            storedApiKey = settings.apiKey; // 更新真实 API Key
            apiKeyInput.value = "********";  // 重新显示遮罩
            serverUrlInput.value = settings.serverUrl; // 更新格式化后的 URL
            status.textContent = "✅ 设置已保存！";
            setTimeout(() => status.textContent = "", 2000);
            saveButton.disabled = false;

            // 重新加载知识库列表
            if (settings.serverUrl && settings.apiKey) {
                loadKnowledgeBases(settings.serverUrl, settings.apiKey);
            }
        });
    });
});