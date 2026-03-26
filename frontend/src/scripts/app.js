const STORAGE_KEY = 'pmp-active-session-id';
const USER_STORAGE_KEY = 'pmp-user-id';
const USERNAME_STORAGE_KEY = 'pmp-username';

const state = {
  userId: null,
  username: null,
  exams: [],
  session: null,
  allQuestions: [], // Array of all questions with their answers
  question: null,
  selectedOption: null,
  feedback: null,
  result: null,
  deleteMode: false,
  selectedExamsForDelete: new Set(),
};

let timerInterval;

export function formatCountdown(deadlineAt, now = new Date()) {
  if (!deadlineAt) {
    return '';
  }
  const diffMs = Math.max(0, new Date(deadlineAt).getTime() - now.getTime());
  const totalSeconds = Math.ceil(diffMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatBulletPoints(text) {
  if (!text) return text;
  return text.replace(/●\s*/g, '<br/>● ');
}

export function summarizeResults(summary) {
  return [
    { label: 'Correct', value: `${summary.correctCount} (${summary.correctPercentage}%)` },
    { label: 'Incorrect', value: `${summary.incorrectCount} (${summary.incorrectPercentage}%)` },
    { label: 'Unanswered', value: String(summary.unansweredCount) },
  ];
}

export function getFeedbackTone(feedback) {
  return feedback?.result === 'correct' ? 'correct' : 'incorrect';
}

export function shouldPersistSession(session) {
  return session?.mode === 'exam' && session?.status === 'in_progress';
}

export function buildSessionStatus(session, { resumed = false } = {}) {
  if (session.mode === 'practice') {
    return 'Practice mode shows feedback immediately after each answer.';
  }
  return resumed
    ? 'Resumed your in-progress Exam session.'
    : 'Exam mode hides feedback until the session ends and resumes if you refresh the app.';
}

function qs(id) {
  return document.getElementById(id);
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (state.userId) {
    headers['x-user-id'] = String(state.userId);
  }
  const response = await fetch(url, {
    headers,
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Request failed.');
  }
  return payload;
}

function setStatus(message) {
  qs('status').textContent = message;
}

function showToast(message, type = 'info', duration = 3000) {
  const container = qs('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;

  container.appendChild(toast);

  if (duration && duration > 0) {
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  return toast;
}

function openImportModal() {
  const modal = qs('import-modal');
  modal.classList.remove('modal-hidden');
  qs('csv-file').focus();
}

function closeImportModal() {
  const modal = qs('import-modal');
  modal.classList.add('modal-hidden');
  // Clear form
  qs('csv-file').value = '';
  qs('exam-name').value = '';
}

function showConfirmDialog(message) {
  return new Promise((resolve) => {
    const modal = qs('confirm-modal');
    const messageEl = qs('confirm-modal-message');
    const cancelBtn = qs('confirm-cancel-btn');
    const okBtn = qs('confirm-ok-btn');
    const overlay = modal.querySelector('.modal-overlay');

    // Set message
    messageEl.textContent = message;

    // Show modal
    modal.classList.remove('modal-hidden');

    // Handle buttons
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const handleOk = () => {
      cleanup();
      resolve(true);
    };

    const handleOverlayClick = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      cancelBtn.removeEventListener('click', handleCancel);
      okBtn.removeEventListener('click', handleOk);
      overlay.removeEventListener('click', handleOverlayClick);
      modal.classList.add('modal-hidden');
    };

    cancelBtn.addEventListener('click', handleCancel);
    okBtn.addEventListener('click', handleOk);
    overlay.addEventListener('click', handleOverlayClick);
  });
}

function persistSessionId(sessionId) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, String(sessionId));
  }
}

function clearPersistedSessionId() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function readPersistedSessionId() {
  return typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
}

function persistUser(userId, username) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(USER_STORAGE_KEY, String(userId));
    window.localStorage.setItem(USERNAME_STORAGE_KEY, String(username));
  }
}

function clearPersistedUser() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(USERNAME_STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY); // Also clear session when logging out
  }
}

function readPersistedUser() {
  if (typeof window === 'undefined') {
    return null;
  }
  const userId = window.localStorage.getItem(USER_STORAGE_KEY);
  const username = window.localStorage.getItem(USERNAME_STORAGE_KEY);
  return userId && username ? { userId: Number(userId), username } : null;
}

function syncPersistedSession(session) {
  if (shouldPersistSession(session)) {
    persistSessionId(session.id);
    return;
  }
  clearPersistedSessionId();
}

function renderLoginScreen() {
  qs('app').innerHTML = `
    <section class="login-container">
      <h2>Welcome to PMP Exam Practice</h2>
      <p>Enter your username to continue studying</p>
      <div class="login-form">
        <input 
          type="text" 
          id="username-input" 
          placeholder="Enter your username" 
          autocomplete="off"
          maxlength="50"
        />
        <button id="login-btn">Login</button>
      </div>
      <p class="login-hint">Your progress will be saved between sessions across all devices.</p>
    </section>
  `;

  const usernameInput = qs('username-input');
  const loginBtn = qs('login-btn');

  const handleLogin = async () => {
    const username = usernameInput.value.trim();
    if (!username) {
      setStatus('Please enter a username');
      return;
    }

    try {
      setStatus('Logging in...');
      const result = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      
      state.userId = result.userId;
      state.username = result.username;
      persistUser(result.userId, result.username);
      
      setStatus('');
      await loadExamSets();
    } catch (error) {
      setStatus(`Login failed: ${error.message}`);
    }
  };

  loginBtn.addEventListener('click', handleLogin);
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  });

  // Focus on input
  usernameInput.focus();
}

async function logout() {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  state.userId = null;
  state.username = null;
  clearPersistedUser();
  clearState();
  renderLoginScreen();
  setStatus('Logged out');
}

function renderTimer(deadlineAt) {
  const timer = qs('timer');
  if (!deadlineAt) {
    timer.classList.add('timer-hidden');
    timer.textContent = '';
    clearInterval(timerInterval);
    return;
  }

  timer.classList.remove('timer-hidden');
  const update = () => {
    timer.textContent = formatCountdown(deadlineAt);
  };
  update();
  clearInterval(timerInterval);
  timerInterval = setInterval(update, 1000);
}

function renderExamSelection() {
  const examCards = state.exams.map((exam) => {
    if (state.deleteMode) {
      const isSelected = state.selectedExamsForDelete.has(exam.id);
      return `
        <article class="exam-card">
          <div style="display: flex; align-items: start; gap: 0.75rem;">
            <label style="display: flex; align-items: center; cursor: pointer; margin-top: 0.25rem;">
              <input type="checkbox" data-exam-id="${exam.id}" ${isSelected ? 'checked' : ''} style="cursor: pointer;" />
            </label>
            <div style="flex: 1;">
              <h2>${exam.title}</h2>
              <p>Questions: ${exam.questionCount}</p>
              <p>${exam.importSummary ?? 'Imported with no warnings.'}</p>
            </div>
          </div>
        </article>
      `;
    }
    return `
      <article class="exam-card">
        <h2>${exam.title}</h2>
        <p>Questions: ${exam.questionCount}</p>
        <p>${exam.importSummary ?? 'Imported with no warnings.'}</p>
        <div class="actions">
          <button data-start="${exam.id}:practice">Practice Mode</button>
          <button class="secondary" data-start="${exam.id}:exam">Exam Mode</button>
        </div>
      </article>
    `;
  }).join('');

  const clearButtonLabel = state.deleteMode 
    ? (state.selectedExamsForDelete.size > 0 ? `Delete (${state.selectedExamsForDelete.size})` : 'Delete')
    : 'Delete';
  const cancelButton = state.deleteMode ? `<button id="cancel-btn" class="secondary" onclick="window.cancelDeleteMode()">Cancel</button>` : '';

  qs('app').innerHTML = `
    <section>
      <div class="user-info">
        <span>Logged in as: <strong>${state.username}</strong></span>
        <button id="logout-btn" class="secondary">Logout</button>
      </div>
      <h2>Manage Exams</h2>
      <div class="actions" style="margin-bottom: 1.5rem;">
        <button onclick="window.openImportModal()">Import Exam</button>
        <button id="clear-btn" class="secondary" onclick="window.clearAllExams()">${clearButtonLabel}</button>
        ${cancelButton}
      </div>
      <h2>Select an exam set</h2>
      <p>Imported exams may be shorter than 200 questions if invalid CSV rows were skipped during import.</p>
      <div class="grid exam-grid">${examCards || '<p>No ready exam sets are available.</p>'}</div>
    </section>
  `;

  qs('logout-btn').addEventListener('click', logout);

  if (state.deleteMode) {
    // Add checkbox change listeners with event delegation
    const examGrid = document.querySelector('.exam-grid');
    if (examGrid) {
      examGrid.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          const examId = Number(e.target.dataset.examId);
          if (e.target.checked) {
            state.selectedExamsForDelete.add(examId);
          } else {
            state.selectedExamsForDelete.delete(examId);
          }
          // Only update button label, don't re-render entire page
          const clearBtn = qs('clear-btn');
          const count = state.selectedExamsForDelete.size;
          clearBtn.textContent = count > 0 ? `Delete (${count})` : 'Delete';
        }
      });
    }
  } else {
    qs('app').querySelectorAll('[data-start]').forEach((button) => {
      button.addEventListener('click', async () => {
        const [examSetId, mode] = button.dataset.start.split(':');
        await startSession({ examSetId: Number(examSetId), mode });
      });
    });
  }
}

function buildFeedbackMarkup(feedback) {
  if (!feedback) {
    return '';
  }

  const tone = getFeedbackTone(feedback);
  return `
    <section class="feedback ${tone}">
      <p><strong>${feedback.result === 'correct' ? 'Correct' : 'Incorrect'}</strong></p>
      <p>Correct answer: ${feedback.correctOption}</p>
      <p>${formatBulletPoints(feedback.explanation)}</p>
    </section>
  `;
}

function buildImageMarkup(imageUrl) {
  if (!imageUrl) {
    return '';
  }

  return `
    <div class="question-image">
      <img src="${imageUrl}" alt="Question image" />
    </div>
  `;
}

function renderQuestion() {
  const question = state.question;
  const isFinalQuestion = question.questionNumber === question.totalQuestions;
  const answerMarkup = question.options.map((option) => {
    const classes = ['answer-card'];
    if (state.selectedOption === option.key) {
      classes.push('selected');
    }
    if (state.feedback) {
      if (option.key === state.feedback.correctOption) {
        classes.push('correct');
      } else if (option.key === state.selectedOption && state.selectedOption !== state.feedback.correctOption) {
        classes.push('incorrect');
      }
    }
    return `
      <button class="${classes.join(' ')}" data-answer="${option.key}" ${state.feedback ? 'disabled' : ''}>
        <strong>${option.key}.</strong> ${formatBulletPoints(option.label)}
      </button>
    `;
  }).join('');

  qs('app').innerHTML = `
    <section>
      <div class="meta">
        <p>Mode: <strong>${state.session.mode === 'practice' ? 'Practice' : 'Exam'}</strong></p>
        <p>Question ${question.questionNumber} of ${question.totalQuestions}</p>
      </div>

      <h3>${formatBulletPoints(question.prompt)}</h3>
      ${buildImageMarkup(question.imageUrl)}
      <div class="answer-list">${answerMarkup}</div>
      ${buildFeedbackMarkup(state.feedback)}
      <div class="actions">
        <button data-submit ${state.selectedOption ? '' : 'disabled'}>${state.feedback ? (isFinalQuestion ? 'Finish session' : 'Next question') : 'Submit answer'}</button>
        <button class="secondary" data-home>Back to exam list</button>
      </div>
    </section>
  `;

  qs('app').querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedOption = button.dataset.answer;
      renderQuestion();
    });
  });

  qs('app').querySelector('[data-submit]').addEventListener('click', async () => {
    if (!state.feedback) {
      const payload = await request(`/api/sessions/${state.session.id}/answers`, {
        method: 'POST',
        body: JSON.stringify({ questionNumber: question.questionNumber, selectedOption: state.selectedOption }),
      });

      if (payload.summary) {
        state.result = payload;
        renderResults();
        return;
      }

      if (state.session.mode === 'practice') {
        state.feedback = payload;
        renderQuestion();
        return;
      }

      if (payload.nextQuestionNumber) {
        await loadQuestion(payload.nextQuestionNumber);
      } else {
        await completeSession();
      }
      return;
    }

    if (isFinalQuestion) {
      await completeSession();
    } else {
      await loadQuestion(question.questionNumber + 1);
    }
  });

  qs('app').querySelector('[data-home]').addEventListener('click', async () => {
    clearState();
    await loadExamSets();
  });
}

function renderAllQuestions() {
  if (!state.allQuestions || state.allQuestions.length === 0) {
    setStatus('No questions loaded');
    return;
  }

  // Build question index
  const indexMarkup = Array.from({ length: state.allQuestions.length }, (_, i) => i + 1)
    .map((num) => `<button class="question-index-btn" data-jump-to="${num}">${num}</button>`)
    .join('');

  // Build all questions
  const questionsMarkup = state.allQuestions.map((question) => {
    const answerMarkup = question.options.map((option) => {
      const classes = ['answer-card'];
      if (question.selectedOption === option.key) {
        classes.push('selected');
      }
      
      // Get feedback for this question from the question object if it exists
      let feedback = null;
      if (state.session.mode === 'practice') {
        feedback = question.feedback;
      }
      
      if (feedback) {
        if (option.key === feedback.correctOption) {
          classes.push('correct');
        } else if (option.key === question.selectedOption && question.selectedOption !== feedback.correctOption) {
          classes.push('incorrect');
        }
      }
      
      return `
        <button class="${classes.join(' ')}" data-answer="${option.key}" data-question="${question.questionNumber}" ${feedback ? 'disabled' : ''}>
          <strong>${option.key}.</strong> ${formatBulletPoints(option.label)}
        </button>
      `;
    }).join('');

    const feedbackMarkup = state.session.mode === 'practice' && question.feedback
      ? `
        <section class="feedback ${question.feedback.result === 'correct' ? 'correct' : 'incorrect'}">
          <p><strong>${question.feedback.result === 'correct' ? 'Correct' : 'Incorrect'}</strong></p>
          <p>Correct answer: ${question.feedback.correctOption}</p>
          <p>${formatBulletPoints(question.feedback.explanation)}</p>
        </section>
      `
      : '';

    return `
      <article class="question-card" id="question-${question.questionNumber}">
        <div class="question-header">
          <h3>Question ${question.questionNumber}</h3>
          <span class="question-status">
            ${question.selectedOption ? (state.session.mode === 'practice' && question.feedback 
              ? `<span class="status-tag ${question.feedback.result === 'correct' ? 'correct' : 'incorrect'}">${question.feedback.result === 'correct' ? '✓' : '✗'}</span>`
              : `<span class="status-tag answered">✓</span>`)
            : '<span class="status-tag unanswered">○</span>'}
          </span>
        </div>
        <p class="question-prompt">${formatBulletPoints(question.prompt)}</p>
        ${buildImageMarkup(question.imageUrl)}
        <div class="answer-list">${answerMarkup}</div>
        ${feedbackMarkup}
      </article>
    `;
  }).join('');

  qs('app').innerHTML = `
    <section class="all-questions-container">
      <div class="meta">
        <p>Mode: <strong>${state.session.mode === 'practice' ? 'Practice' : 'Exam'}</strong></p>
        <p>Total Questions: <strong>${state.allQuestions.length}</strong></p>
      </div>
      
      <nav class="question-index">
        <p>Jump to question:</p>
        <div class="index-buttons">
          ${indexMarkup}
        </div>
      </nav>

      <div class="questions-list">
        ${questionsMarkup}
      </div>

      <div class="actions">
        <button data-complete-session>Complete Session</button>
        <button class="secondary" data-home>Back to exam list</button>
      </div>
    </section>
  `;

  // Setup event listeners for answer selection (auto-save)
  qs('app').querySelectorAll('[data-answer]').forEach((button) => {
    button.addEventListener('click', async (e) => {
      const questionNumber = Number(e.target.closest('[data-question]').dataset.question);
      const selectedOption = e.target.dataset.answer;
      
      // Update local state
      const questionIndex = state.allQuestions.findIndex(q => q.questionNumber === questionNumber);
      if (questionIndex >= 0) {
        state.allQuestions[questionIndex].selectedOption = selectedOption;
      }

      // Auto-save to backend
      try {
        const payload = await request(`/api/sessions/${state.session.id}/answers`, {
          method: 'POST',
          body: JSON.stringify({ questionNumber, selectedOption }),
        });

        if (payload.summary) {
          // Session completed
          state.result = payload;
          renderResults();
          return;
        }

        // For practice mode, update feedback (payload has correctOption for practice mode)
        if (state.session.mode === 'practice' && payload.correctOption) {
          state.allQuestions[questionIndex].feedback = payload;
        }
      } catch (error) {
        showToast(`Error saving answer: ${error.message}`, 'error');
      }

      // Re-render to show updated state
      renderAllQuestions();
    });
  });

  // Setup event listeners for jumping to questions
  qs('app').querySelectorAll('.question-index-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      const questionNumber = Number(e.target.dataset.jumpTo);
      const element = document.getElementById(`question-${questionNumber}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Setup complete session button
  const completeBtn = qs('app').querySelector('[data-complete-session]');
  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      await completeSession();
    });
  }

  // Setup home button
  const homeBtn = qs('app').querySelector('[data-home]');
  if (homeBtn) {
    homeBtn.addEventListener('click', async () => {
      clearState();
      await loadExamSets();
    });
  }
}

function buildReviewMarkup(item) {
  return `
    <article class="review-card">
      <div class="meta">
        <h3>Question ${item.questionNumber}</h3>
        <span class="tag ${item.result}">${item.result}</span>
      </div>
      <p>${formatBulletPoints(item.prompt ?? '')}</p>
      <p><strong>Your answer:</strong> ${item.selectedOption ?? 'Not answered'}</p>
      <p><strong>Correct answer:</strong> ${item.correctOption}</p>
      <p>${formatBulletPoints(item.explanation)}</p>
    </article>
  `;
}

function renderResults() {
  clearInterval(timerInterval);
  renderTimer(null);
  clearPersistedSessionId();
  const tiles = summarizeResults(state.result.summary)
    .map((item) => `<div class="summary-tile"><p>${item.label}</p><strong>${item.value}</strong></div>`)
    .join('');
  const review = state.result.reviewItems.map(buildReviewMarkup).join('');

  qs('app').innerHTML = `
    <section>
      <h2>Session results</h2>
      ${state.session?.importSummary ? `<p class="import-note">${state.session.importSummary}</p>` : ''}
      <div class="summary-grid">${tiles}</div>
      <div class="actions">
        <button data-home>Back to exam list</button>
      </div>
      <div class="review-list">${review}</div>
    </section>
  `;

  qs('app').querySelector('[data-home]').addEventListener('click', async () => {
    clearState();
    await loadExamSets();
  });
}

function clearState() {
  state.session = null;
  state.question = null;
  state.allQuestions = [];
  state.selectedOption = null;
  state.feedback = null;
  state.result = null;
  clearPersistedSessionId();
}

async function loadExamSets() {
  const payload = await request('/api/exams');
  state.exams = payload.items;
  renderExamSelection();
}

async function startSession({ examSetId, mode }) {
  state.result = null;
  state.feedback = null;
  const session = await request('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ examSetId, mode }),
  });
  state.session = session;
  syncPersistedSession(session);
  setStatus(buildSessionStatus(session));
  renderTimer(session.deadlineAt);
  await loadAllQuestions();
}

async function restoreSession(sessionId) {
  const session = await request(`/api/sessions/${sessionId}`);
  if (session.status !== 'in_progress') {
    clearPersistedSessionId();
    return false;
  }
  state.session = session;
  syncPersistedSession(session);
  setStatus(buildSessionStatus(session, { resumed: true }));
  renderTimer(session.deadlineAt);
  await loadAllQuestions();
  return true;
}

async function loadAllQuestions() {
  try {
    const payload = await request(`/api/sessions/${state.session.id}/questions`);
    if (payload.summary) {
      state.result = payload;
      renderResults();
      return;
    }
    state.allQuestions = payload.questions || [];
    renderTimer(payload.deadlineAt);
    renderAllQuestions();
  } catch (error) {
    setStatus(`Error loading questions: ${error.message}`);
  }
}

async function loadQuestion(questionNumber) {
  state.selectedOption = null;
  state.feedback = null;
  const payload = await request(`/api/sessions/${state.session.id}/questions/${questionNumber}`);
  if (payload.summary) {
    state.result = payload;
    renderResults();
    return;
  }
  state.question = payload;
  renderTimer(payload.deadlineAt);
  renderQuestion();
}

async function completeSession() {
  state.result = await request(`/api/sessions/${state.session.id}/complete`, { method: 'POST' });
  renderResults();
}

export function createStateSnapshot() {
  return JSON.parse(JSON.stringify(state));
}

export function applyPracticeFeedback(snapshot, payload) {
  return {
    ...snapshot,
    feedback: payload,
    selectedOption: payload.selectedOption,
  };
}

export function applyResults(snapshot, payload) {
  return {
    ...snapshot,
    result: payload,
    feedback: null,
    question: null,
  };
}

async function boot() {
  try {
    // Setup modal overlay click handler
    const modal = qs('import-modal');
    const overlay = modal.querySelector('.modal-overlay');
    overlay.addEventListener('click', closeImportModal);

    // Check if user is logged in
    const persistedUser = readPersistedUser();
    if (persistedUser) {
      state.userId = persistedUser.userId;
      state.username = persistedUser.username;
    } else {
      // No user logged in, show login screen
      renderLoginScreen();
      return;
    }

    // User is logged in, try to restore previous session
    const persistedSessionId = readPersistedSessionId();
    if (persistedSessionId && await restoreSession(Number(persistedSessionId))) {
      return;
    }

    // No active session, load exam sets
    await loadExamSets();
  } catch (error) {
    setStatus(error.message);
  }
}

async function importExam() {
  const fileInput = qs('csv-file');
  const examNameInput = qs('exam-name');
  if (!fileInput || !fileInput.files.length) {
    showToast('Please select a CSV file first', 'error');
    return;
  }

  const file = fileInput.files[0];
  const customExamName = examNameInput ? examNameInput.value.trim() : '';
  
  try {
    showToast(`Importing ${file.name}...`, 'info', 0);
    const csvContent = await file.text();
    const payload = await request('/api/exams/import', {
      method: 'POST',
      body: JSON.stringify({ 
        csvContent, 
        filename: file.name,
        examName: customExamName || undefined,
      }),
    });
    
    closeImportModal();
    showToast(payload.message, 'success', 4000);
    await loadExamSets();
  } catch (error) {
    showToast(`Import failed: ${error.message}`, 'error', 4000);
  }
}

async function clearAllExams() {
  if (!state.deleteMode) {
    // First click: Enter delete mode
    state.deleteMode = true;
    state.selectedExamsForDelete.clear();
    renderExamSelection();
    return;
  }

  // Second click: Delete selected exams
  if (state.selectedExamsForDelete.size === 0) {
    showToast('Please select an exam to delete', 'info');
    return;
  }

  const count = state.selectedExamsForDelete.size;
  const examWord = count === 1 ? 'exam' : 'exams';
  const confirmed = await showConfirmDialog(`Are you sure you want to delete ${count} ${examWord}?\n\nThis action cannot be undone.`);
  if (!confirmed) {
    return;
  }

  try {
    setStatus('Deleting selected exams...');
    // Delete each selected exam
    const examIds = Array.from(state.selectedExamsForDelete);
    console.log('Deleting exams:', examIds);
    
    for (const examId of examIds) {
      console.log(`Deleting exam ${examId}...`);
      const response = await request(`/api/exams/${examId}`, { method: 'DELETE' });
      console.log(`Exam ${examId} deleted:`, response);
    }
    
    setStatus(`${count} ${examWord} deleted`);
    showToast(`${count} ${examWord} deleted successfully`, 'success');
    state.deleteMode = false;
    state.selectedExamsForDelete.clear();
    console.log('Reloading exam sets...');
    await loadExamSets();
    console.log('Exam sets reloaded');
  } catch (error) {
    console.error('Delete error:', error);
    setStatus(`Delete failed: ${error.message}`);
    showToast(`Delete failed: ${error.message}`, 'error');
  }
}

function cancelDeleteMode() {
  state.deleteMode = false;
  state.selectedExamsForDelete.clear();
  renderExamSelection();
}

if (typeof window !== 'undefined') {
  window.importExam = importExam;
  window.clearAllExams = clearAllExams;
  window.cancelDeleteMode = cancelDeleteMode;
  window.openImportModal = openImportModal;
  window.closeImportModal = closeImportModal;
  window.addEventListener('DOMContentLoaded', () => {
    boot();
  });
}

