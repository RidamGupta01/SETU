const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure API key exists
const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Generates an AI summary and resolution plan for an issue.
 * 
 * @param {Object} issueData - { title, description, category, area, urgencyScore, departmentName }
 * @returns {Promise<{ summary: string, resolutionPlan: string, suggestedLinkedDepartment: string | null }>}
 */
async function generateIssuePlan(issueData) {
  if (!genAI) {
    console.warn('Gemini API key is missing. Returning mock AI response.');
    return {
      summary: `AI Mock Summary: Issue reported at ${issueData.area} regarding ${issueData.category}. Immediate attention required by ${issueData.departmentName}.`,
      resolutionPlan: `### Mock Resolution Plan\n\n1. Dispatch inspection team to ${issueData.area}.\n2. Secure the perimeter and place barricades.\n3. Resolve the ${issueData.category} issue using standard equipment.\n4. Update status to resolved.`,
      suggestedLinkedDepartment: issueData.category === 'pothole' || issueData.category === 'waterlogging' ? 'Traffic' : null,
      estimatedTime: '48 hours',
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
    You are an expert civic administration assistant for the city of Bhopal.
    An issue has been reported by a citizen. Generate a concise summary and a step-by-step resolution plan for the assigned field officers.
    
    Issue Details:
    - Title: ${issueData.title}
    - Description: ${issueData.description}
    - Category: ${issueData.category}
    - Location Area: ${issueData.area}
    - Urgency Score (out of 10): ${issueData.urgencyScore}
    - Primary Department: ${issueData.departmentName}
    
    Your task is to return a JSON object with the following structure exactly:
    {
      "summary": "A 1-2 sentence summary of the issue.",
      "resolutionPlan": "A step-by-step plan (in Markdown) for the field officers to resolve this. Include immediate actions, required equipment, and safety measures.",
      "suggestedLinkedDepartment": "If this issue clearly requires coordination with another specific department (like Traffic, Water, Electricity, PWD, BMC, Pollution Board), output the department name here. Otherwise, return null.",
      "estimatedTime": "Estimated time required from the suggested department (e.g. '24 hours', '3 days'). If no department is suggested, return null."
    }
    
    Return ONLY valid JSON. Do not include markdown code block backticks around the JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Strip markdown JSON block if the model included it despite instructions
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    try {
      const parsed = JSON.parse(text);
      return {
        summary: parsed.summary || 'No summary generated.',
        resolutionPlan: parsed.resolutionPlan || 'No plan generated.',
        suggestedLinkedDepartment: parsed.suggestedLinkedDepartment || null,
        estimatedTime: parsed.estimatedTime || null,
      };
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON. Falling back to raw text.', parseError);
      return {
        summary: 'Failed to generate structured summary.',
        resolutionPlan: text, // Raw text fallback
        suggestedLinkedDepartment: null,
      };
    }
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error('Failed to generate AI plan.');
  }
}

/**
 * Generates a formal, professional order for field officers based on an issue.
 * 
 * @param {Object} issueData - { title, description, category, area, departmentName }
 * @returns {Promise<string>} The generated professional order text
 */
async function generateProfessionalOrder(issueData) {
  if (!genAI) {
    console.warn('Gemini API key is missing. Returning mock AI order.');
    return `### OFFICE OF THE ADMINISTRATOR, ${issueData.departmentName}, BHOPAL\n\n**Subject: Immediate Action Required at ${issueData.area}**\n\nTo the Field Operations Team,\n\nYou are hereby directed to immediately attend to the reported issue: "${issueData.title}".\n\nPlease ensure all safety protocols are followed and the area is secured prior to commencing work. Provide a status update upon completion.\n\nSigned,\nDepartment Admin`;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
    You are the Department Administrator for the city of Bhopal (${issueData.departmentName}).
    An issue has been verified and you need to issue a formal, professional written order to the field officers/workers to resolve it.
    
    Issue Details:
    - Title: ${issueData.title}
    - Description: ${issueData.description}
    - Location Area: ${issueData.area}
    
    Write a formal directive (order). It should:
    1. Start with an official-sounding header (e.g., "OFFICE OF THE ADMINISTRATOR, ${issueData.departmentName}, BHOPAL").
    2. Include a Subject line.
    3. Clearly direct the field teams to address the issue immediately, detailing the expected standard of work.
    4. Mention standard safety protocols.
    5. Be concise (about 3-4 paragraphs max).
    6. End with an official sign-off block.
    
    Return the text directly in Markdown format. Do not use JSON.
  `;

  try {
    const result = await model.generateContent(prompt);
    return (await result.response).text().trim();
  } catch (error) {
    console.error('AI Order Generation Error:', error);
    throw new Error('Failed to generate professional order.');
  }
}

module.exports = {
  generateIssuePlan,
  generateProfessionalOrder
};
