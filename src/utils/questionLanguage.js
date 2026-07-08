const normalizeLanguage = (language) => (language === 'Hindi' ? 'Hindi' : 'English');

export const getQuestionTranslation = (question, language) => {
  if (!question) return null;

  const lang = normalizeLanguage(language);
  if (lang === 'English') return null;

  const fromTranslations = question.translations?.find((t) => t.language === lang);
  if (fromTranslations?.questionText) return fromTranslations;

  if (lang === 'Hindi' && question.questionTextHindi) {
    return {
      language: 'Hindi',
      questionText: question.questionTextHindi,
      options: question.optionsHindi || [],
      explanation: question.explanationHindi || '',
    };
  }

  return null;
};

export const getLocalizedQuestionText = (question, language) => {
  const translation = getQuestionTranslation(question, language);
  if (translation?.questionText) return translation.questionText;
  return question?.questionText || '';
};

export const getLocalizedQuestionOptions = (question, language) => {
  const translation = getQuestionTranslation(question, language);
  if (translation?.options?.length) return translation.options;
  return question?.options || [];
};

export const getLocalizedExplanation = (question, language) => {
  const translation = getQuestionTranslation(question, language);
  if (translation?.explanation) return translation.explanation;
  return question?.explanation || '';
};

export const hasHindiContent = (question) => {
  if (!question) return false;
  if (question.questionTextHindi) return true;
  if (question.optionsHindi?.length) return true;
  return question.translations?.some((t) => t.language === 'Hindi' && t.questionText);
};

export const supportsLanguageSwitch = (exam, answers = []) => {
  if (exam?.language === 'Both') return true;
  return (answers || []).some((answer) => hasHindiContent(answer?.question));
};

export const resolveDisplayLanguage = (examLanguage, userPreferred) => {
  if (examLanguage === 'Both') {
    if (userPreferred === 'Hindi' || userPreferred === 'English') {
      return userPreferred;
    }
    return 'English';
  }
  return examLanguage || 'English';
};
