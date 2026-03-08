import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import tw from 'twrnc';
import ScreenWrapper from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

function Header({ navigation, colors }) {
  return (
    <View
      style={[
        tw`flex-row items-center justify-between px-4 pt-4 pb-3 border-b`,
        { borderColor: colors.border },
      ]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={[tw`text-base font-bold`, { color: colors.text }]}>Categories</Text>
      <View style={tw`w-10`} />
    </View>
  );
}

export default function CategoriesScreen({ navigation }) {
  const { colors } = useTheme();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try dedicated categories endpoint first, fall back to dashboard-stats
      try {
        const response = await api.get('/categories');
        setCategories(response.data?.categories || []);
      } catch {
        const response = await api.get('/user/dashboard-stats');
        setCategories(response.data?.categories || []);
      }
    } catch {
      setError('Failed to load categories. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  // ─── Loading ───────────────────────────────────────────
  if (loading && categories.length === 0) {
    return (
      <ScreenWrapper>
        <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
          <Header navigation={navigation} colors={colors} />
          <View style={tw`flex-1 items-center justify-center`}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ═══════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <View style={[tw`flex-1`, { backgroundColor: colors.background }]}>
        <Header navigation={navigation} colors={colors} />

        <ScrollView
          style={tw`flex-1`}
          contentContainerStyle={tw`px-5 py-4 pb-10`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Error */}
          {error && (
            <TouchableOpacity
              style={tw`flex-row items-center p-3 rounded-2xl mb-4 bg-red-50 dark:bg-red-900/20`}
              onPress={fetchCategories}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={tw`flex-1 text-xs text-red-500 ml-2`}>{error}</Text>
              <Ionicons name="refresh" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}

          {categories.length === 0 ? (
            /* ─── Empty ───────────────────────────────── */
            <View style={tw`items-center justify-center py-16`}>
              <View
                style={[
                  tw`w-16 h-16 rounded-full items-center justify-center mb-4`,
                  { backgroundColor: colors.primary + '10' },
                ]}
              >
                <Ionicons name="folder-open-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[tw`text-base font-semibold mb-1`, { color: colors.text }]}>
                No categories
              </Text>
              <Text style={[tw`text-sm text-center`, { color: colors.textSecondary }]}>
                Check back later for new categories.
              </Text>
            </View>
          ) : (
            /* ─── Categories List ─────────────────────── */
            <View style={tw`gap-2.5`}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category._id}
                  style={[
                    tw`flex-row items-center p-3.5 rounded-2xl border`,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() =>
                    navigation.navigate('CategoryDetail', { categoryId: category._id })
                  }
                  activeOpacity={0.7}
                >
                  {/* Logo / Icon */}
                  {category.logo ? (
                    <Image
                      source={{ uri: category.logo }}
                      style={[
                        tw`w-13 h-13 rounded-2xl mr-3.5`,
                        { backgroundColor: colors.background },
                      ]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        tw`w-13 h-13 rounded-2xl items-center justify-center mr-3.5`,
                        { backgroundColor: colors.primary + '10' },
                      ]}
                    >
                      <Ionicons name="book-outline" size={24} color={colors.primary} />
                    </View>
                  )}

                  {/* Info */}
                  <View style={tw`flex-1`}>
                    <Text
                      style={[tw`text-sm font-bold mb-0.5`, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {category.displayName || category.name}
                    </Text>
                    {category.description && (
                      <Text
                        style={[tw`text-[11px] leading-4 mb-1.5`, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {category.description}
                      </Text>
                    )}
                    {category.examCount > 0 && (
                      <View style={tw`flex-row items-center gap-1`}>
                        <Ionicons name="document-text-outline" size={12} color={colors.primary} />
                        <Text style={[tw`text-[10px] font-semibold`, { color: colors.primary }]}>
                          {category.examCount} {category.examCount === 1 ? 'exam' : 'exams'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Chevron */}
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                    style={tw`ml-2`}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}



// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   RefreshControl,
//   Image,
//   Dimensions,
// } from 'react-native';
// import { useTheme } from '../context/ThemeContext';
// import api from '../services/api';
// import { Ionicons } from '@expo/vector-icons';

// const { width } = Dimensions.get('window');

// export default function CategoriesScreen({ navigation }) {
//   const { colors } = useTheme();
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//   const fetchCategories = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get('/user/dashboard-stats');
//       setCategories(response.data?.categories || []);
//     } catch (error) {
//       console.error('Failed to fetch categories:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchCategories();
//   };

//   const styles = createStyles(colors);

//   if (loading) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={24} color={colors.text} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Categories</Text>
//           <View style={{ width: 24 }} />
//         </View>
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color={colors.primary} />
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color={colors.text} />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Categories</Text>
//         <View style={{ width: 24 }} />
//       </View>

//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={onRefresh}
//             tintColor={colors.primary}
//           />
//         }
//         showsVerticalScrollIndicator={false}
//       >
//         {categories.length === 0 ? (
//           <View style={styles.emptyContainer}>
//             <Ionicons name="folder-open" size={64} color={colors.textSecondary} />
//             <Text style={styles.emptyText}>No categories available</Text>
//           </View>
//         ) : (
//           <View style={styles.categoriesGrid}>
//             {categories.map((category) => (
//               <TouchableOpacity
//                 key={category._id}
//                 style={styles.categoryCard}
//                 onPress={() => {
//                   navigation.navigate('CategoryDetail', { categoryId: category._id });
//                 }}
//                 activeOpacity={0.7}
//               >
//                 {category.logo ? (
//                   <Image
//                     source={{ uri: category.logo }}
//                     style={styles.categoryLogo}
//                     resizeMode="cover"
//                   />
//                 ) : (
//                   <View style={styles.categoryIconContainer}>
//                     <Ionicons name="book" size={40} color={colors.primary} />
//                   </View>
//                 )}
//                 <View style={styles.categoryContent}>
//                   <Text style={styles.categoryName} numberOfLines={2}>
//                     {category.displayName || category.name}
//                   </Text>
//                   {category.description && (
//                     <Text style={styles.categoryDescription} numberOfLines={2}>
//                       {category.description}
//                     </Text>
//                   )}
//                   {category.examCount > 0 && (
//                     <View style={styles.categoryBadge}>
//                       <Ionicons name="document-text" size={14} color={colors.primary} />
//                       <Text style={styles.categoryBadgeText}>
//                         {category.examCount} {category.examCount === 1 ? 'exam' : 'exams'}
//                       </Text>
//                     </View>
//                   )}
//                 </View>
//                 <Ionicons
//                   name="chevron-forward"
//                   size={20}
//                   color={colors.textSecondary}
//                   style={styles.chevron}
//                 />
//               </TouchableOpacity>
//             ))}
//           </View>
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// const createStyles = (colors) =>
//   StyleSheet.create({
//     container: {
//       flex: 1,
//       backgroundColor: colors.background,
//     },
//     header: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       paddingHorizontal: 20,
//       paddingTop: 20,
//       paddingBottom: 16,
//       borderBottomWidth: 1,
//       borderBottomColor: colors.border,
//     },
//     backButton: {
//       padding: 8,
//     },
//     headerTitle: {
//       fontSize: 20,
//       fontWeight: 'bold',
//       color: colors.text,
//     },
//     scrollView: {
//       flex: 1,
//     },
//     scrollContent: {
//       padding: 20,
//       paddingBottom: 40,
//     },
//     loadingContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     emptyContainer: {
//       flex: 1,
//       justifyContent: 'center',
//       alignItems: 'center',
//       paddingVertical: 60,
//     },
//     emptyText: {
//       fontSize: 16,
//       color: colors.textSecondary,
//       marginTop: 16,
//     },
//     categoriesGrid: {
//       gap: 16,
//     },
//     categoryCard: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: colors.surface,
//       borderRadius: 20,
//       padding: 18,
//       borderWidth: 1,
//       borderColor: colors.border,
//     },
//     categoryLogo: {
//       width: 64,
//       height: 64,
//       borderRadius: 16,
//       marginRight: 16,
//     },
//     categoryIconContainer: {
//       width: 64,
//       height: 64,
//       borderRadius: 16,
//       backgroundColor: colors.primary + '15',
//       justifyContent: 'center',
//       alignItems: 'center',
//       marginRight: 16,
//     },
//     categoryContent: {
//       flex: 1,
//     },
//     categoryName: {
//       fontSize: 18,
//       fontWeight: '700',
//       color: colors.text,
//       marginBottom: 6,
//     },
//     categoryDescription: {
//       fontSize: 14,
//       color: colors.textSecondary,
//       marginBottom: 8,
//       lineHeight: 20,
//     },
//     categoryBadge: {
//       flexDirection: 'row',
//       alignItems: 'center',
//       backgroundColor: colors.primary + '15',
//       paddingHorizontal: 10,
//       paddingVertical: 4,
//       borderRadius: 12,
//       alignSelf: 'flex-start',
//     },
//     categoryBadgeText: {
//       fontSize: 12,
//       color: colors.primary,
//       fontWeight: '600',
//       marginLeft: 4,
//     },
//     chevron: {
//       marginLeft: 12,
//     },
//   });

