import { HighLightText } from '@/components/ui/HighLightText';
import { escapeRegExp } from '@/utils/escapeRegExp';

export const useHighlight = () => {
  const highlightText = (text: string, words: string[]) => {
    if (words.length === 0) return text;

    const escapedWords = words.map(escapeRegExp);
    const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
    return text.split(regex).map((part, i) => {
      if (words.some((word) => part.toLowerCase() === word.toLowerCase())) {
        return <HighLightText key={`${i}-${part}`}>{part}</HighLightText>;
      }
      return part;
    });
  };

  return { highlightText };
};
