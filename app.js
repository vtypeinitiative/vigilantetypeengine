import { calculateResults } from './scorer.js';
import { itemParameters } from './itemParameterMatrix.js';


document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let allQuestions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let reportedType = {}; // This will store the final dichotomy results
    let bestFitType = {};
    let currentVerificationIndex = 0;
    let dichotomiesToVerify = [];

    const DICHOTOMY_ORDER = ['E-I', 'S-N', 'T-F', 'J-P'];
    const OMISSION_THRESHOLD = 15; // Threshold for showing a warning

    // Descriptions for verification step
    const VERIFICATION_DESCRIPTIONS = {
        'E': { title: "Extraversion (E)", text: "You direct your energy outwards towards people and things. You feel energized by interacting with others and prefer to be active and engaged in the world." },
        'I': { title: "Introversion (I)", text: "You direct your energy inwards towards ideas and experiences. You feel energized by time spent alone and prefer to reflect before taking action." },
        'S': { title: "Sensing (S)", text: "You prefer to take in information that is real and tangible. You focus on facts, details, and your own direct experience, trusting what is concrete and measurable." },
        'N': { title: "Intuition (N)", text: "You prefer to take in information by seeing the big picture. You focus on patterns, connections, and future possibilities, trusting symbols and metaphors." },
        'T': { title: "Thinking (T)", text: "You prefer to make decisions based on logic and objective analysis. You focus on cause-and-effect and strive for fairness and consistency." },
        'F': { title: "Feeling (F)", text: "You prefer to make decisions based on personal values and the impact on people. You focus on harmony, empathy, and what is important to yourself and others." },
        'J': { title: "Judging (J)", text: "You prefer to live in a planned, orderly way. You enjoy making decisions, having things settled, and organizing your world to achieve goals." },
        'P': { title: "Perceiving (P)", text: "You prefer to live in a flexible, spontaneous way. You enjoy keeping your options open, staying curious, and adapting to new information as it comes." },
    };


    // --- DOM ELEMENTS ---
    const screens = {
        welcome: document.getElementById('welcome-screen'),
        preferenceSkill: document.getElementById('preference-skill-screen'),
        quiz: document.getElementById('quiz-screen'),
        results: document.getElementById('results-screen'),
        verification: document.getElementById('verification-screen'),
        final: document.getElementById('final-screen')
    };

    const startBtn = document.getElementById('start-btn');
    const continueToQuizBtn = document.getElementById('continue-to-quiz-btn');
    const prevBtn = document.getElementById('prev-btn');
    const skipBtn = document.getElementById('skip-btn');
    const verifyBtn = document.getElementById('verify-btn');
    const restartBtn = document.getElementById('restart-btn');

    const progressBar = document.getElementById('progress-bar');
    const questionContainer = document.getElementById('question-container');
    const omissionsWarning = document.getElementById('omissions-warning');
    const resultsDisplay = document.getElementById('results-display');
    const verificationOptions = document.getElementById('verification-options');
    const verificationTitle = document.getElementById('verification-title');
    const verificationInstruction = document.getElementById('verification-instruction');
    const clarityText = document.getElementById('clarity-text');
    const finalTypeDisplay = document.getElementById('final-type-display');

    // --- INITIALIZATION ---
    fetch('./questions.json')
        .then(response => response.json())
        .then(data => {
            allQuestions = data.MBTI_Form_M;
            userAnswers = new Array(allQuestions.length).fill(null);
            startBtn.disabled = false;
        })
        .catch(error => {
            console.error("Failed to load questions:", error);
            document.querySelector('.container').innerHTML = "<h1>Error</h1><p>Could not load assessment questions. Please try again later.</p>";
        });
    startBtn.disabled = true;


    // --- FLOW CONTROL ---
    function switchScreen(activeScreen) {
        for (const screen in screens) {
            screens[screen].classList.remove('active');
        }
        activeScreen.classList.add('active');
    }

    function startPreferenceExplanation() {
        switchScreen(screens.preferenceSkill);
    }

    function startQuiz() {
        currentQuestionIndex = 0;
        showQuestion();
        switchScreen(screens.quiz);
    }

    function showResults() {
        // Omission feedback logic
        const omissionsCount = userAnswers.filter(a => a === null).length;
        if (omissionsCount > OMISSION_THRESHOLD) {
            omissionsWarning.innerHTML = `<strong>Note on Accuracy:</strong> You skipped ${omissionsCount} questions. While this is acceptable, a high number of omissions can sometimes affect the clarity of your results.`;
            omissionsWarning.style.display = 'block';
        } else {
            omissionsWarning.style.display = 'none';
        }

        const answersForScorer = {};
        userAnswers.forEach((answer, index) => {
            if (answer) {
                answersForScorer[index + 1] = answer;
            }
        });

        // Call the scorer. The returned object now directly contains `dichotomyResults`.
        const { dichotomyResults } = calculateResults(answersForScorer, { MBTI_Form_M: allQuestions });
        reportedType = dichotomyResults;

        console.log("Final Dichotomy Results:", reportedType); // For debugging

        displayResults(reportedType);
        switchScreen(screens.results);
    }

    function startVerification() {
        bestFitType = {};
        dichotomiesToVerify = DICHOTOMY_ORDER.filter(key => reportedType[key].pcc === 'Slight');

        // Assume reported type for non-slight preferences
        DICHOTOMY_ORDER.forEach(key => {
            if (reportedType[key].pcc !== 'Slight') {
                bestFitType[key] = reportedType[key].preference;
            }
        });

        if (dichotomiesToVerify.length === 0) {
            // If no dichotomies are 'Slight', all preferences have been set. Show final results.
            showFinalResults();
        } else {
            // If there are 'Slight' dichotomies, start the verification process for them.
            currentVerificationIndex = 0;
            displayVerificationDichotomy();
            switchScreen(screens.verification);
        }
    }

    function showFinalResults() {
        const finalTypeCode = DICHOTOMY_ORDER.map(d => bestFitType[d]).join('');
        finalTypeDisplay.innerHTML = `<h3>${finalTypeCode}</h3>`;
        switchScreen(screens.final);
    }

    // --- QUIZ LOGIC ---
    function showQuestion() {
        const question = allQuestions[currentQuestionIndex];
        let questionHTML = `<div class="question-text">${question.part === 'II' ? 'Which word in each pair appeals to you more?' : question.question}</div><div class="options-container">`;

        for (const key in question.options) {
            const option = question.options[key];
            questionHTML += `
                <label class="option-label" for="option-${key}">
                    <input type="radio" id="option-${key}" name="answer" value="${key}">
                    <span class="radio-custom"></span>
                    <span>${option.text}</span>
                </label>
            `;
        }
        questionHTML += '</div>';
        questionContainer.innerHTML = questionHTML;

        // Auto-advance on selection (except for the very last question)
        document.querySelectorAll('input[name="answer"]').forEach(input => {
            input.addEventListener('change', (e) => {
                // First, visually update the selection
                document.querySelectorAll('.option-label').forEach(label => label.classList.remove('selected'));
                e.target.parentElement.classList.add('selected');

                // Store the user's answer
                userAnswers[currentQuestionIndex] = {
                    questionIndex: currentQuestionIndex,
                    choice: e.target.value
                };

                // Update the button text immediately after a selection is made
                updateNavigationButtons();

                // If it's not the last question, auto-advance after a short delay
                if (currentQuestionIndex < allQuestions.length - 1) {
                    setTimeout(() => advanceToNextQuestion(), 300);
                }
                // If it IS the last question, do NOT auto-advance. User must click "Finish Assessment" button.
            });

            // Handle clearing selection if user clicks the label of an already selected radio button
            // This is crucial for enabling the "Skip and Finish Assessment" state on the last question
            // after a selection was made.
            input.parentElement.addEventListener('click', (e) => {
                const radio = e.currentTarget.querySelector('input[type="radio"]');
                if (radio && radio.checked && e.target !== radio) { // Ensure click wasn't directly on the radio input itself
                    radio.checked = false;
                    radio.parentElement.classList.remove('selected');
                    userAnswers[currentQuestionIndex] = null; // Mark as omitted
                    updateNavigationButtons(); // Update button text back to "Skip and Finish" if on last question
                }
            });
        });

        // Restore previous selection if exists
        const savedAnswer = userAnswers[currentQuestionIndex];
        if (savedAnswer) {
            const selectedInput = document.querySelector(`input[value="${savedAnswer.choice}"]`);
            if (selectedInput) {
                selectedInput.checked = true;
                selectedInput.parentElement.classList.add('selected');
            }
        }

        updateProgress();
        updateNavigationButtons(); // Ensure button text is correct on initial load of question
    }

    function skipQuestion() {
        // If it's the last question, pressing skip means finish the assessment
        if (currentQuestionIndex === allQuestions.length - 1) {
            // The answer for the current question is already null if not selected, or its selected value.
            showResults();
        } else {
            // For other questions, truly skip (mark as null) and advance
            userAnswers[currentQuestionIndex] = null;
            advanceToNextQuestion();
        }
    }

    function advanceToNextQuestion() {
        currentQuestionIndex++;
        if (currentQuestionIndex < allQuestions.length) {
            showQuestion();
        } else {
            showResults();
        }
    }

    function previousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion();
        }
    }

    function updateProgress() {
        const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    function updateNavigationButtons() {
        prevBtn.style.display = currentQuestionIndex === 0 ? 'none' : 'inline-block';

        if (currentQuestionIndex === allQuestions.length - 1) {
            // On the last question:
            if (userAnswers[currentQuestionIndex] !== null) {
                skipBtn.textContent = 'Finish Assessment';
            } else {
                skipBtn.textContent = 'Skip and Finish Assessment';
            }
            skipBtn.classList.remove('btn-secondary'); // Ensure primary style if it was secondary from a prev page
            skipBtn.classList.add('btn-primary');
        } else {
            // For all other questions:
            skipBtn.textContent = 'Skip';
            skipBtn.classList.remove('btn-primary');
            skipBtn.classList.add('btn-secondary'); // Revert to secondary style for skip button
        }
    }


    // --- RESULTS & VERIFICATION DISPLAY ---
    function displayResults(results) {
        resultsDisplay.innerHTML = '';
        DICHOTOMY_ORDER.forEach(key => {
            const result = results[key];
            const [pole1, pole2] = result.dichotomyName.split('-');
            const dichotomyName = `${VERIFICATION_DESCRIPTIONS[pole1].title.split(' ')[0]} / ${VERIFICATION_DESCRIPTIONS[pole2].title.split(' ')[0]}`;

            resultsDisplay.innerHTML += `
                <div class="result-card">
                    <div class="letter">${result.preference}</div>
                    <div class="clarity">${result.pcc}</div>
                    <div class="dichotomy-name">${dichotomyName}</div>
                </div>
            `;
        });
    }

    function displayVerificationDichotomy() {
        const dichotomyKey = dichotomiesToVerify[currentVerificationIndex];
        const [pole1, pole2] = dichotomyKey.split('-');

        verificationTitle.textContent = `Verify: ${VERIFICATION_DESCRIPTIONS[pole1].title} vs. ${VERIFICATION_DESCRIPTIONS[pole2].title}`;
        verificationInstruction.textContent = "Which of these two descriptions feels more like your natural, default way of being?";
        clarityText.textContent = reportedType[dichotomyKey].pcc.toLowerCase();

        verificationOptions.innerHTML = '';
        [pole1, pole2].forEach(pole => {
            const info = VERIFICATION_DESCRIPTIONS[pole];
            verificationOptions.innerHTML += `
                <div class="verification-card">
                    <h3>${info.title}</h3>
                    <p>${info.text}</p>
                    <button class="btn btn-secondary verify-choice-btn" data-choice="${pole}">This is me</button>
                </div>
            `;
        });

        document.querySelectorAll('.verify-choice-btn').forEach(button => {
            button.addEventListener('click', handleVerificationChoice);
        });
    }

    function handleVerificationChoice(e) {
        const choice = e.target.dataset.choice;
        const dichotomyKey = dichotomiesToVerify[currentVerificationIndex];
        bestFitType[dichotomyKey] = choice;

        currentVerificationIndex++;
        if (currentVerificationIndex < dichotomiesToVerify.length) {
            displayVerificationDichotomy();
        } else {
            showFinalResults();
        }
    }


    // --- EVENT LISTENERS ---
    startBtn.addEventListener('click', startPreferenceExplanation);
    continueToQuizBtn.addEventListener('click', startQuiz);
    prevBtn.addEventListener('click', previousQuestion);
    skipBtn.addEventListener('click', skipQuestion);
    verifyBtn.addEventListener('click', startVerification);
    restartBtn.addEventListener('click', () => location.reload());
});