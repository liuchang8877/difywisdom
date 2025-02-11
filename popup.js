document.addEventListener("DOMContentLoaded", () => {
  const knowledgeBaseSelect = document.getElementById("knowledgeBaseSelect");
  const savePageButton = document.getElementById("savePageButton");
  const saveSelectionButton = document.getElementById("saveSelectionButton");
  const openSettingsButton = document.getElementById("openSettingsButton");
  const selectedTextArea = document.getElementById("selectedText");

  // **获取选中的文本**
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;

    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: () => window.getSelection().toString()
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          const selectedText = results[0].result.trim();
          selectedTextArea.value = selectedText || "请在网页上选中文字...";
        }
      }
    );
  });

  // **加载知识库列表**
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
        console.error("加载知识库失败：", error);
        knowledgeBaseSelect.innerHTML = `<option value="">加载失败，请检查配置</option>`;
      });
  });

  // **保存内容**
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

  // **绑定事件**
  savePageButton.addEventListener("click", () => saveContent("page"));
  saveSelectionButton.addEventListener("click", () => saveContent("selection"));
  openSettingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
});