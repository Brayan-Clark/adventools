import React, { createContext, useContext, useState, useCallback } from 'react';
import { PremiumAlert, AlertType } from '@/components/ui/PremiumAlert';

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  /** When provided, a Cancel button is shown and this runs on confirm. */
  onConfirm?: () => void;
}

interface AlertContextType {
  /**
   * Imperative styled alert/confirm — the modal counterpart of showToast.
   * Use for anything that needs a decision (delete, restore…). For plain
   * success/error/info feedback prefer useToast().showToast().
   */
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({ title: '', message: '' });

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => setVisible(false), []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <PremiumAlert
        visible={visible}
        title={options.title}
        message={options.message}
        type={options.type}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        onConfirm={options.onConfirm}
        onClose={handleClose}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
