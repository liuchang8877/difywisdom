document.addEventListener("DOMContentLoaded", () => {
    const serverUrlInput = document.getElementById("serverUrl");
    const apiKeyInput = document.getElementById("apiKey");
    const defaultDatasetSelect = document.getElementById("defaultDataset");
    const saveButton = document.getElementById("saveSettingsButton");
    const status = document.getElementById("status");
  
    let rawApiKey = ""; // 存储原始 API 密钥
  
    // 加载已有设置
    chrome.storage.sync.get(["serverUrl", "apiKey", "defaultDataset"], (settings) => {
      serverUrlInput.value = settings.serverUrl || "";
      rawApiKey = settings.apiKey || "";
      apiKeyInput.value = rawApiKey ? "****" : ""; // 如果有密钥，则显示为 ****
      loadDatasets(settings.serverUrl, settings.apiKey, settings.defaultDataset);
    });
  
    // 保存设置
    saveButton.addEventListener("click", () => {
      const serverUrl = serverUrlInput.value.trim();
      const enteredApiKey = apiKeyInput.value.trim();
      const defaultDataset = defaultDatasetSelect.value;
  
      // 如果输入的 API 密钥是 "****"，说明用户没有更改密钥，使用原密钥
      const apiKey = enteredApiKey === "****" ? rawApiKey : enteredApiKey;
  
      if (!serverUrl || !apiKey) {
        status.textContent = "服务器地址和 API 密钥不能为空！";
        return;
      }
  
      chrome.storage.sync.set(
        { serverUrl, apiKey, defaultDataset },
        () => {
          rawApiKey = apiKey; // 更新原始 API 密钥
          status.textContent = "设置已保存！正在加载知识库...";
          loadDatasets(serverUrl, apiKey, defaultDataset);
        }
      );
    });
  
    // 加载知识库列表
    function loadDatasets(serverUrl, apiKey, selectedDatasetId) {
      if (!serverUrl || !apiKey) {
        status.textContent = "请先填写服务器地址和 API 密钥。";
        return;
      }
  
      fetch(`${serverUrl}/datasets`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`无法获取知识库列表：${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          defaultDatasetSelect.innerHTML = ""; // 清空之前的选项
          data.data.forEach((dataset) => {
            const option = document.createElement("option");
            option.value = dataset.id;
            option.textContent = dataset.name;
  
            // 如果是默认选中项
            if (dataset.id === selectedDatasetId) {
              option.selected = true;
            }
  
            defaultDatasetSelect.appendChild(option);
          });
  
          if (data.data.length === 0) {
            defaultDatasetSelect.innerHTML = '<option value="">没有可用的知识库</option>';
          }
  
          status.textContent = "知识库已加载！";
        })
        .catch((error) => {
          console.error("加载知识库失败：", error);
          status.textContent = `加载知识库失败：${error.message}`;
          defaultDatasetSelect.innerHTML = '<option value="">加载失败</option>';
        });
    }
  });