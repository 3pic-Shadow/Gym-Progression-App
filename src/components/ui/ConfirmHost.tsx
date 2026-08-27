import { useEffect, useState } from 'react';

import { ConfirmModal } from '@/src/components/ui/ConfirmModal';
import {
  registerConfirmationListener,
  type ConfirmationRequest,
} from '@/src/utils/confirm';

export function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);

  useEffect(() => {
    registerConfirmationListener(setRequest);
    return () => registerConfirmationListener(null);
  }, []);

  if (!request) {
    return null;
  }

  return (
    <ConfirmModal
      confirmLabel={request.confirmLabel}
      message={request.message}
      onCancel={() => setRequest(null)}
      onConfirm={() => {
        setRequest(null);
        request.onConfirm();
      }}
      title={request.title}
      visible
    />
  );
}
