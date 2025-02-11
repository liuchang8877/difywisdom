document.addEventListener("DOMContentLoaded", () => {
  const knowledgeBaseSelect = document.getElementById("knowledgeBaseSelect");
  const savePageButton = document.getElementById("savePageButton");
  const saveSelectionButton = document.getElementById("saveSelectionButton");
  const openSettingsButton = document.getElementById("openSettingsButton");
  const status = document.getElementById("status");
  const selectedTextArea = document.getElementById("selectedText");

  // 读取配置并加载知识库列表
  chrome.storage.sync.get(["serverUrl", "apiKey", "defaultDataset"], (settings) => {
    if (!settings.serverUrl || !settings.apiKey) {
      knowledgeBaseSelect.innerHTML = `<option value="">请先设置服务器和 API 密钥</option>`;
      savePageButton.disabled = true;
      saveSelectionButton.disabled = true;
      return;
    }

    fetch(`${settings.serverUrl}/datasets`, {
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json"
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("无法加载知识库列表，请检查配置！");
        }
        return response.json();
      })
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
      })
      .catch(error => {
        status.textContent = "加载知识库失败，请检查配置！";
        console.error("加载知识库失败：", error);
      });
  });

  // **获取选中文本并回显到 textarea**
  function getSelectedText() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => window.getSelection().toString()
      }, (results) => {
        if (results && results[0] && results[0].result) {
          selectedTextArea.value = results[0].result;
        } else {
          selectedTextArea.value = "";
        }
      });
    });
  }

  // **保存内容的函数**
  function saveContent(contentType) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      let text;

      if (contentType === "selection") {
        text = selectedTextArea.value.trim();
        if (!text) {
          alert("请先选中文本或手动输入内容！");
          return;
        }
      } else {
        text = "整页内容"; // 默认获取整页内容
      }

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
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: tab.title,
            text: text,
            indexing_technique: "high_quality",
            process_rule: { mode: "automatic" }
          })
        })
          .then(response => {
            if (response.ok) {
              alert("内容保存成功！");
            } else {
              alert("保存失败，请检查配置！");
            }
          })
          .catch(err => {
            alert("网络错误，请检查配置！");
            console.error(err);
          });
      });
    });
  }

  // 绑定事件
  savePageButton.addEventListener("click", () => saveContent("page"));
  saveSelectionButton.addEventListener("click", () => saveContent("selection"));
  openSettingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
  
  // 监听页面选中内容变化
  document.addEventListener("mouseup", () => {
    setTimeout(getSelectedText, 100); // 延迟100ms获取文本，确保选择生效
  });
});