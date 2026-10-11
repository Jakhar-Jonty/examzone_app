/** Shared result analytics helpers (parity with web ResultPage). */

const getQuestionId = (q) => {
  if (!q) return null;
  if (typeof q === 'string') return q;
  return q._id?.toString?.() || q.toString?.() || null;
};

const normalizeDifficulty = (raw) => {
  if (!raw || raw === 'Unknown' || String(raw).trim() === '') return null;
  const d = String(raw).trim().toLowerCase();
  if (d === 'easy') return 'Easy';
  if (d === 'medium') return 'Medium';
  if (d === 'hard') return 'Hard';
  return d.charAt(0).toUpperCase() + d.slice(1);
};

const fieldFromAnswer = (answer, key) =>
  answer?.[key] || answer?.question?.[key] || null;

export const calculateSectionAnalysis = (result) => {
  const sections = result?.exam?.sections;
  if (!Array.isArray(sections) || sections.length === 0) return null;

  const examMarksPerQuestion = result?.exam?.marksPerQuestion || 1;

  return sections.map((section, sectionIndex) => {
    const sectionQuestionIds = (section.questions || []).map(getQuestionId).filter(Boolean);

    const sectionAnswers = (result.answers || []).filter((answer) => {
      const qid = getQuestionId(answer.question);
      return qid && sectionQuestionIds.some((id) => id === qid);
    });

    const totalQuestions = sectionAnswers.length;
    const correct = sectionAnswers.filter((a) => a.isCorrect).length;
    const wrong = sectionAnswers.filter((a) => !a.isCorrect && a.selectedAnswer).length;
    const unattempted = sectionAnswers.filter((a) => !a.selectedAnswer).length;
    const sectionScore = sectionAnswers.reduce(
      (sum, a) => sum + (a.marksObtained ?? a.netMarks ?? 0),
      0
    );
    const sectionMarksPerQuestion = section.marksPerQuestion || examMarksPerQuestion || 1;
    const sectionTotalMarks = totalQuestions * sectionMarksPerQuestion;
    const sectionPercentage =
      sectionTotalMarks > 0 ? (sectionScore / sectionTotalMarks) * 100 : 0;
    const totalTimeSpent = sectionAnswers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const avgTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;
    const cutoffMet = section.cutoff != null ? sectionScore >= section.cutoff : null;

    return {
      index: sectionIndex,
      name: section.name,
      description: section.description,
      timeLimit: section.timeLimit,
      cutoff: section.cutoff,
      totalQuestions,
      correct,
      wrong,
      unattempted,
      sectionScore,
      sectionTotalMarks,
      sectionPercentage,
      avgTimePerQuestion,
      cutoffMet,
      questionIds: sectionQuestionIds,
    };
  });
};

export const calculateSubjectTopicAnalysis = (result) => {
  if (!result?.answers) return { subjects: {}, topics: {} };

  const subjectStats = {};
  const topicStats = {};

  result.answers.forEach((answer) => {
    const subject = fieldFromAnswer(answer, 'subject') || 'Unknown';
    const topic = fieldFromAnswer(answer, 'topic') || 'Unknown';
    const marks = answer.question?.marks || 1;
    const obtained = answer.marksObtained ?? answer.netMarks ?? (answer.isCorrect ? marks : 0);

    if (!subjectStats[subject]) {
      subjectStats[subject] = {
        total: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        totalMarks: 0,
        obtainedMarks: 0,
      };
    }
    subjectStats[subject].total++;
    subjectStats[subject].totalMarks += marks;
    if (answer.isCorrect) {
      subjectStats[subject].correct++;
      subjectStats[subject].obtainedMarks += obtained;
    } else if (answer.selectedAnswer) {
      subjectStats[subject].wrong++;
    } else {
      subjectStats[subject].unattempted++;
    }

    if (!topicStats[topic]) {
      topicStats[topic] = {
        total: 0,
        correct: 0,
        wrong: 0,
        unattempted: 0,
        totalMarks: 0,
        obtainedMarks: 0,
      };
    }
    topicStats[topic].total++;
    topicStats[topic].totalMarks += marks;
    if (answer.isCorrect) {
      topicStats[topic].correct++;
      topicStats[topic].obtainedMarks += obtained;
    } else if (answer.selectedAnswer) {
      topicStats[topic].wrong++;
    } else {
      topicStats[topic].unattempted++;
    }
  });

  Object.values(subjectStats).forEach((stats) => {
    stats.percentage = stats.totalMarks > 0 ? (stats.obtainedMarks / stats.totalMarks) * 100 : 0;
    stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });
  Object.values(topicStats).forEach((stats) => {
    stats.percentage = stats.totalMarks > 0 ? (stats.obtainedMarks / stats.totalMarks) * 100 : 0;
    stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  return { subjects: subjectStats, topics: topicStats };
};

export const calculateDifficultyAnalysis = (result) => {
  if (!result?.answers) return {};

  const difficultyStats = {};

  result.answers.forEach((answer) => {
    const difficulty = normalizeDifficulty(fieldFromAnswer(answer, 'difficulty'));
    if (!difficulty) return;

    if (!difficultyStats[difficulty]) {
      difficultyStats[difficulty] = { total: 0, correct: 0, wrong: 0, unattempted: 0 };
    }
    difficultyStats[difficulty].total++;
    if (answer.isCorrect) difficultyStats[difficulty].correct++;
    else if (answer.selectedAnswer) difficultyStats[difficulty].wrong++;
    else difficultyStats[difficulty].unattempted++;
  });

  Object.values(difficultyStats).forEach((stats) => {
    stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
  });

  return difficultyStats;
};

export const calculateTimeAnalysis = (result) => {
  if (!result?.answers) return null;

  const totalTime = result.timeTaken || 0;
  const totalQuestions = result.answers.length;
  const avgTimePerQuestion = totalQuestions > 0 ? totalTime / totalQuestions : 0;

  const questionTimes = result.answers.map((answer, index) => ({
    questionNumber: index + 1,
    timeSpent: answer.timeSpent || 0,
    isCorrect: answer.isCorrect,
    difficulty: normalizeDifficulty(fieldFromAnswer(answer, 'difficulty')),
  }));

  const timeByDifficulty = {};
  questionTimes.forEach((qt) => {
    const diff = qt.difficulty;
    if (!diff) return;
    if (!timeByDifficulty[diff]) {
      timeByDifficulty[diff] = { total: 0, count: 0, correct: 0, wrong: 0 };
    }
    timeByDifficulty[diff].total += qt.timeSpent;
    timeByDifficulty[diff].count++;
    if (qt.isCorrect) timeByDifficulty[diff].correct++;
    else timeByDifficulty[diff].wrong++;
  });

  Object.values(timeByDifficulty).forEach((stats) => {
    stats.avgTime = stats.count > 0 ? stats.total / stats.count : 0;
  });

  return {
    totalTime,
    avgTimePerQuestion,
    questionTimes,
    timeByDifficulty,
  };
};

export const answerInSection = (answer, sectionAnalysisItem) => {
  if (!sectionAnalysisItem?.questionIds?.length) return true;
  const qid = getQuestionId(answer.question);
  return qid && sectionAnalysisItem.questionIds.includes(qid);
};
