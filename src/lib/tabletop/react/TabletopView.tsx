/**
 * Tabletop Nexus - Embeddable React Component
 */

import React, { useEffect, useRef, useState } from 'react';
import { TabletopClient, TabletopClientOptions } from '../client/TabletopClient.js';
import { PlayerPresence, TableConfig } from '../types.js';

export interface TabletopSimulatorProps {
  roomId?: string;
  playerName?: string;
  playerColor?: string;
  soundEnabled?: boolean;
  className?: string;
  onClientReady?: (client: TabletopClient) => void;
}

export const TabletopSimulator: React.FC<TabletopSimulatorProps> = ({
  roomId = 'general',
  playerName = 'Player',
  playerColor,
  soundEnabled = true,
  className = 'w-full h-full',
  onClientReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<TabletopClient | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const client = new TabletopClient({
      container: containerRef.current,
      roomId,
      playerName,
      playerColor,
      soundEnabled,
    });
    clientRef.current = client;

    if (onClientReady) {
      onClientReady(client);
    }

    return () => {
      client.destroy();
      clientRef.current = null;
    };
  }, [roomId]);

  return <div ref={containerRef} className={`relative overflow-hidden select-none ${className}`} />;
};
