import { Alert, Platform } from 'react-native';

export interface ConfirmationRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

let confirmationListener: ((request: ConfirmationRequest) => void) | null = null;

export function registerConfirmationListener(
  listener: ((request: ConfirmationRequest) => void) | null
) {
  confirmationListener = listener;
}

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Delete'
) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(message)) {
      onConfirm();
    }
    return;
  }

  if (confirmationListener) {
    confirmationListener({ title, message, confirmLabel, onConfirm });
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
