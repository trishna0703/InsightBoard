import React, { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InsightFormSchema, InsightFormValues } from '../../schemas/insightForm';
import { Insight, InsightStage, Priority } from '../../types';
import { Colors } from '../../constants/colors';
import HCPAutocomplete from './HCPAutocomplete';
import TagMultiSelect from './TagMultiSelect';
import { useCategories } from '../../hooks/useCategories';

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];
const STAGES: InsightStage[] = ['Observation', 'Insight', 'Actionable', 'Impact'];

interface InsightFormProps {
  initialValues?: Partial<InsightFormValues>;
  editingInsight?: Insight | null;
  submitting: boolean;
  onSubmit: (values: InsightFormValues) => void;
  onCancel: () => void;
  /** Called whenever the form's dirty state changes — lets the parent
   *  decide whether to show an unsaved-changes warning before dismissal. */
  onDirtyChange?: (isDirty: boolean) => void;
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export default function InsightForm({
  initialValues,
  editingInsight,
  submitting,
  onSubmit,
  onCancel,
  onDirtyChange,
}: InsightFormProps) {
  const { categories } = useCategories();
  const isEditing = !!editingInsight;

  const defaultValues: InsightFormValues = {
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
    priority: initialValues?.priority ?? 'P3',
    stage: initialValues?.stage ?? 'Observation',
    categoryId: initialValues?.categoryId ?? null,
    hcpId: initialValues?.hcpId ?? null,
    drugName: initialValues?.drugName ?? null,
    tagIds: initialValues?.tagIds ?? [],
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<InsightFormValues>({
    resolver: zodResolver(InsightFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Notify parent whenever dirty state flips — used for the unsaved-changes guard
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Discard changes?',
        'Your unsaved changes will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel },
        ],
      );
    } else {
      onCancel();
    }
  };

  const selectedPriority = watch('priority');
  const selectedStage = watch('stage');
  const selectedCategoryId = watch('categoryId');

  return (
    // KeyboardAvoidingView pushes the scroll content up when the software
    // keyboard appears so lower fields (drug name, tags) stay reachable.
    // On iOS "padding" shrinks the view; on Android "height" works better.
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleCancel}
          accessibilityLabel="Cancel form"
          accessibilityRole="button"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>
          {isEditing ? 'Edit Insight' : 'New Insight'}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          accessibilityLabel={isEditing ? 'Save insight changes' : 'Create insight'}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Enter a clear, concise title"
              placeholderTextColor={Colors.textSecondary}
              accessibilityLabel="Insight title"
              returnKeyType="next"
              maxLength={255}
            />
          )}
        />
        <FieldError message={errors.title?.message} />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, styles.multiline, errors.description && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Describe the insight in detail…"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Insight description"
            />
          )}
        />
        <FieldError message={errors.description?.message} />
      </View>

      {/* Priority */}
      <View style={styles.field}>
        <Text style={styles.label}>Priority *</Text>
        <View style={styles.chipRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.priorityChip,
                { borderColor: Colors.priority[p] },
                selectedPriority === p && { backgroundColor: Colors.priority[p] },
              ]}
              onPress={() => setValue('priority', p, { shouldDirty: true })}
              accessibilityLabel={`Priority ${p}${selectedPriority === p ? ', selected' : ''}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPriority === p }}
            >
              <Text
                style={[
                  styles.priorityChipText,
                  { color: Colors.priority[p] },
                  selectedPriority === p && { color: Colors.white },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <FieldError message={errors.priority?.message} />
      </View>

      {/* Stage */}
      <View style={styles.field}>
        <Text style={styles.label}>Stage</Text>
        <View style={styles.stageRow}>
          {STAGES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.stageChip,
                selectedStage === s && {
                  backgroundColor: Colors.stage[s],
                  borderColor: Colors.stage[s],
                },
              ]}
              onPress={() => setValue('stage', s, { shouldDirty: true })}
              accessibilityLabel={`Stage ${s}${selectedStage === s ? ', selected' : ''}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedStage === s }}
            >
              <Text
                style={[
                  styles.stageChipText,
                  selectedStage === s && { color: Colors.white },
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryWrap}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategoryId === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() =>
                setValue(
                  'categoryId',
                  selectedCategoryId === cat.id ? null : cat.id,
                  { shouldDirty: true },
                )
              }
              accessibilityLabel={`Category ${cat.name}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selectedCategoryId === cat.id }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategoryId === cat.id && styles.categoryChipTextSelected,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* HCP Autocomplete */}
      <View style={styles.field}>
        <Text style={styles.label}>Linked HCP</Text>
        <Controller
          control={control}
          name="hcpId"
          render={({ field: { value, onChange } }) => (
            <HCPAutocomplete
              selectedId={value ?? null}
              preloadedHCP={editingInsight?.hcp ?? null}
              onChange={onChange}
            />
          )}
        />
      </View>

      {/* Drug Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Drug Name</Text>
        <Controller
          control={control}
          name="drugName"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={styles.input}
              value={value ?? ''}
              onChangeText={(t) => onChange(t || null)}
              onBlur={onBlur}
              placeholder="e.g. Keytruda"
              placeholderTextColor={Colors.textSecondary}
              accessibilityLabel="Drug name"
            />
          )}
        />
      </View>

      {/* Tags */}
      <View style={styles.field}>
        <Text style={styles.label}>Tags</Text>
        <Controller
          control={control}
          name="tagIds"
          render={({ field: { value, onChange } }) => (
            <TagMultiSelect selectedIds={value} onChange={onChange} />
          )}
        />
      </View>

      <View style={styles.bottomPad} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  // Extra bottom padding so the last field is never hidden behind the keyboard
  container: { padding: 16, gap: 4, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary[500],
  },

  field: { gap: 6, marginBottom: 12 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  inputError: { borderColor: Colors.system.error },
  multiline: { height: 100, paddingTop: 12 },
  error: {
    fontSize: 12,
    color: Colors.system.error,
    marginTop: 2,
  },

  chipRow: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  priorityChipText: { fontWeight: '700', fontSize: 14 },

  stageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stageChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  categoryChipSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[500] + '18',
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: Colors.primary[700],
    fontWeight: '600',
  },

  bottomPad: { height: 80 },
});
