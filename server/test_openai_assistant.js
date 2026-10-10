require('dotenv').config();
const openaiAssistantService = require('./services/openaiAssistantService');

async function runTest() {
  try {
    console.log('Testing generateStatusMessage (conversational lifecycle updates)...');
    
    // Test normal status shift
    const msg1 = await openaiAssistantService.generateStatusMessage('Received', 'In Progress', 'pothole', 'MP Nagar');
    console.log('\nStatus Shift Message (Received -> In Progress):');
    console.log(`"${msg1}"`);

    // Test resolved special case
    const msg2 = await openaiAssistantService.generateStatusMessage('In Progress', 'Resolved', 'pothole', 'MP Nagar');
    console.log('\nStatus Shift Message (In Progress -> Resolved):');
    console.log(`"${msg2}"`);

    console.log('\nTesting answerQuestion (grounded citizen Q&A)...');
    
    // Mock citizen's complaints context
    const mockComplaints = [
      {
        complaintNumber: 'CMP-123456',
        complaintType: 'Road Damage',
        status: 'In Progress',
        slaDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        aiCategory: 'pothole'
      }
    ];

    // Test Question 1: specific complaint status
    console.log('\nQuery: "What is the status of my pothole complaint CMP-123456?"');
    const reply1 = await openaiAssistantService.answerQuestion(
      'What is the status of my pothole complaint CMP-123456?',
      mockComplaints
    );
    console.log(`Reply: "${reply1}"`);

    // Test Question 2: static FAQ calculation
    console.log('\nQuery: "How does the platform automatically route complaints?"');
    const reply2 = await openaiAssistantService.answerQuestion(
      'How does the platform automatically route complaints?',
      mockComplaints
    );
    console.log(`Reply: "${reply2}"`);

    // Test Question 3: out of scope / strict validation
    console.log('\nQuery: "What is the weather like in New York today?"');
    const reply3 = await openaiAssistantService.answerQuestion(
      'What is the weather like in New York today?',
      mockComplaints
    );
    console.log(`Reply: "${reply3}"`);

    console.log('\nOpenAI Assistant service tests completed successfully!');
  } catch (err) {
    console.error('Test Failed:', err);
  }
}

runTest();
