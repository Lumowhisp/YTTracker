const natural = require('natural');
const fs = require('fs');
const path = require('path');

const MODEL_PATH = path.join(__dirname, 'model.json');

// We use the Naive Bayes Classifier
let classifier;

const TRAINING_DATA = [
  // Learning Data
  { text: "Learn React JS in 10 minutes", label: "learning" },
  { text: "System Design Interview Prep", label: "learning" },
  { text: "How to build a Node.js REST API", label: "learning" },
  { text: "Data Structures and Algorithms course", label: "learning" },
  { text: "Complete Python Bootcamp", label: "learning" },
  { text: "Understanding Quantum Physics", label: "learning" },
  { text: "Calculus 1 Full Lecture", label: "learning" },
  { text: "Stock Market Investing for Beginners", label: "learning" },
  { text: "How to focus and build discipline", label: "learning" },
  { text: "Study with me 4 hours pomodoro", label: "learning" },
  { text: "MongoDB Crash Course", label: "learning" },
  { text: "Machine Learning Full Course", label: "learning" },
  { text: "History of the Roman Empire", label: "learning" },
  { text: "How memory works huberman lab", label: "learning" },
  { text: "Lex Fridman Podcast AI discussion", label: "learning" },
  
  // Entertainment Data
  { text: "Funny cats compilation", label: "entertainment" },
  { text: "I pranked my best friend", label: "entertainment" },
  { text: "Minecraft gameplay part 1", label: "entertainment" },
  { text: "Try not to laugh challenge", label: "entertainment" },
  { text: "Movie review without spoilers", label: "entertainment" },
  { text: "Reacting to the newest meme", label: "entertainment" },
  { text: "Epic fails caught on camera", label: "entertainment" },
  { text: "My daily vlog in Tokyo", label: "entertainment" },
  { text: "MrBeast gives away 1000 dollars", label: "entertainment" },
  { text: "Cooking a giant pizza", label: "entertainment" },
  { text: "Sidemen hide and seek", label: "entertainment" },
  { text: "Fortnite funny moments", label: "entertainment" },
  { text: "Unboxing the new iPhone 15", label: "entertainment" },
  { text: "Eating only spicy food for 24 hours", label: "entertainment" },
  { text: "Twitch highlights", label: "entertainment" }
];

function initializeModel() {
  if (fs.existsSync(MODEL_PATH)) {
    console.log('🧠 Loading existing ML model...');
    natural.BayesClassifier.load(MODEL_PATH, null, function(err, loadedClassifier) {
      if (err) {
        console.error('Error loading model, retraining...', err);
        trainNewModel();
      } else {
        classifier = loadedClassifier;
        console.log('✅ ML Model loaded successfully!');
      }
    });
  } else {
    trainNewModel();
  }
}

function trainNewModel() {
  console.log('🧠 Training new Naive Bayes ML model...');
  classifier = new natural.BayesClassifier();
  
  TRAINING_DATA.forEach(item => {
    classifier.addDocument(item.text, item.label);
  });
  
  classifier.train();
  
  classifier.save(MODEL_PATH, function(err) {
    if (err) console.error('Error saving ML model', err);
    else console.log('✅ ML Model trained and saved successfully!');
  });
}

function classifyVideo(title, category) {
  if (!classifier) return false;
  
  const textToClassify = `${title} ${category}`.toLowerCase();
  
  // Get raw probabilities
  const classifications = classifier.getClassifications(textToClassify);
  const learningScore = classifications.find(c => c.label === 'learning')?.value || 0;
  const entertainmentScore = classifications.find(c => c.label === 'entertainment')?.value || 0;
  
  // Predict
  const prediction = classifier.classify(textToClassify);
  const isLearning = prediction === 'learning' && (learningScore > entertainmentScore);
  
  return {
    isLearning,
    confidence: isLearning ? learningScore : entertainmentScore,
    raw: classifications
  };
}

function addFeedback(title, category, isLearning) {
  if (!classifier) return;
  const label = isLearning ? 'learning' : 'entertainment';
  const textToClassify = `${title} ${category}`.toLowerCase();
  
  classifier.addDocument(textToClassify, label);
  classifier.train();
  
  classifier.save(MODEL_PATH, function(err) {
    if (err) console.error('Error saving updated ML model', err);
    else console.log(`🧠 Model updated with feedback: "${title}" -> ${label}`);
  });
}

module.exports = {
  initializeModel,
  classifyVideo,
  addFeedback
};
