/**
 * BRIDGE CRM - AI Email Generator
 * Uses OpenAI to generate personalized outreach emails
 */

export class AIEmailGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
  }
  
  /**
   * Generate personalized outreach email for a lead
   */
  async generateOutreachEmail(lead, options = {}) {
    const {
      tone = 'professional',
      length = 'medium',
      includeStats = true,
      customMessage = ''
    } = options;
    
    const prompt = this.buildOutreachPrompt(lead, { tone, length, includeStats, customMessage });
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at writing compelling, personalized outreach emails for nonprofit technology donation programs. Your emails are warm, professional, and focus on impact and partnership.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const emailContent = data.choices[0].message.content.trim();
      
      return {
        success: true,
        email: this.parseEmailContent(emailContent),
        tokens: data.usage.total_tokens
      };
      
    } catch (error) {
      console.error('AI Email Generation Error:', error);
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackEmail(lead)
      };
    }
  }
  
  /**
   * Generate follow-up email
   */
  async generateFollowUpEmail(lead, previousEmail, options = {}) {
    const { daysSinceLastContact = 7, reason = 'no response' } = options;
    
    const prompt = `
Generate a friendly follow-up email for this lead:

Company: ${lead.company}
Industry: ${lead.customFields?.vertical || 'Unknown'}
Location: ${lead.customFields?.headquarters || 'Unknown'}
Previous email sent: ${daysSinceLastContact} days ago
Reason for follow-up: ${reason}

Previous email:
${previousEmail}

Write a brief, friendly follow-up that:
1. References the previous email
2. Adds new value or information
3. Makes it easy to respond
4. Doesn't sound pushy

Keep it under 150 words.
`;
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at writing friendly, non-pushy follow-up emails that get responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 400
        })
      });
      
      const data = await response.json();
      const emailContent = data.choices[0].message.content.trim();
      
      return {
        success: true,
        email: this.parseEmailContent(emailContent)
      };
      
    } catch (error) {
      console.error('Follow-up Email Generation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate thank you email after donation
   */
  async generateThankYouEmail(lead, donationDetails) {
    const prompt = `
Generate a heartfelt thank you email for this donor:

Company: ${lead.company}
Donation: ${donationDetails.quantity} laptops
Impact: Will be converted to ${donationDetails.chromebooks} Chromebooks for students in HUBZone communities

Write a warm, genuine thank you email that:
1. Expresses sincere gratitude
2. Describes the impact of their donation
3. Mentions specific numbers (students helped, communities served)
4. Invites them to stay connected
5. Offers to provide updates on impact

Tone: Warm, grateful, inspiring
Length: 200-250 words
`;
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at writing heartfelt, impactful thank you messages for nonprofit donors.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 600
        })
      });
      
      const data = await response.json();
      const emailContent = data.choices[0].message.content.trim();
      
      return {
        success: true,
        email: this.parseEmailContent(emailContent)
      };
      
    } catch (error) {
      console.error('Thank You Email Generation Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Build prompt for outreach email
   */
  buildOutreachPrompt(lead, options) {
    const matchReasons = lead.customFields?.matchReasons || [];
    const expectedChromebooks = lead.customFields?.expectedChromebooks || 0;
    const grantImpact = lead.customFields?.grantImpactPercent || 0;
    
    return `
Generate a personalized outreach email for this potential laptop donor:

Company: ${lead.company}
Industry: ${lead.customFields?.vertical || 'Unknown'}
Type: ${lead.customFields?.type || 'Unknown'}
Location: ${lead.customFields?.headquarters || 'Unknown'}
Employees: ${lead.customFields?.employees || 'Unknown'}
Distance from HTI: ${lead.customFields?.distanceFromHTI || 'Unknown'} miles

Why they're a good fit:
${matchReasons.join('\n')}

Estimated impact:
- ${expectedChromebooks} Chromebooks per year
- ${grantImpact}% contribution to our 5,000 Chromebook goal
- Serving HUBZone communities in North Carolina

About HUBZone Technology Initiative (HTI):
- Nonprofit serving underserved communities in NC
- $600K grant from NC Department of Information Technology
- Goal: Deliver 5,000 Chromebooks to HUBZone communities
- We convert donated laptops to Chromebooks for students
- Free pickup, data destruction, tax deduction

Email requirements:
- Tone: ${options.tone}
- Length: ${options.length} (short=100 words, medium=200 words, long=300 words)
- Include specific reasons why THIS company is a great fit
- Mention their industry/location specifically
- Make it personal, not a template
- Include clear call-to-action
- Mention tax deduction benefit
- Emphasize local NC impact
${options.customMessage ? `- Include this custom message: ${options.customMessage}` : ''}

Format the email with:
Subject: [subject line]
Body: [email body]

Make it compelling and personalized!
`;
  }
  
  /**
   * Parse email content into subject and body
   */
  parseEmailContent(content) {
    const lines = content.split('\n').filter(line => line.trim());
    
    let subject = '';
    let body = '';
    let inBody = false;
    
    for (const line of lines) {
      if (line.toLowerCase().startsWith('subject:')) {
        subject = line.replace(/^subject:\s*/i, '').trim();
      } else if (line.toLowerCase().startsWith('body:')) {
        inBody = true;
        const bodyStart = line.replace(/^body:\s*/i, '').trim();
        if (bodyStart) body += bodyStart + '\n';
      } else if (inBody) {
        body += line + '\n';
      }
    }
    
    // If no explicit subject/body markers, assume first line is subject
    if (!subject && !body) {
      subject = lines[0];
      body = lines.slice(1).join('\n');
    }
    
    return {
      subject: subject.trim(),
      body: body.trim()
    };
  }
  
  /**
   * Generate fallback email (if AI fails)
   */
  generateFallbackEmail(lead) {
    const company = lead.company || 'your organization';
    const location = lead.customFields?.headquarters || 'North Carolina';
    
    return {
      subject: `Partnership Opportunity: Technology Donation Program`,
      body: `Dear ${company} Team,

I hope this message finds you well. I'm reaching out from the HUBZone Technology Initiative, a North Carolina nonprofit working to bridge the digital divide in underserved communities.

We noticed that ${company} in ${location} may have laptop equipment that could make a tremendous impact for students in HUBZone communities. We're currently working toward a goal of delivering 5,000 Chromebooks to students who lack access to technology.

Our program offers:
• Free pickup and logistics
• NIST-compliant data destruction
• Tax deduction documentation
• Impact reporting

Would you be open to a brief conversation about how ${company} could partner with us? Even a small donation of laptops can transform educational opportunities for local students.

Thank you for considering this opportunity to make a difference in North Carolina communities.

Best regards,
HUBZone Technology Initiative
Henderson, NC`
    };
  }
  
  /**
   * Analyze company website and generate insights
   */
  async analyzeCompanyWebsite(url) {
    // This would scrape the website and use AI to extract key info
    // For now, return a placeholder
    return {
      hasSustainabilityProgram: null,
      hasCSRPage: null,
      mentionsDonations: null,
      keyContacts: [],
      insights: []
    };
  }
  
  /**
   * Generate email subject line variations
   */
  async generateSubjectLines(lead, count = 5) {
    const prompt = `
Generate ${count} compelling email subject lines for reaching out to ${lead.company} about laptop donations.

Context:
- We're a nonprofit converting donated laptops to Chromebooks for students
- Located in North Carolina
- They're in the ${lead.customFields?.vertical || 'business'} industry
- Located in ${lead.customFields?.headquarters || 'NC'}

Requirements:
- Keep under 60 characters
- Make them curiosity-inducing
- Avoid spam words
- Personalize to their industry/location
- Mix different approaches (question, benefit, urgency, etc.)

Return just the subject lines, numbered 1-${count}.
`;
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at writing high-converting email subject lines.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.9,
          max_tokens: 200
        })
      });
      
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Parse numbered list
      const subjects = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
      
      return {
        success: true,
        subjects
      };
      
    } catch (error) {
      console.error('Subject Line Generation Error:', error);
      return {
        success: false,
        error: error.message,
        subjects: [
          `Partnership opportunity for ${lead.company}`,
          `Making an impact in NC communities`,
          `Quick question about laptop donations`,
          `Tax-deductible donation opportunity`,
          `Help students in ${lead.customFields?.headquarters || 'NC'}`
        ]
      };
    }
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIEmailGenerator };
}

