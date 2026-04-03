import { createContext, useContext, useState, type ReactNode } from "react";

interface QueueItem {
  id: string;
  title: string;
  thumbnailUrl?: string;
  type: "video" | "audio";
}

interface QueueContextType {
  queue: QueueItem[];
  addToQueue: (item: QueueItem) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
}

const QueueContext = createContext<QueueContextType>({
  queue: [],
  addToQueue: () => {},
  removeFromQueue: () => {},
  clearQueue: () => {},
});

export const useQueue = () => useContext(QueueContext);

export const QueueProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const addToQueue = (item: QueueItem) => {
    setQueue((prev) => {
      if (prev.find((q) => q.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const clearQueue = () => setQueue([]);

  return (
    <QueueContext.Provider value={{ queue, addToQueue, removeFromQueue, clearQueue }}>
      {children}
    </QueueContext.Provider>
  );
};
