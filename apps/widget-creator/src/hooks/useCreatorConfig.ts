import { useContext } from 'react';
import { CreatorContext } from '../providers/creatorProvider';

export function useCreator() {
  const context = useContext(CreatorContext);
  if (!context) {
    throw new Error('useCreator must be used within CreatorProvider');
  }
  return context;
}
