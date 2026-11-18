import React from 'react';
import MessengerWorkspaceModal from './MessengerWorkspaceModal';

export default function GrabDriverChatModal({
  isOpen,
  onClose,
  isDark = false,
  drivers = [],
  shipments = [],
  chatThreads = null,
  initialDriverCode = null,
  user = null
}) {
  return (
    <MessengerWorkspaceModal
      isOpen={isOpen}
      onClose={onClose}
      isDark={isDark}
      drivers={drivers}
      shipments={shipments}
      chatThreads={chatThreads}
      initialDriverCode={initialDriverCode}
      user={user}
    />
  );
}
