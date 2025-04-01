// DOM Elements
const textBox = document.querySelector('.textBox');
const welcomeScreen = document.querySelector('.welcome-screen');
const testScreen = document.querySelector('.test-screen');
const resultsScreen = document.querySelector('.results-screen');
const startBtn = document.querySelector('.start-btn');
const restartBtn = document.querySelector('.restart-test-btn');
const testAgainBtn = document.querySelector('.test-again-btn');
const shareResultsBtn = document.querySelector('.share-results-btn');
const testParagraph = document.querySelector('.test-paragraph');
const timerValue = document.querySelector('.timer-value');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const sourceBtns = document.querySelectorAll('.source-btn');
const loadingIndicator = document.querySelector('.loading-indicator');
const offlineNotice = document.querySelector('.offline-notice');

// Stats Elements
const speedStat = document.querySelector('.speed');
const accuracyStat = document.querySelector('.accuracy');
const timeStat = document.querySelector('.time');
const charCountStat = document.querySelector('.char-count');
const wordCountStat = document.querySelector('.word-count');
const errorCountStat = document.querySelector('.error-count');

// Local paragraphs categorized by difficulty
const localParagraphs = {
  easy: [
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs.",
    "How vexingly quick daft zebras jump!",
    "Bright vixens jump; dozy fowl quack.",
    "Sphinx of black quartz, judge my vow."
  ],
  medium: [
    "I was born into a middle-class Tamil family in the island town of Rameswaram.",
    "The Simla bazaar, with its cinemas and restaurants, was about three miles from the school.",
    "In January, before the flame tree in our garden burst into scarlet blossom.",
    "The famous Shiva temple was about a ten-minute walk from our house.",
    "I had the train compartment to myself up to Rohana, then a girl got in."
  ],
  hard: [
    "My father, Jainulabdeen, had neither much formal education nor much wealth; despite these disadvantages, he possessed great innate wisdom and a true generosity of spirit. He had an ideal helpmate in my mother, Ashiamma, who was equally kind and generous.",
    "Mr. Oliver, a bachelor, usually strolled into the town in the evening, returning after dark, when he would take a short cut through the pine forest. When there was a strong wind the pine trees made sad, eerie sounds that kept most people to the main road.",
    "Harold's father escorted his wife into a great hole high in the tree trunk. In this weather-beaten hollow, generation upon generation of Great Indian Hornbills had been raised. Harold's mother, like other female hornbills before her, was enclosed within the hole by a sturdy wall of earth.",
    "Our locality was predominantly Muslim, but there were quite a few Hindu families too, living amicably with their Muslim neighbours. There was a very old mosque in our locality where my father would take me for evening prayers.",
    "The couple who saw her off were probably her parents. They seemed very anxious about her comfort and the woman gave the girl detailed instructions as to where to keep her things, when not to lean out of windows, and how to avoid speaking to strangers."
  ]
};

// App state
let state = {
  currentText: "",
  typedText: "",
  startTime: null,
  endTime: null,
  timerInterval: null,
  elapsedTime: 0,
  charIndex: 0,
  errors: 0,
  completed: false,
  difficulty: "medium",
  source: "wiki",
  isOffline: false
};

// Initialize difficulty buttons
difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    difficultyBtns.forEach(b => {
      b.classList.remove('selected', 'bg-indigo-600', 'text-white');
      b.classList.add('bg-gray-200');
    });
    btn.classList.add('selected', 'bg-indigo-600', 'text-white');
    btn.classList.remove('bg-gray-200');
    state.difficulty = btn.dataset.difficulty;
  });
});

// Initialize source buttons
sourceBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sourceBtns.forEach(b => {
      b.classList.remove('selected', 'bg-indigo-600', 'text-white');
      b.classList.add('bg-gray-200');
    });
    btn.classList.add('selected', 'bg-indigo-600', 'text-white');
    btn.classList.remove('bg-gray-200');
    state.source = btn.dataset.source;
  });
});

// Check if online
function isOnline() {
  return navigator.onLine;
}

// Fetch content from Wikipedia with proper difficulty handling
async function fetchWikipediaContent() {
  try {
    loadingIndicator.classList.remove('hidden');

    // Define parameters based on difficulty
    let params = {
      easy: { sentences: 3, chars: 150 },
      medium: { sentences: 5, chars: 300 },
      hard: { sentences: 8, chars: 500 }
    }[state.difficulty];

    // First try to get a suitable extract
    const extractResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/random/summary`);
    if (!extractResponse.ok) throw new Error('Failed to fetch Wikipedia content');

    const data = await extractResponse.json();
    let text = data.extract || "";

    // If extract is too short, try to get more content
    if (text.length < params.chars / 2) {
      const title = data.title || "Computer programming";
      const pageResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(title)}&origin=*`);
      const pageData = await pageResponse.json();
      const pages = pageData.query.pages;
      text = pages[Object.keys(pages)[0]].extract || text;
    }

    // Process the text
    text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Split into sentences and select based on difficulty
    const sentences = text.split('. ').filter(s => s.length > 10);
    if (sentences.length === 0) throw new Error('No valid sentences found');

    // Select appropriate number of sentences
    let selectedSentences = sentences.slice(0, params.sentences);
    text = selectedSentences.join('. ') + (selectedSentences.length ? '.' : '');

    // Ensure proper length
    if (text.length > params.chars) {
      text = text.substring(0, params.chars).replace(/\.[^.]*$/, '.');
    }

    loadingIndicator.classList.add('hidden');
    return text || getLocalParagraph(); // Fallback to local if empty
  } catch (error) {
    console.error("Error fetching from Wikipedia:", error);
    loadingIndicator.classList.add('hidden');
    showNotification('Using local paragraphs instead', 'bg-amber-500');
    state.isOffline = true;
    return getLocalParagraph();
  }
}

// Get local paragraph based on difficulty
function getLocalParagraph() {
  const paragraphs = localParagraphs[state.difficulty] || localParagraphs.medium;
  return paragraphs[Math.floor(Math.random() * paragraphs.length)];
}

// Get test text based on source and connection
async function getTestText() {
  if (state.source === "wiki" && isOnline()) {
    return await fetchWikipediaContent();
  } else {
    if (state.source === "wiki" && !isOnline()) {
      showNotification('Offline: Using local paragraphs', 'bg-amber-500');
      state.isOffline = true;
    }
    return getLocalParagraph();
  }
}

// Show notification
function showNotification(message, bgColor = 'bg-indigo-600') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = `fixed bottom-5 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg z-50 shadow-lg transition-opacity duration-300`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('opacity-0');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Start the test
async function startTest() {
  state = {
    ...state,
    typedText: "",
    startTime: null,
    endTime: null,
    elapsedTime: 0,
    charIndex: 0,
    errors: 0,
    completed: false
  };

  state.currentText = await getTestText();
  if (!state.currentText) {
    showNotification('Failed to load content', 'bg-red-500');
    return;
  }

  testParagraph.innerHTML = '';
  state.currentText.split('').forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.className = 'char';
    if (char === ' ') span.classList.add('inline-block', 'w-1');
    if (index === 0) span.classList.add('active');
    testParagraph.appendChild(span);
  });

  welcomeScreen.classList.add('hidden');
  testScreen.classList.remove('hidden');
  textBox.value = '';
  textBox.focus();
}

// Timer functions
function startTimer() {
  state.startTime = Date.now();
  state.timerInterval = setInterval(() => {
    state.elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
    timerValue.textContent = `${state.elapsedTime}s`;
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.endTime = Date.now();
}

// Calculate results
function calculateResults() {
  const totalTimeInSeconds = state.elapsedTime || 1; // Prevent division by zero
  const wordCount = state.currentText.trim().split(/\s+/).length;
  const wpm = Math.round((wordCount / totalTimeInSeconds) * 60);
  const totalChars = state.currentText.length;
  const accuracy = Math.max(0, Math.round(((totalChars - state.errors) / totalChars) * 100));

  return {
    wpm,
    accuracy,
    time: totalTimeInSeconds,
    charCount: totalChars,
    wordCount,
    errorCount: state.errors
  };
}

// Update progress
function updateProgress() {
  const progress = Math.min(100, (state.charIndex / state.currentText.length) * 100);
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `${Math.round(progress)}%`;
}

// Show results
function showResults() {
  stopTimer();
  const results = calculateResults();

  speedStat.textContent = results.wpm;
  accuracyStat.textContent = `${results.accuracy}%`;
  timeStat.textContent = results.time;
  charCountStat.textContent = results.charCount;
  wordCountStat.textContent = results.wordCount;
  errorCountStat.textContent = results.errorCount;

  testScreen.classList.add('hidden');
  resultsScreen.classList.remove('hidden');
}

// Handle user input
textBox.addEventListener('input', (e) => {
  if (!state.startTime) startTimer();

  const chars = testParagraph.querySelectorAll('.char');
  const inputValue = e.target.value;
  state.typedText = inputValue;

  for (let i = 0; i < chars.length; i++) {
    chars[i].classList.remove('correct', 'incorrect', 'active');

    if (i < inputValue.length) {
      if (inputValue[i] === state.currentText[i]) {
        chars[i].classList.add('correct');
      } else {
        chars[i].classList.add('incorrect');
        if (i >= state.charIndex) state.errors++;
      }
    } else if (i === inputValue.length) {
      chars[i].classList.add('active');
    }
  }

  state.charIndex = inputValue.length;
  updateProgress();

  if (inputValue.length === state.currentText.length && !state.completed) {
    state.completed = true;
    showResults();
  }
});

// Event Listeners
startBtn.addEventListener('click', startTest);
restartBtn.addEventListener('click', () => {
  stopTimer();
  testScreen.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');
});
testAgainBtn.addEventListener('click', () => {
  resultsScreen.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');
});

shareResultsBtn.addEventListener('click', () => {
  const results = calculateResults();
  const shareText = `🚀 Typing Test Results:\n🏁 ${results.wpm} WPM\n🎯 ${results.accuracy}% accuracy\n⏱️ ${results.time}s\n📝 ${results.wordCount} words\n❌ ${results.errorCount} errors`;

  if (navigator.share) {
    navigator.share({
      title: 'Typing Test Results',
      text: shareText
    }).catch(() => fallbackShare(shareText));
  } else {
    fallbackShare(shareText);
  }

  function fallbackShare(text) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Results copied!', 'bg-green-500');
    }).catch(() => {
      showNotification('Failed to share', 'bg-red-500');
    });
  }
});

testParagraph.addEventListener('click', () => textBox.focus());

// Network status listeners
window.addEventListener('online', () => {
  state.isOffline = false;
  if (state.source === "wiki") {
    showNotification('Back online - Wikipedia available', 'bg-green-500');
  }
});

window.addEventListener('offline', () => {
  state.isOffline = true;
  if (state.source === "wiki") {
    showNotification('Offline - Using local content', 'bg-amber-500');
  }
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  if (!isOnline()) {
    state.isOffline = true;
    const localBtn = Array.from(sourceBtns).find(b => b.dataset.source === 'local');
    if (localBtn) localBtn.click();
    showNotification('Offline - Using local content', 'bg-amber-500');
  }
});