import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing, ThemeTokens, TouchTarget } from '@/constants/theme';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppScreen } from '@/src/components/ui/AppScreen';
import { FormField } from '@/src/components/ui/FormField';
import { IconAction } from '@/src/components/ui/IconAction';
import { ScreenMessage } from '@/src/components/ui/ScreenMessage';
import { useResolvedColorScheme } from '@/src/hooks/useResolvedColorScheme';
import type { ChimeTone, NotificationTiming, ThemePreference } from '@/src/models';
import {
  playRestCompletionSound,
  playRestCompletionVibration,
} from '@/src/services/feedback';
import { previewRestNotification } from '@/src/services/notifications';
import { createBackup, parseBackup, serializeBackup } from '@/src/services/backup';
import { usePlansStore, useSessionStore, useSettingsStore } from '@/src/store';
import { routes } from '@/src/utils/routes';

type ExpandedSection =
  | 'workout'
  | 'sound'
  | 'vibration'
  | 'notifications'
  | 'appearance'
  | 'advanced'
  | null;

const CHIME_OPTIONS: { label: string; value: ChimeTone }[] = [
  { label: 'Classic', value: 'classic' },
  { label: 'Bright', value: 'bright' },
  { label: 'Deep', value: 'deep' },
];

const NOTIFICATION_OPTIONS: { label: string; value: NotificationTiming }[] = [
  { label: '5 sec early', value: 'five-seconds' },
  { label: '10 sec early', value: 'ten-seconds' },
  { label: 'At rest end', value: 'rest-complete' },
];

const NOTIFICATION_SUMMARIES: Record<NotificationTiming, string> = {
  'five-seconds': '5 seconds before rest ends',
  'ten-seconds': '10 seconds before rest ends',
  'rest-complete': 'When rest ends',
};

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Micro', value: 'micro-interactions' },
  { label: 'Inclusive', value: 'inclusive' },
  { label: 'Soft UI', value: 'soft-ui' },
  { label: 'Cyberpunk', value: 'cyberpunk' },
  { label: 'Brutalist', value: 'neubrutalism' },
];

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  'micro-interactions': 'Micro-interactions',
  inclusive: 'Inclusive design',
  'soft-ui': 'Soft UI',
  cyberpunk: 'Cyberpunk',
  neubrutalism: 'Neubrutalism',
};

interface ExpandableSettingProps {
  children: ReactNode;
  expanded: boolean;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
  summary: string;
  title: string;
}

function ExpandableSetting({
  children,
  expanded,
  icon,
  onPress,
  summary,
  title,
}: ExpandableSettingProps) {
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];
  const tokens = ThemeTokens[colorScheme];

  return (
    <View
      style={[
        styles.expandableSection,
        { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: tokens.radius, borderWidth: tokens.borderWidth },
        tokens.surfaceShadow,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={({ pressed }) => [styles.settingHeader, pressed && styles.pressed]}>
        <View style={[styles.icon, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons color={palette.icon} name={icon} size={24} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.value, { color: palette.textMuted }]}>{summary}</Text>
        </View>
        <MaterialIcons
          color={palette.icon}
          name={expanded ? 'expand-less' : 'expand-more'}
          size={24}
        />
      </Pressable>
      {expanded ? (
        <View style={[styles.settingEditor, { borderTopColor: palette.border }]}>{children}</View>
      ) : null}
    </View>
  );
}

export default function SettingsScreen() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const replaceSettings = useSettingsStore((state) => state.replaceSettings);
  const historyCount = useSessionStore((state) => state.history.length);
  const history = useSessionStore((state) => state.history);
  const replaceHistory = useSessionStore((state) => state.replaceHistory);
  const plans = usePlansStore((state) => state.plans);
  const replacePlans = usePlansStore((state) => state.replacePlans);
  const colorScheme = useResolvedColorScheme();
  const palette = Colors[colorScheme];
  const tokens = ThemeTokens[colorScheme];
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const [savingRest, setSavingRest] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [restInput, setRestInput] = useState(String(settings.defaultRestSeconds));
  const [chimeVolume, setChimeVolume] = useState(settings.chimeVolume);
  const [vibrationDuration, setVibrationDuration] = useState(settings.vibrationDurationMs);
  const [notificationTitle, setNotificationTitle] = useState(settings.notificationTitle);
  const [notificationMessage, setNotificationMessage] = useState(settings.notificationMessage);
  const [backupMode, setBackupMode] = useState<'import' | 'export' | null>(null);
  const [backupText, setBackupText] = useState('');

  useEffect(() => {
    setRestInput(String(settings.defaultRestSeconds));
  }, [settings.defaultRestSeconds]);

  useEffect(() => {
    setChimeVolume(settings.chimeVolume);
  }, [settings.chimeVolume]);

  useEffect(() => {
    setVibrationDuration(settings.vibrationDurationMs);
  }, [settings.vibrationDurationMs]);

  useEffect(() => {
    setNotificationTitle(settings.notificationTitle);
  }, [settings.notificationTitle]);

  useEffect(() => {
    setNotificationMessage(settings.notificationMessage);
  }, [settings.notificationMessage]);

  const saveSettings = async (updates: Parameters<typeof updateSettings>[0]) => {
    setSettingsError(null);
    try {
      await updateSettings(updates);
      return true;
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to update settings');
      return false;
    }
  };

  const adjustDefaultRest = async (adjustmentSeconds: number) => {
    const enteredRestSeconds = Number(restInput);
    const currentRestSeconds =
      restInput.trim() !== '' && Number.isInteger(enteredRestSeconds)
        ? enteredRestSeconds
        : settings.defaultRestSeconds;
    const defaultRestSeconds = Math.min(
      3600,
      Math.max(0, currentRestSeconds + adjustmentSeconds)
    );

    setSavingRest(true);
    setSettingsError(null);
    setRestInput(String(defaultRestSeconds));
    try {
      await updateSettings({ defaultRestSeconds });
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to update default rest');
    } finally {
      setSavingRest(false);
    }
  };

  const saveDefaultRestInput = async () => {
    const defaultRestSeconds = Number(restInput);

    if (
      restInput.trim() === '' ||
      !Number.isInteger(defaultRestSeconds) ||
      defaultRestSeconds < 0 ||
      defaultRestSeconds > 3600
    ) {
      setSettingsError('Default rest must be a whole number from 0 to 3600 seconds');
      return;
    }

    setSavingRest(true);
    await saveSettings({ defaultRestSeconds });
    setSavingRest(false);
  };

  const previewChime = async (tone = settings.chimeTone, volume = chimeVolume) => {
    setSettingsError(null);
    try {
      await playRestCompletionSound(tone, volume);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to preview chime');
    }
  };

  const selectChime = async (chimeTone: ChimeTone) => {
    if (await saveSettings({ chimeTone })) {
      await previewChime(chimeTone);
    }
  };

  const saveChimeVolume = async (chimeVolumeValue: number) => {
    if (await saveSettings({ chimeVolume: chimeVolumeValue })) {
      await previewChime(settings.chimeTone, chimeVolumeValue);
    }
  };

  const saveNotificationTitle = async () => {
    const trimmedTitle = notificationTitle.trim();
    if (!trimmedTitle) {
      setSettingsError('Notification title cannot be empty');
      return;
    }
    if (await saveSettings({ notificationTitle: trimmedTitle })) {
      setNotificationTitle(trimmedTitle);
    }
  };

  const saveNotificationMessage = async () => {
    const trimmedMessage = notificationMessage.trim();
    if (!trimmedMessage) {
      setSettingsError('Notification message cannot be empty');
      return;
    }
    if (await saveSettings({ notificationMessage: trimmedMessage })) {
      setNotificationMessage(trimmedMessage);
    }
  };

  const previewVibration = async () => {
    setSettingsError(null);
    try {
      await playRestCompletionVibration(vibrationDuration);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to preview vibration');
    }
  };

  const previewNotification = async () => {
    setSettingsError(null);
    try {
      await previewRestNotification(notificationTitle, notificationMessage);
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : 'Unable to schedule notification preview'
      );
    }
  };

  const toggleSection = (section: Exclude<ExpandedSection, null>) => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  const openExport = () => {
    setBackupText(serializeBackup(createBackup(plans, history, settings)));
    setBackupMode('export');
  };

  const openImport = () => {
    setBackupText('');
    setBackupMode('import');
  };

  const importBackup = async () => {
    try {
      const backup = parseBackup(backupText);
      await replacePlans(backup.plans);
      await replaceHistory(backup.history);
      await replaceSettings(backup.settings);
      setBackupMode(null);
      setBackupText('');
      setSettingsError(null);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to import backup');
    }
  };

  return (
    <AppScreen>
      <View
        style={[
          styles.section,
          { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: tokens.radius, borderWidth: tokens.borderWidth },
          tokens.surfaceShadow,
        ]}>
        <Text style={[styles.label, { color: palette.text }]}>Default rest interval</Text>
        <View style={styles.stepper}>
          <IconAction
            disabled={savingRest || settings.defaultRestSeconds === 0}
            icon="remove"
            label="Reduce default rest by 15 seconds"
            onPress={() => void adjustDefaultRest(-15)}
          />
          <View style={styles.restValue}>
            <TextInput
              accessibilityLabel="Default rest in seconds"
              keyboardType="number-pad"
              maxLength={4}
              onBlur={() => void saveDefaultRestInput()}
              onChangeText={setRestInput}
              onSubmitEditing={() => void saveDefaultRestInput()}
              selectTextOnFocus
              style={[
                styles.restInput,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.border,
                  color: palette.text,
                  borderRadius: tokens.radius,
                  borderWidth: tokens.borderWidth,
                },
              ]}
              value={restInput}
            />
            <Text style={[styles.value, { color: palette.textMuted }]}>seconds</Text>
          </View>
          <IconAction
            disabled={savingRest || settings.defaultRestSeconds === 3600}
            icon="add"
            label="Increase default rest by 15 seconds"
            onPress={() => void adjustDefaultRest(15)}
          />
        </View>
      </View>

      <ExpandableSetting
        expanded={expandedSection === 'workout'}
        icon="fitness-center"
        onPress={() => toggleSection('workout')}
        summary={
          settings.keepAwakeDuringWorkout ? 'Screen stays awake during workouts' : 'Screen can sleep'
        }
        title="Workout">
        <View style={styles.controlRow}>
          <Text style={[styles.editorLabel, { color: palette.text }]}>Keep screen awake</Text>
          <Switch
            accessibilityLabel="Keep screen awake during workouts"
            onValueChange={(keepAwakeDuringWorkout) =>
              void saveSettings({ keepAwakeDuringWorkout })
            }
            trackColor={{ false: palette.surfaceMuted, true: palette.tint }}
            value={settings.keepAwakeDuringWorkout}
          />
        </View>
        <View style={styles.controlRow}>
          <Text style={[styles.editorLabel, { color: palette.text }]}>Confirm before ending</Text>
          <Switch
            accessibilityLabel="Confirm before ending an active workout"
            onValueChange={(confirmBeforeEndingWorkout) =>
              void saveSettings({ confirmBeforeEndingWorkout })
            }
            trackColor={{ false: palette.surfaceMuted, true: palette.tint }}
            value={settings.confirmBeforeEndingWorkout}
          />
        </View>
      </ExpandableSetting>

      <ExpandableSetting
        expanded={expandedSection === 'sound'}
        icon={settings.soundEnabled ? 'volume-up' : 'volume-off'}
        onPress={() => toggleSection('sound')}
        summary={
          settings.soundEnabled
            ? `${settings.chimeTone[0].toUpperCase()}${settings.chimeTone.slice(1)}, ${Math.round(settings.chimeVolume * 100)}%`
            : 'Off'
        }
        title="Sound">
        <View style={styles.controlRow}>
          <Text style={[styles.editorLabel, { color: palette.text }]}>Enable chime</Text>
          <Switch
            accessibilityLabel="Rest completion sound"
            onValueChange={(soundEnabled) => void saveSettings({ soundEnabled })}
            trackColor={{ false: palette.surfaceMuted, true: palette.tint }}
            value={settings.soundEnabled}
          />
        </View>
        <View style={!settings.soundEnabled && styles.disabledControl}>
          <Text style={[styles.editorLabel, { color: palette.text }]}>Chime tone</Text>
          <View
            accessibilityRole="radiogroup"
            style={[styles.segmented, { backgroundColor: palette.surfaceMuted }]}>
            {CHIME_OPTIONS.map((option) => {
              const selected = settings.chimeTone === option.value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ disabled: !settings.soundEnabled, selected }}
                  disabled={!settings.soundEnabled}
                  key={option.value}
                  onPress={() => void selectChime(option.value)}
                  style={[
                    styles.segment,
                    { borderRadius: tokens.buttonRadius, borderWidth: tokens.buttonBorderWidth },
                    selected && { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}>
                  <Text
                    style={[
                      styles.segmentText,
                      { color: selected ? palette.tint : palette.textMuted },
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sliderHeading}>
            <Text style={[styles.value, { color: palette.textMuted }]}>Volume</Text>
            <Text style={[styles.sliderValue, { color: palette.text }]}>
              {Math.round(chimeVolume * 100)}%
            </Text>
          </View>
          <Slider
            accessibilityLabel="Chime volume"
            disabled={!settings.soundEnabled}
            maximumTrackTintColor={palette.surfaceMuted}
            maximumValue={1}
            minimumTrackTintColor={palette.tint}
            minimumValue={0}
            onSlidingComplete={(value) => void saveChimeVolume(value)}
            onValueChange={setChimeVolume}
            step={0.05}
            style={styles.slider}
            thumbTintColor={palette.tint}
            value={chimeVolume}
          />
          <AppButton
            disabled={!settings.soundEnabled}
            icon="play-arrow"
            label="Preview chime"
            onPress={() => void previewChime()}
            variant="secondary"
          />
        </View>
      </ExpandableSetting>

      <ExpandableSetting
        expanded={expandedSection === 'vibration'}
        icon="vibration"
        onPress={() => toggleSection('vibration')}
        summary={settings.vibrationEnabled ? `${settings.vibrationDurationMs} ms` : 'Off'}
        title="Vibration">
        <View style={styles.controlRow}>
          <Text style={[styles.editorLabel, { color: palette.text }]}>Enable vibration</Text>
          <Switch
            accessibilityLabel="Rest completion vibration"
            onValueChange={(vibrationEnabled) => void saveSettings({ vibrationEnabled })}
            trackColor={{ false: palette.surfaceMuted, true: palette.tint }}
            value={settings.vibrationEnabled}
          />
        </View>
        <View style={!settings.vibrationEnabled && styles.disabledControl}>
          <View style={styles.sliderHeading}>
            <Text style={[styles.value, { color: palette.textMuted }]}>Duration</Text>
            <Text style={[styles.sliderValue, { color: palette.text }]}>
              {vibrationDuration} ms
            </Text>
          </View>
          <Slider
            accessibilityLabel="Vibration duration in milliseconds"
            disabled={!settings.vibrationEnabled}
            maximumTrackTintColor={palette.surfaceMuted}
            maximumValue={1500}
            minimumTrackTintColor={palette.tint}
            minimumValue={100}
            onSlidingComplete={(vibrationDurationMs) =>
              void saveSettings({ vibrationDurationMs })
            }
            onValueChange={setVibrationDuration}
            step={50}
            style={styles.slider}
            thumbTintColor={palette.tint}
            value={vibrationDuration}
          />
          <AppButton
            disabled={!settings.vibrationEnabled}
            icon="vibration"
            label="Preview vibration"
            onPress={() => void previewVibration()}
            variant="secondary"
          />
        </View>
      </ExpandableSetting>

      <ExpandableSetting
        expanded={expandedSection === 'notifications'}
        icon={settings.notificationEnabled ? 'notifications' : 'notifications-off'}
        onPress={() => toggleSection('notifications')}
        summary={
          settings.notificationEnabled
            ? NOTIFICATION_SUMMARIES[settings.notificationTiming]
            : 'Off'
        }
        title="Notifications">
        <View style={styles.controlRow}>
          <Text style={[styles.editorLabel, { color: palette.text }]}>Enable notifications</Text>
          <Switch
            accessibilityLabel="Rest timer notifications"
            onValueChange={(notificationEnabled) =>
              void saveSettings({ notificationEnabled })
            }
            trackColor={{ false: palette.surfaceMuted, true: palette.tint }}
            value={settings.notificationEnabled}
          />
        </View>
        <View style={!settings.notificationEnabled && styles.disabledControl}>
          <Text style={[styles.editorLabel, { color: palette.text }]}>Timing</Text>
          <View
            accessibilityRole="radiogroup"
            style={[styles.segmented, { backgroundColor: palette.surfaceMuted }]}>
            {NOTIFICATION_OPTIONS.map((option) => {
              const selected = settings.notificationTiming === option.value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    disabled: !settings.notificationEnabled,
                    selected,
                  }}
                  disabled={!settings.notificationEnabled}
                  key={option.value}
                  onPress={() => void saveSettings({ notificationTiming: option.value })}
                  style={[
                    styles.segment,
                    selected && { backgroundColor: palette.surface, borderColor: palette.border },
                  ]}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.segmentText,
                      { color: selected ? palette.tint : palette.textMuted },
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <FormField
            editable={settings.notificationEnabled}
            label="Title"
            maxLength={80}
            onBlur={() => void saveNotificationTitle()}
            onChangeText={setNotificationTitle}
            onSubmitEditing={() => void saveNotificationTitle()}
            returnKeyType="done"
            value={notificationTitle}
          />
          <FormField
            editable={settings.notificationEnabled}
            label="Message"
            maxLength={160}
            multiline
            onBlur={() => void saveNotificationMessage()}
            onChangeText={setNotificationMessage}
            value={notificationMessage}
          />
          <AppButton
            icon="notifications-active"
            label="Preview notification"
            onPress={() => void previewNotification()}
            variant="secondary"
          />
        </View>
      </ExpandableSetting>

      <ExpandableSetting
        expanded={expandedSection === 'appearance'}
        icon="brightness-6"
        onPress={() => toggleSection('appearance')}
        summary={`${THEME_LABELS[settings.theme]} theme`}
        title="Change theme">
        <Text style={[styles.editorLabel, { color: palette.text }]}>Choose a theme</Text>
        <View
          accessibilityRole="radiogroup"
          style={[styles.segmented, styles.themeOptions, { backgroundColor: palette.surfaceMuted }]}>
          {THEME_OPTIONS.map((option) => {
            const selected = settings.theme === option.value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() => void saveSettings({ theme: option.value })}
                style={[
                    styles.segment,
                    styles.themeOption,
                  selected && { backgroundColor: palette.surface, borderColor: palette.border },
                ]}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: selected ? palette.tint : palette.textMuted },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ExpandableSetting>

      <ExpandableSetting
        expanded={expandedSection === 'advanced'}
        icon="build"
        onPress={() => toggleSection('advanced')}
        summary="Import or export plans and progress"
        title="Advanced settings">
        <Text style={[styles.value, { color: palette.textMuted }]}>JSON backups include plans, completed history, PRs, and settings.</Text>
        <View style={styles.advancedActions}>
          <AppButton icon="upload" label="Import backup" onPress={openImport} variant="secondary" />
          <AppButton icon="download" label="Export backup" onPress={openExport} variant="secondary" />
        </View>
      </ExpandableSetting>

      {settingsError ? (
        <ScreenMessage body={settingsError} error title="Settings not saved" />
      ) : null}
      <Modal
        animationType="slide"
        transparent
        visible={backupMode !== null}
        onRequestClose={() => setBackupMode(null)}>
        <View style={styles.backupBackdrop}>
          <View style={[styles.backupDialog, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.label, { color: palette.text }]}>{backupMode === 'export' ? 'Export backup' : 'Import backup'}</Text>
            <Text style={[styles.value, { color: palette.textMuted }]}>
              {backupMode === 'export' ? 'Copy this JSON into a file or cloud note.' : 'Paste a Gym Timer JSON backup below, then import it.'}
            </Text>
            <TextInput
              multiline
              onChangeText={setBackupText}
              selectTextOnFocus={backupMode === 'export'}
              style={[styles.backupInput, { backgroundColor: palette.surfaceMuted, borderColor: palette.border, color: palette.text }]}
              value={backupText}
            />
            <View style={styles.advancedActions}>
              <AppButton label="Close" onPress={() => setBackupMode(null)} variant="ghost" />
              {backupMode === 'import' ? <AppButton icon="upload" label="Import" onPress={() => void importBackup()} /> : null}
            </View>
          </View>
        </View>
      </Modal>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(routes.recorderSettings)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: tokens.radius, borderWidth: tokens.borderWidth },
          tokens.surfaceShadow,
          pressed && styles.pressed,
        ]}>
        <View style={[styles.icon, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons color={palette.icon} name="edit-note" size={24} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: palette.text }]}>Workout recorder</Text>
          <Text style={[styles.value, { color: palette.textMuted }]}>
            {settings.recordWorkoutDays.length}{' '}
            {settings.recordWorkoutDays.length === 1 ? 'day' : 'days'} · customize exercise shortcuts
          </Text>
        </View>
        <MaterialIcons color={palette.icon} name="chevron-right" size={24} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(routes.history)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: tokens.radius, borderWidth: tokens.borderWidth },
          tokens.surfaceShadow,
          pressed && styles.pressed,
        ]}>
        <View style={[styles.icon, { backgroundColor: palette.surfaceMuted }]}>
          <MaterialIcons color={palette.icon} name="history" size={24} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: palette.text }]}>Workout history</Text>
          <Text style={[styles.value, { color: palette.textMuted }]}>
            {historyCount === 0 ? 'No completed workouts' : historyCount + ' completed workouts'}
          </Text>
        </View>
        <MaterialIcons color={palette.icon} name="chevron-right" size={24} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restValue: { alignItems: 'center', minWidth: 96 },
  restInput: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 24,
    fontWeight: '800',
    minHeight: TouchTarget.minimum,
    minWidth: 96,
    paddingHorizontal: Spacing.sm,
    textAlign: 'center',
  },
  expandableSection: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  settingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
    minHeight: 72,
    padding: Spacing.md,
  },
  settingEditor: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    padding: Spacing.md,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: TouchTarget.minimum,
  },
  editorLabel: { fontSize: 15, fontWeight: '700' },
  segmented: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    padding: 3,
  },
  themeOptions: { flexWrap: 'wrap', gap: Spacing.xs },
  themeOption: { flexBasis: '31%', flexGrow: 0 },
  segment: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: TouchTarget.minimum,
    paddingHorizontal: Spacing.xs,
  },
  segmentText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  sliderHeading: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderValue: { fontSize: 14, fontWeight: '700' },
  slider: { height: TouchTarget.minimum, width: '100%' },
  disabledControl: { gap: Spacing.md, opacity: 0.45 },
  advancedActions: { flexDirection: 'row', gap: Spacing.sm },
  backupBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.58)', flex: 1, justifyContent: 'center', padding: Spacing.md },
  backupDialog: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.md, maxHeight: '86%', padding: Spacing.md, width: '100%' },
  backupInput: { borderRadius: Radius.md, borderWidth: 1, fontFamily: 'monospace', fontSize: 12, minHeight: 260, padding: Spacing.sm, textAlignVertical: 'top' },
  row: {
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.md,
    minHeight: 72,
    padding: Spacing.md,
  },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.md,
    height: TouchTarget.minimum,
    justifyContent: 'center',
    width: TouchTarget.minimum,
  },
  copy: { flex: 1, gap: Spacing.xs },
  label: { fontSize: 17, fontWeight: '700' },
  value: { fontSize: 14 },
  pressed: { opacity: 0.7 },
});
