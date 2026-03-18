const STORAGE_KEY = 'pmp-active-session-id';

const state = {
  exams: [],
  session: null,
  question: null,
  selectedOption: null,
  feedback: null,
  result: null,
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
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
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

function syncPersistedSession(session) {
  if (shouldPersistSession(session)) {
    persistSessionId(session.id);
    return;
  }
  clearPersistedSessionId();
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
  const examCards = state.exams.map((exam) => `
    <article class="exam-card">
      <h2>${exam.title}</h2>
      <p>Questions: ${exam.questionCount}</p>
      <p>${exam.importSummary ?? 'Imported with no warnings.'}</p>
      <div class="actions">
        <button data-start="${exam.id}:practice">Practice Mode</button>
        <button class="secondary" data-start="${exam.id}:exam">Exam Mode</button>
      </div>
    </article>
  `).join('');

  qs('app').innerHTML = `
    <section>
      <h2>Manage Exams</h2>
      <div class="import-controls">
        <div>
          <label for="csv-file">Import from CSV:</label>
          <input type="file" id="csv-file" accept=".csv" />
          <button id="import-btn" onclick="window.importExam()">Import Exam</button>
          <button id="clear-btn" class="secondary" onclick="window.clearAllExams()">Clear All</button>
        </div>
      </div>
      <h2>Select an exam set</h2>
      <p>Imported exams may be shorter than 200 questions if invalid CSV rows were skipped during import.</p>
      <div class="grid exam-grid">${examCards || '<p>No ready exam sets are available.</p>'}</div>
    </section>
  `;

  qs('app').querySelectorAll('[data-start]').forEach((button) => {
    button.addEventListener('click', async () => {
      const [examSetId, mode] = button.dataset.start.split(':');
      await startSession({ examSetId: Number(examSetId), mode });
    });
  });
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

      <h2>${formatBulletPoints(question.prompt)}</h2>
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
  state.selectedOption = null;
  state.feedback = null;
  state.result = null;
  clearPersistedSessionId();
}

async function loadExamSets() {
  const payload = await request('/api/exams');
  state.exams = payload.items;
  setStatus('Choose Practice mode for immediate feedback or Exam mode for timed simulation.');
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
  await loadQuestion(session.currentQuestionNumber);
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
  await loadQuestion(session.currentQuestionNumber);
  return true;
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
    const persistedSessionId = readPersistedSessionId();
    if (persistedSessionId && await restoreSession(Number(persistedSessionId))) {
      return;
    }
    await loadExamSets();
  } catch (error) {
    setStatus(error.message);
  }
}

async function importExam() {
  const fileInput = qs('csv-file');
  if (!fileInput || !fileInput.files.length) {
    setStatus('Please select a CSV file first');
    return;
  }

  const file = fileInput.files[0];
  try {
    setStatus(`Importing ${file.name}...`);
    const csvContent = await file.text();
    const payload = await request('/api/exams/import', {
      method: 'POST',
      body: JSON.stringify({ csvContent, filename: file.name }),
    });
    fileInput.value = ''; // Clear input
    alert(payload.message);
    setStatus('');
    await loadExamSets();
  } catch (error) {
    alert(`Import failed: ${error.message}`);
    setStatus('');
  }
}

async function clearAllExams() {
  if (!confirm('Are you sure you want to delete all exams and sessions? This cannot be undone.')) {
    return;
  }

  try {
    setStatus('Clearing database...');
    await request('/api/exams', { method: 'DELETE' });
    setStatus('All exams cleared');
    await loadExamSets();
  } catch (error) {
    setStatus(`Clear failed: ${error.message}`);
  }
}

if (typeof window !== 'undefined') {
  window.importExam = importExam;
  window.clearAllExams = clearAllExams;
  window.addEventListener('DOMContentLoaded', () => {
    boot();
  });
}

