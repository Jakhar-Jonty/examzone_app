import { practiceSessionService } from '../services/practiceSessionService';

export async function startTopicPractice({ subject, topic, questionCount = 15, navigation }) {
  const filters = {};
  if (subject) filters.subject = subject;
  if (topic) filters.topics = [topic];

  const { session } = await practiceSessionService.create({
    sessionType: 'topic-wise',
    filters,
    questionCount,
  });

  navigation.navigate('MainTabs', {
    screen: 'StudyTab',
    params: {
      screen: 'PracticeInterface',
      params: { sessionId: session._id },
    },
  });

  return session;
}
