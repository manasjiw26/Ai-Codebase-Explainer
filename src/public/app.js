const analysisForm = document.getElementById('analysisForm');
const repoInput = document.getElementById('repoUrl');
const themeToggle = document.getElementById('themeToggle');
const analysisProgress = document.getElementById('analysisProgress');
const analysisBadge = document.getElementById('analysisBadge');
const analysisSummary = document.getElementById('analysisSummary');
const thinkingIndicator = document.createElement('div');
thinkingIndicator.className = 'thinking-indicator';
thinkingIndicator.innerHTML = '<span></span><span></span><span></span>';
const serverStatus = document.getElementById('serverStatus');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatWindow = document.getElementById('chatWindow');
let currentAnalysisId = null;

const setStatus = (text, badge = 'Idle', showThinking = false) => {
  analysisProgress.querySelector('.analysis-progress__text').textContent = text;
  analysisBadge.textContent = badge;

  if (showThinking) {
    if (!analysisProgress.querySelector('.thinking-indicator')) {
      analysisProgress.appendChild(thinkingIndicator);
    }
  } else {
    thinkingIndicator.remove();
  }
};

const applyTheme = (isDark) => {
  document.body.classList.toggle('dark-theme', isDark);
  themeToggle.checked = isDark;
  localStorage.setItem('codebase-explainer-theme', isDark ? 'dark' : 'light');
};

const savedTheme = localStorage.getItem('codebase-explainer-theme');
if (savedTheme === 'dark') {
  applyTheme(true);
} else {
  applyTheme(false);
}

themeToggle.addEventListener('change', () => {
  applyTheme(themeToggle.checked);
});

const escapeHtml = (value) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const formatMessageContent = (content) => {
  const safeContent = escapeHtml(content);
  const blocks = safeContent.split(/\n{2,}/).filter(Boolean);

  return blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const isList = lines.every((line) => line.startsWith('-') || line.startsWith('•'));

    if (isList) {
      const items = lines.map((line) => `<li>${line.replace(/^[-•]\s*/, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    }

    return `<p>${lines.join('<br>')}</p>`;
  }).join('');
};

const addChatMessage = (role, content) => {
  const message = document.createElement('div');
  message.className = `message ${role === 'assistant' ? 'message--assistant' : 'message--user'}`;
  message.innerHTML = `
    <div class="message__meta">${role === 'assistant' ? 'Assistant' : 'You'}</div>
    <div class="message__content">${formatMessageContent(content)}</div>
  `;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

const healthCheck = async () => {
  try {
    const response = await fetch('/health');
    if (response.ok) {
      serverStatus.textContent = 'Server online';
    } else {
      serverStatus.textContent = 'Server issue';
    }
  } catch (error) {
    serverStatus.textContent = 'Offline';
  }
};

analysisForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const repoUrl = repoInput.value.trim();

  if (!repoUrl) {
    setStatus('A repository URL is required.', 'Needs input');
    return;
  }

  setStatus('Submitting repository for analysis…', 'Queued', true);
  analysisSummary.textContent = 'The request has been sent to the analysis service.';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to start analysis.');
    }

    currentAnalysisId = data.analysisId;
    chatInput.disabled = true;
    chatInput.placeholder = 'Waiting for analysis to complete…';
    setStatus(`Analysis started. ID: ${data.analysisId}`, 'Running', true);
    analysisSummary.textContent = `The repository is being inspected. Use the conversation panel to ask questions as the analysis progresses.`;

    addChatMessage('assistant', `The analysis for ${repoUrl} has started. I will help interpret the structure once the backend returns its findings.`);

    let status = 'pending';
    const poll = async () => {
      const pollingResponse = await fetch(`/api/analyze/${data.analysisId}`);
      const parsed = await pollingResponse.json();

      if (pollingResponse.ok && parsed.status) {
        status = parsed.status;
        const isActive = status === 'queued' || status === 'running' || status === 'pending';
        setStatus(`Status: ${status}`, status.toUpperCase(), isActive);
        if (status === 'completed') {
          chatInput.disabled = false;
          chatInput.placeholder = 'Ask about the repository';
          analysisSummary.textContent = parsed.summary || 'Analysis completed. The repository summary is ready.';
          setStatus('Analysis complete and ready for questions.', 'Completed');
          addChatMessage('assistant', 'The repository analysis is complete. Ask for a summary, architecture overview, or entry point details.');
          return;
        }
        if (status === 'failed') {
          analysisSummary.textContent = 'The analysis did not complete. Review the server logs for more details.';
          addChatMessage('assistant', 'The analysis could not complete. Please verify the repository URL and server configuration.');
          return;
        }
      }

      setTimeout(poll, 3000);
    };

    poll();
  } catch (error) {
    setStatus(error.message, 'Error');
    analysisSummary.textContent = error.message;
    addChatMessage('assistant', `The request could not be completed: ${error.message}`);
  }
});

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = chatInput.value.trim();
  if (!content) return;
  if (!currentAnalysisId) {
    addChatMessage('assistant', 'Start an analysis first so I have repository context to answer your question.');
    return;
  }

  addChatMessage('user', content);
  chatInput.value = '';
  chatInput.disabled = true;
  addChatMessage('assistant', 'Thinking about your repository…');

  try {
    const response = await fetch(`/api/analyze/${currentAnalysisId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to answer your question.');
    }

    const lastMessage = chatWindow.lastElementChild;
    if (lastMessage) {
      lastMessage.remove();
    }
    addChatMessage('assistant', data.reply);
  } catch (error) {
    const lastMessage = chatWindow.lastElementChild;
    if (lastMessage) {
      lastMessage.remove();
    }
    addChatMessage('assistant', error.message);
  } finally {
    chatInput.disabled = false;
  }
});

healthCheck();
