document.addEventListener("DOMContentLoaded", () => {
    const knowledgeBaseSelect = document.getElementById("knowledgeBaseSelect");
    const saveButton = document.getElementById("savePageButton");
    const openSettingsButton = document.getElementById("openSettingsButton");
  
    // 加载用户保存的服务器地址、API Key 和默认知识库
    chrome.storage.sync.get(["serverUrl", "apiKey", "defaultDataset"], (settings) => {
      if (!settings.serverUrl || !settings.apiKey) {
        knowledgeBaseSelect.innerHTML = `<option value="">请先设置服务器和 API 密钥</option>`;
        saveButton.disabled = true;
        return;
      }
  
      // 调用接口加载知识库列表
      fetch(`${settings.serverUrl}/datasets`, {
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("无法加载知识库列表，请检查配置！");
          }
          return response.json();
        })
        .then((data) => {
          knowledgeBaseSelect.innerHTML = ""; // 清空选项
          data.data.forEach((dataset) => {
            const option = document.createElement("option");
            option.value = dataset.id;
            option.textContent = dataset.name;
            if (dataset.id === settings.defaultDataset) {
              option.selected = true;
            }
            knowledgeBaseSelect.appendChild(option);
          });
        })
        .catch((error) => {
          console.error("加载知识库失败：", error);
          knowledgeBaseSelect.innerHTML = `<option value="">加载失败，请检查配置</option>`;
        });
    });
  
    // 保存网页内容
    saveButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript(
          { target: { tabId: tabs[0].id }, func: () => document.body.innerText },
          (results) => {
            const pageText = results[0].result;
            const selectedDataset = knowledgeBaseSelect.value;
  
            if (!selectedDataset) {
              alert("请选择一个知识库！");
              return;
            }
  
            chrome.storage.sync.get(["serverUrl", "apiKey"], (settings) => {
              fetch(`${settings.serverUrl}/datasets/${selectedDataset}/document/create-by-text`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${settings.apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: tabs[0].title,
                  text: pageText,
                  indexing_technique: "high_quality",
                  process_rule: { mode: "automatic" },
                }),
              })
                .then((response) => {
                  if (response.ok) {
                    alert("网页保存成功！");
                  } else {
                    alert("保存失败，请检查配置！");
                  }
                })
                .catch(() => {
                  alert("网络错误，请检查配置！");
                });
            });
          }
        );
      });
    });
  
    // 打开设置页面
    openSettingsButton.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  });