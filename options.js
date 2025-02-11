document.addEventListener("DOMContentLoaded", () => {
    const serverUrlInput = document.getElementById("serverUrl");
    const apiKeyInput = document.getElementById("apiKey");
    const defaultDatasetSelect = document.getElementById("defaultDataset");
    const shortcutSavePageInput = document.getElementById("shortcutSavePage");
    const shortcutSaveSelectionInput = document.getElementById("shortcutSaveSelection");
    const saveButton = document.getElementById("saveSettingsButton");
    const status = document.getElementById("status");

    // **读取存储的配置**
    chrome.storage.sync.get(["serverUrl", "apiKey", "defaultDataset", "shortcutSavePage", "shortcutSaveSelection"], (settings) => {
        if (settings.serverUrl) serverUrlInput.value = settings.serverUrl;
        if (settings.apiKey) apiKeyInput.value = "********";  // 隐藏 API Key
        if (settings.defaultDataset) defaultDatasetSelect.value = settings.defaultDataset;
        if (settings.shortcutSavePage) shortcutSavePageInput.value = settings.shortcutSavePage;
        if (settings.shortcutSaveSelection) shortcutSaveSelectionInput.value = settings.shortcutSaveSelection;

        if (settings.serverUrl && settings.apiKey) {
            loadKnowledgeBases(settings.serverUrl, settings.apiKey);
        }
    });

    // **监听快捷键输入**
    function listenShortcutInput(inputElement) {
        inputElement.addEventListener("keydown", (event) => {
            event.preventDefault();
            let keys = [];

            if (event.ctrlKey) keys.push("Ctrl");
            if (event.shiftKey) keys.push("Shift");
            if (event.altKey) keys.push("Alt");
            if (event.metaKey) keys.push("Cmd");

            if (event.key.length === 1 || /^(F[1-9]|F1[0-2])$/.test(event.key)) {
                keys.push(event.key.toUpperCase());
            }

            inputElement.value = keys.join("+");
        });
    }

    listenShortcutInput(shortcutSavePageInput);
    listenShortcutInput(shortcutSaveSelectionInput);

    // **加载知识库**
    function loadKnowledgeBases(serverUrl, apiKey) {
        fetch(`${serverUrl}/datasets`, {
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
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
        const settings = {
            serverUrl: serverUrlInput.value.trim(),
            apiKey: apiKeyInput.value !== "********" ? apiKeyInput.value.trim() : undefined,
            defaultDataset: defaultDatasetSelect.value,
            shortcutSavePage: shortcutSavePageInput.value.trim(),
            shortcutSaveSelection: shortcutSaveSelectionInput.value.trim()
        };

        chrome.storage.sync.set(settings, () => {
            status.textContent = "✅ 设置已保存！";
            setTimeout(() => status.textContent = "", 2000);
        });
    });
});