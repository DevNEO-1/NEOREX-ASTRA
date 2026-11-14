export interface SafetyReviewResult {
  isSafe: boolean;
  reason?: string;
}

/**
 * Disallowed output regex heuristics.
 * NOTE: Regex heuristics provide fast initial scanning, but regex alone does NOT
 * guarantee comprehensive safety. A dedicated multi-pass structural review pipeline
 * inspects content bounds, semantic boundaries, leakage markers, personal information patterns,
 * and dangerous instructions before any model output reaches a student.
 */
const INAPPROPRIATE_LANGUAGE_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|pussy|cock)\b/i,
  /f\*{2,}|s\*{2,}|b\*{2,}/i,
  /\b(kill\s+yourself|suicide|self-harm|hang\s+yourself)\b/i,
  /\b(porn|nsfw|sex|erotic|nude|nudity)\b/i,
];

const DANGEROUS_INSTRUCTION_PATTERNS = [
  /\b(make\s+a\s+bomb|manufacture\s+explosive|poison|cyanide|weapon\s+assembly)\b/i,
  /\b(mix\s+bleach\s+and\s+ammonia|toxic\s+gas\s+recipe|create\s+chlorine\s+gas)\b/i,
  /\b(hack\s+into|bypass\s+firewall|sql\s+injection\s+script|exploit\s+vulnerability)\b/i,
  /\b(steal\s+credit\s+card|counterfeit|phishing\s+template)\b/i,
  /\b(take\s+(this|these|your)\s+(pills?|medicine|medication)|medical\s+diagnosis|call\s+911\s+for\s+treatment)\b/i,
];

const EXTERNAL_LINK_PATTERNS = [
  /https?:\/\/[^\s]+/i,
  /www\.[^\s]+/i,
  /[a-zA-Z0-9-]+\.(com|org|net|io|co|xyz|ru|cn)\b/i,
];

/**
 * Contextual Phone and Personal Identifier detection.
 * Avoids false positives on ordinary scientific numbers (e.g. 14.75 Earth days, 354 hours, 336 hours, 0.84 kg, 1361 W/m²).
 * Rejects actual telephone numbers (US 10-digit, E.164 with international prefix, or contextual phone labels)
 * and email addresses or explicit PII solicitation.
 */
const PHONE_NUMBER_PATTERNS = [
  // 1. Contextual telephone prefix or label followed by 7-15 digits with common phone separators
  /(?:tel(?:ephone)?|phone|call|mobile|cell|fax|sms|contact(?:\s+me)?(?:\s+at)?)\s*[:#-]?\s*(\+?[0-9\s\-().]{7,20})/i,
  // 2. Standard NANP (North American) formatted 10-digit phone number: (xxx) xxx-xxxx, xxx-xxx-xxxx, etc.
  /(?<!\d)(?:\+1[-.\s]?)?(?:\(\d{3}\)[-.\s]?|\b\d{3}[-.\s])\d{3}[-.\s]?\d{4}(?!\d)/,
  // 3. International telephone numbers with leading country code (e.g. +44 20 7946 0958, +49-30-1234567)
  /(?<!\d)\+\d{1,3}[-.\s]?(?:\(?\d{2,4}\)?[-.\s]?)\d{3,4}[-.\s]?\d{3,4}(?!\d)/,
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

const PII_SOLICITATION_PATTERNS = [
  /\b(what\s+is\s+your\s+(real\s+)?name|where\s+do\s+you\s+live|which\s+school\s+do\s+you\s+go\s+to|what\s+is\s+your\s+phone\s+number)\b/i,
  /\b(tell\s+me\s+your\s+address|what('?s|\s+is)\s+your\s+age|send\s+me\s+a\s+photo)\b/i,
];

const PROMPT_LEAKAGE_PATTERNS = [
  /api[_\s-]?key/i,
  /AIza[0-9A-Za-z-_]{35}/, // Google API Key structure
  /system[_\s-]?instruction/i,
  /system[_\s-]?prompt/i,
  /baseTone/i,
  /CHILD\s+SAFETY\s+&\s+ETHICS\s+RULES/i,
  /SCIENTIFIC\s+DISTINCTION\s+RULES/i,
  /TARGET\s+AUDIENCE:\s+(Junior|Space\s+Cadet|Mission\s+Commander)/i,
  /dan\s+mode/i,
  /developer\s+mode/i,
];

/**
 * Dedicated AI Response Safety Reviewer.
 * Inspects all raw text produced by the model before delivery to students.
 * Enforces:
 * 1. Output length and structural envelope limits (<= 1000 characters).
 * 2. Child safety: rejection of profanity, adult material, or abusive language.
 * 3. Physical & cyber safety: rejection of dangerous instructions and weaponization recipes.
 * 4. PII protection: rejection of contextual phone numbers, email addresses, and personal information requests.
 * 5. System defense: rejection of credential leaks, API key fragments, and system instruction reflection.
 */
export function reviewAiResponseSafety(rawText: string): SafetyReviewResult {
  if (typeof rawText !== 'string') {
    return { isSafe: false, reason: 'Response is not a valid string.' };
  }

  const trimmed = rawText.trim();

  // 1. Structural and length bounds check
  if (trimmed.length === 0) {
    return { isSafe: false, reason: 'Response is empty.' };
  }

  if (trimmed.length > 1000) {
    return { isSafe: false, reason: 'Response exceeds maximum allowed length of 1000 characters.' };
  }

  // 2. Prompt and credential leakage inspection
  for (const pattern of PROMPT_LEAKAGE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isSafe: false, reason: 'Response contains prompt leakage or credential disclosure.' };
    }
  }

  // 3. Child protection & inappropriate language inspection
  for (const pattern of INAPPROPRIATE_LANGUAGE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isSafe: false, reason: 'Response contains inappropriate or abusive language.' };
    }
  }

  // 4. Physical and cyber danger inspection
  for (const pattern of DANGEROUS_INSTRUCTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isSafe: false, reason: 'Response contains dangerous instructions or harmful procedures.' };
    }
  }

  // 5. Personal information disclosure or soliciting inspection
  // 5a. Contextual phone number checks
  for (const pattern of PHONE_NUMBER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isSafe: false, reason: 'Response solicits or discloses a phone number.' };
    }
  }

  // 5b. Email address checks
  if (EMAIL_PATTERN.test(trimmed)) {
    return { isSafe: false, reason: 'Response solicits or discloses an email address.' };
  }

  // 5c. Explicit PII solicitation
  for (const pattern of PII_SOLICITATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isSafe: false, reason: 'Response solicits personal identifiable information.' };
    }
  }

  // 6. External link inspection (No external links in child-facing answers)
  for (const pattern of EXTERNAL_LINK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isSafe: false, reason: 'Response contains external URL links or domain references.' };
    }
  }

  return { isSafe: true };
}
