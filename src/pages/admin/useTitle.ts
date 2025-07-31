import { useEffect } from 'react';

/**
 * A hook to set the document title
 * @param title - The title to set for the page
 * @param suffix - Optional suffix to append to the title
 */
export const useTitle = (title: string, suffix = '| PointFlex') => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} ${suffix}`;

    return () => {
      document.title = previousTitle;
    };
  }, [title, suffix]);
};
