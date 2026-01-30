import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function QuestionDetailScreen({ route, navigation }) {
  const { questionId, savedQuestionId } = route.params;
  const { colors } = useTheme();
  const [question, setQuestion] = useState(null);
  const [savedQuestion, setSavedQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('needs-review');

  const styles = createStyles(colors);

  useEffect(() => {
    fetchQuestion();
  }, [questionId, savedQuestionId]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      
      // If we have savedQuestionId, fetch the saved question which includes the question
      if (savedQuestionId) {
        const response = await api.get('/user/questions/saved');
        const savedQuestions = response.data.savedQuestions || [];
        const found = savedQuestions.find(sq => sq._id === savedQuestionId);
        if (found) {
          setSavedQuestion(found);
          setQuestion(found.question);
          setNotes(found.notes || '');
          setTags(found.tags?.join(', ') || '');
          setStatus(found.status || 'needs-review');
        }
      } else if (questionId) {
        // Fetch question directly (if API supports it)
        // For now, we'll need to get it from saved questions or another endpoint
        const response = await api.get('/user/questions/saved');
        const savedQuestions = response.data.savedQuestions || [];
        const found = savedQuestions.find(sq => sq.question?._id === questionId);
        if (found) {
          setSavedQuestion(found);
          setQuestion(found.question);
          setNotes(found.notes || '');
          setTags(found.tags?.join(', ') || '');
          setStatus(found.status || 'needs-review');
        }
      }
    } catch (error) {
      console.error('Failed to fetch question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!savedQuestion?._id) return;
    
    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      await api.put(`/user/questions/saved/${savedQuestion._id}`, {
        notes,
        tags: tagsArray,
        status,
      });
      setEditing(false);
      Alert.alert('Success', 'Question updated successfully');
      fetchQuestion();
    } catch (error) {
      console.error('Failed to update question:', error);
      Alert.alert('Error', 'Failed to update question');
    }
  };

  const handleUnsave = () => {
    if (!question?._id) return;
    
    Alert.alert(
      'Remove Question',
      'Are you sure you want to remove this question from your question bank?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/user/questions/unsave/${question._id}`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove question');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Question</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Question</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Question not found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'mastered':
        return colors.success;
      case 'reviewed':
        return colors.primary;
      case 'needs-review':
        return '#f59e0b';
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Question Details</Text>
          <TouchableOpacity
            onPress={() => setEditing(!editing)}
            style={styles.editButton}
          >
            <Ionicons 
              name={editing ? "close" : "create-outline"} 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Meta */}
          <View style={styles.metaSection}>
            <View style={styles.metaRow}>
              {question.category && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaText}>{question.category}</Text>
                </View>
              )}
              {question.subject && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaText}>{question.subject}</Text>
                </View>
              )}
              {question.topic && (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaText}>{question.topic}</Text>
                </View>
              )}
            </View>
            {question.difficulty && (
              <View style={[
                styles.difficultyBadge,
                question.difficulty === 'Easy' && { backgroundColor: '#10b98120' },
                question.difficulty === 'Medium' && { backgroundColor: '#f59e0b20' },
                question.difficulty === 'Hard' && { backgroundColor: '#ef444420' },
              ]}>
                <Text style={styles.difficultyText}>{question.difficulty}</Text>
              </View>
            )}
            {savedQuestion && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                  {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            )}
          </View>

          {/* Question Image */}
          {question.questionImage && (
            <Image
              source={{ uri: question.questionImage }}
              style={styles.questionImage}
              resizeMode="contain"
            />
          )}

          {/* Question Text */}
          <View style={styles.questionSection}>
            <Text style={styles.questionText}>{question.questionText}</Text>
          </View>

          {/* Options */}
          {question.options && question.options.length > 0 && (
            <View style={styles.optionsSection}>
              <Text style={styles.sectionTitle}>Options</Text>
              {question.options.map((option, index) => (
                <View
                  key={index}
                  style={[
                    styles.optionCard,
                    option.optionLabel === question.correctAnswer && styles.correctOption,
                  ]}
                >
                  <Text style={styles.optionLabel}>{option.optionLabel}.</Text>
                  <Text style={styles.optionText}>{option.optionText}</Text>
                  {option.optionLabel === question.correctAnswer && (
                    <View style={styles.correctBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.correctText}>Correct</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Explanation */}
          {question.explanation && (
            <View style={styles.explanationSection}>
              <Text style={styles.sectionTitle}>Explanation</Text>
              <View style={styles.explanationBox}>
                <Text style={styles.explanationText}>{question.explanation}</Text>
              </View>
            </View>
          )}

          {/* Notes and Tags (Editable) */}
          {savedQuestion && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>My Notes & Tags</Text>
              
              {editing ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notes</Text>
                    <TextInput
                      style={styles.textInput}
                      multiline
                      numberOfLines={4}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add your notes here..."
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tags (comma separated)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={tags}
                      onChangeText={setTags}
                      placeholder="e.g., difficult, important, math"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Status</Text>
                    <View style={styles.statusOptions}>
                      {['needs-review', 'reviewed', 'mastered'].map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.statusOption,
                            status === s && { backgroundColor: getStatusColor(s) + '20', borderColor: getStatusColor(s) },
                          ]}
                          onPress={() => setStatus(s)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.statusOptionText,
                            status === s && { color: getStatusColor(s) },
                          ]}>
                            {s.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{notes}</Text>
                    </View>
                  ) : (
                    <Text style={styles.emptyNotes}>No notes added yet</Text>
                  )}

                  {tags && (
                    <View style={styles.tagsContainer}>
                      {tags.split(',').map((tag, index) => (
                        tag.trim() && (
                          <View key={index} style={styles.tagBadge}>
                            <Text style={styles.tagText}>{tag.trim()}</Text>
                          </View>
                        )
                      ))}
                    </View>
                  )}

                  {savedQuestion.savedAt && (
                    <Text style={styles.savedDate}>
                      Saved on {new Date(savedQuestion.savedAt).toLocaleDateString()}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* Actions */}
          {savedQuestion && !editing && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleUnsave}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text style={styles.removeButtonText}>Remove from Question Bank</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginHorizontal: 16,
    },
    editButton: {
      padding: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    metaSection: {
      marginBottom: 20,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    metaBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    difficultyBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    difficultyText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    questionImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginBottom: 20,
      backgroundColor: colors.surface,
    },
    questionSection: {
      marginBottom: 24,
    },
    questionText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      lineHeight: 26,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    optionsSection: {
      marginBottom: 24,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    correctOption: {
      backgroundColor: colors.success + '20',
      borderColor: colors.success,
    },
    optionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginRight: 8,
      minWidth: 24,
    },
    optionText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
    correctBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 8,
    },
    correctText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.success,
    },
    explanationSection: {
      marginBottom: 24,
    },
    explanationBox: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: '#3b82f620',
    },
    explanationText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    notesSection: {
      marginBottom: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    statusOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    statusOption: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    statusOptionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    notesBox: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: '#fef3c720',
      marginBottom: 12,
    },
    notesLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    notesText: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    emptyNotes: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: 12,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    tagBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.primary + '20',
    },
    tagText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.primary,
    },
    savedDate: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    actionsSection: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    removeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.error + '40',
      gap: 8,
    },
    removeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.error,
    },
  });

