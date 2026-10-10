const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const apiKey = process.env.ANTHROPIC_API_KEY;
let anthropic = null;
if (apiKey) {
  anthropic = new Anthropic({ apiKey });
}

// In-memory Concurrency Queue Class to rate-limit AI Vision API calls
class ConcurrencyQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.activeCount = 0;
    this.queue = [];
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.next();
    });
  }

  async next() {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const { task, resolve, reject } = this.queue.shift();
    this.activeCount++;

    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.activeCount--;
      this.next();
    }
  }
}

const analysisQueue = new ConcurrencyQueue(2);

/**
 * Helper to fetch file from local path or remote URL and convert to base64
 */
async function getImageSource(photoUrl) {
  let imageBuffer;
  let mimeType = 'image/jpeg';

  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    const res = await fetch(photoUrl);
    if (!res.ok) throw new Error(`Failed to fetch remote image: ${res.statusText}`);
    imageBuffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type');
    if (contentType) mimeType = contentType;
  } else {
    // Local relative URL e.g. '/uploads/filename.jpg'
    const absolutePath = path.join(__dirname, '../public', photoUrl);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File does not exist: ${absolutePath}`);
    }
    imageBuffer = fs.readFileSync(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';
  }

  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  return { base64Data: imageBuffer.toString('base64'), mimeType };
}

/**
 * Core image analysis using Anthropic Claude Vision
 */
async function runClaudeAnalysis(photoUrl) {
  if (!anthropic) {
    console.warn('ANTHROPIC_API_KEY is missing. Simulating Claude photo-analysis fallback.');
    // Simulated mock vision analysis based on typical outputs
    return {
      category: 'pothole',
      severity: 'medium',
      confidence: 0.88,
      description: 'Image shows structural road damage with a prominent pothole in the center lane.'
    };
  }

  const { base64Data, mimeType } = await getImageSource(photoUrl);

  const systemPrompt = `You are an expert AI civic assistant for the city of Bhopal. Your job is to analyze photos of infrastructure issues uploaded by citizens.
  Analyze the provided image and classify the issue.
  You must output ONLY a valid JSON object matching this structure:
  {
    "category": "pothole" | "broken_road" | "open_sewer" | "waterlogging" | "exposed_wiring" | "debris_blockage" | "other",
    "severity": "low" | "medium" | "high",
    "confidence": 0.0 to 1.0 (float reflecting your confidence in the category choice),
    "description": "A very brief, one-sentence description of the visual issue observed in the image."
  }
  Do not include any other text, formatting, explanation, or markdown code block backticks. Output raw JSON.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: 'Please analyze this photo.'
          }
        ]
      }
    ]
  });

  const textResponse = response.content[0].text.trim();
  try {
    const parsed = JSON.parse(textResponse);
    // Strict validation
    const validCategories = ["pothole", "broken_road", "open_sewer", "waterlogging", "exposed_wiring", "debris_blockage", "other"];
    const validSeverities = ["low", "medium", "high"];
    
    if (!validCategories.includes(parsed.category)) parsed.category = "other";
    if (!validSeverities.includes(parsed.severity)) parsed.severity = "medium";
    parsed.confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
    parsed.description = parsed.description || "Civic infrastructure issue observed.";
    
    return parsed;
  } catch (err) {
    console.error('Failed to parse Anthropic JSON response:', textResponse);
    throw new Error('Vision API returned invalid JSON.');
  }
}

/**
 * Exposed API to analyze image (queued to protect concurrency)
 */
exports.analyzeImage = (photoUrl) => {
  return analysisQueue.enqueue(() => runClaudeAnalysis(photoUrl));
};
