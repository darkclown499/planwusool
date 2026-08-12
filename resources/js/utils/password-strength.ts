export type PasswordScore = 0 | 1 | 2 | 3 | 4;

const COMMON_PASSWORDS = new Set([
 'password', 'password1', 'password123', '123456', '12345678', '123456789',
 '1234567890', '123123', '12345', 'qwerty', 'qwerty123', 'abc123', '111111',
 '000000', 'letmein', 'welcome', 'iloveyou', 'admin', 'admin123', 'password!',
 'pa55word', 'trustno1', 'sunshine', 'princess', 'football', 'monkey', 'dragon',
 'Baseball', 'master', '654321', 'abcd1234', '0123456789',
]);

export function getPasswordScore(password: string): PasswordScore {
 if (!password) return 0;

 let score = 0;
 if (password.length >= 8) score += 1;
 if (password.length >= 12) score += 1;
 if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
 if (/\d/.test(password)) score += 1;
 if (/[^A-Za-z0-9]/.test(password)) score += 1;

 if (COMMON_PASSWORDS.has(password.toLowerCase())) {
  score = Math.min(score, 1);
 }

 return Math.min(Math.max(score, 0), 4) as PasswordScore;
}

export function passwordScoreColor(score: PasswordScore): string {
 switch (score) {
  case 1:
   return '#ef4444';
  case 2:
   return '#f59e0b';
  case 3:
   return '#10b981';
  case 4:
   return '#10b981';
  default:
   return '#d1d5db';
 }
}

export function passwordScoreLabelKey(score: PasswordScore): string {
 switch (score) {
  case 1:
   return 'Weak';
  case 2:
   return 'Fair';
  case 3:
   return 'Good';
  case 4:
   return 'Strong';
  default:
   return '';
 }
}