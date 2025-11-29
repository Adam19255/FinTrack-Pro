import React from 'react';
import { TRANSLATIONS } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const t = (key: string) => TRANSLATIONS[key];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in">
        <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
};