"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface UploadTask {
  id: string;
  name: string;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
}

interface UploadContextType {
  tasks: UploadTask[];
  addTask: (name: string) => string;       // returns task id
  updateTask: (id: string, progress: number, status?: UploadTask["status"]) => void;
  removeTask: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProgressProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const addTask = useCallback((name: string) => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setTasks(prev => [...prev, { id, name, progress: 0, status: "uploading" }]);
    return id;
  }, []);

  const updateTask = useCallback((id: string, progress: number, status?: UploadTask["status"]) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, progress, status: status || t.status } : t));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => {
      // Auto-remove done/error tasks after 3s
      const task = prev.find(t => t.id === id);
      if (task && (task.status === "done" || task.status === "error")) {
        setTimeout(() => setTasks(p => p.filter(t => t.id !== id)), 3000);
      }
      return prev.map(t => t.id === id ? { ...t, progress: 100 } : t);
    });
  }, []);

  return (
    <UploadContext.Provider value={{ tasks, addTask, updateTask, removeTask }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadProgress() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploadProgress must be used within UploadProgressProvider");
  return ctx;
}
