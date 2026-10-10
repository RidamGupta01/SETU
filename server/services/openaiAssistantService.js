const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
let openai = null;
if (apiKey) {
  openai = new OpenAI({ apiKey });
}

// Load FAQ dataset
let faqs = [];
try {
  const faqPath = path.join(__dirname, '../data/faq.json');
  if (fs.existsSync(faqPath)) {
    faqs = JSON.parse(fs.readFileSync(faqPath, 'utf8'));
  }
} catch (err) {
  console.error('Failed to load faq.json:', err.message);
}

/**
 * Generates a short, natural update message on status change.
 * Falls back to templated string if OpenAI is not set up or fails.
 */
async function generateStatusMessage(oldStatus, newStatus, category, area) {
  const fallbackMsg = `Your ${category || 'complaint'} complaint status has updated from '${oldStatus || 'None'}' to '${newStatus}'.`;
  
  if (!openai) {
    // Elegant template fallback if offline / key missing
    if (newStatus.toLowerCase() === 'resolved') {
      return `Great news — your reported ${category || 'issue'} at ${area || 'Bhopal'} has been resolved! Please share your feedback.`;
    }
    return fallbackMsg;
  }

  const prompt = `
    Write a short, friendly, natural-sounding status update message (1-2 sentences) addressed to a citizen.
    Facts provided:
    - Complaint Category: ${category || 'Civic Issue'}
    - Location Area: ${area || 'Bhopal'}
    - Old Status: ${oldStatus || 'None'}
    - New Status: ${newStatus}

    Instructions:
    - Phrase these facts naturally and warmly.
    - Do NOT invent or add any details, estimated times, or facts not explicitly provided above.
    - If new status is "resolved", make the message enthusiastic about completion (e.g. "Great news - your reported pothole has been resolved!").
    
    Output ONLY the final text. No markdown backticks.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a polite civic assistant for the city of Bhopal.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI status message generation error:', err.message);
    return fallbackMsg;
  }
}

/**
 * Answers free-text citizen questions grounded in their complaints list and static FAQs.
 */
async function answerQuestion(question, userComplaints = []) {
  if (!openai) {
    console.warn('OpenAI API key is missing. Simulating Q&A assistant fallback.');
    // offline mock responder
    const query = question.toLowerCase();
    if (query.includes('status') || query.includes('my complaint') || query.includes('where')) {
      if (userComplaints.length === 0) return "You don't have any active complaints filed in SahayogBhopal at the moment.";
      const last = userComplaints[0];
      return `You have filed complaint #${last.complaintNumber} regarding '${last.complaintType}' which is currently in state '${last.status}'.`;
    }
    if (query.includes('sla') || query.includes('time') || query.includes('how long')) {
      return "All complaints in SahayogBhopal have a standard resolution SLA of 7 days. If unresolved, they flag as SLA overdue.";
    }
    return "I'm sorry, I don't know the answer to that. Please ask about your complaints' status or SahayogBhopal operations.";
  }

  // Format complaints context
  const complaintsContext = userComplaints.map(c => 
    `- Complaint #${c.complaintNumber}: type='${c.complaintType}', status='${c.status}', SLA deadline='${c.slaDeadline}', AI category='${c.aiCategory || 'none'}'`
  ).join('\n');

  // Format FAQ context
  const faqContext = faqs.map(f => 
    `Q: ${f.question}\nA: ${f.answer}`
  ).join('\n\n');

  const systemInstructions = `
    You are the read-only AI Assistant for SahayogBhopal, a civic coordination app in Bhopal.
    Your job is to answer citizen questions about their complaints and the SahayogBhopal platform.
    
    You must obey these rules strictly:
    1. Answer ONLY using the Grounding Context provided below.
    2. If the context does not contain enough information to answer the question, say exactly: "I'm sorry, I don't know the answer to that." Do not attempt to guess or use outside knowledge.
    3. You are read-only and advisory. You can NEVER take actions, change status, reassign departments, or modify complaints.
    4. Keep answers concise, polite, and helpful.

    Grounding Context:
    === Citizen's Complaints ===
    ${complaintsContext || 'No active complaints.'}

    === Static platform FAQs ===
    ${faqContext}
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: question }
      ],
      temperature: 0.2,
      max_tokens: 300
    });

    return completion.choices[0].message.content.trim();
  } catch (err) {
    console.error('OpenAI Q&A Assistant error:', err.message);
    throw new Error('AI Assistant is currently unavailable.');
  }
}

module.exports = {
  generateStatusMessage,
  answerQuestion
};
