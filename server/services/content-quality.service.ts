export type ContentQualityCheck = {
  passed: boolean;
  score: number;
  issues: string[];
  checks: Record<string, boolean>;
};

const sensitivePatterns = [
  /\b(?:01|02|03|05|06|07|08|09|10|11|12|15)\d{8,9}\b/,
  /(?:رقم الهوية|الرقم القومي|بطاقة|حساب بنكي|كلمة المرور)/i,
];

const riskyClaims = [
  /مضمون 100%/i,
  /اربح بلا مخاطرة/i,
  /نضمن لك/i,
  /لا تخسر أبداً/i,
];

export function validateContentDraft(title: string, body: string, callToAction: string): ContentQualityCheck {
  const text = `${title}\n${body}\n${callToAction}`.trim();
  const issues: string[] = [];
  const checks: Record<string, boolean> = {
    titleLength: title.trim().length >= 8 && title.trim().length <= 140,
    bodyLength: body.trim().length >= 80 && body.trim().length <= 2500,
    hasCallToAction: callToAction.trim().length >= 3,
    noSensitiveData: !sensitivePatterns.some((pattern) => pattern.test(text)),
    noRiskyClaims: !riskyClaims.some((pattern) => pattern.test(text)),
  };

  if (!checks.titleLength) issues.push("العنوان خارج الحد المسموح.");
  if (!checks.bodyLength) issues.push("نص المحتوى خارج الحد المسموح.");
  if (!checks.hasCallToAction) issues.push("لا توجد دعوة واضحة لاتخاذ إجراء.");
  if (!checks.noSensitiveData) issues.push("المحتوى قد يتضمن بيانات حساسة.");
  if (!checks.noRiskyClaims) issues.push("المحتوى يتضمن وعداً أو ادعاءً يحتاج مراجعة.");

  const score = Math.round((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100);
  return { passed: issues.length === 0, score, issues, checks };
}
