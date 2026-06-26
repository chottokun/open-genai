import { render, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHighlight } from '../../src/hooks/useHighlight';

describe('useHighlight', () => {
  it('returns highlightText function', () => {
    const { result } = renderHook(() => useHighlight());

    expect(result.current.highlightText).toBeDefined();
    expect(typeof result.current.highlightText).toBe('function');
  });

  describe('highlightText', () => {
    it('returns original text when words array is empty', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('Hello World', []);

      expect(output).toBe('Hello World');
    });

    it('highlights a single word in text', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('Hello World', ['World']);

      // output should be an array with parts
      expect(Array.isArray(output)).toBe(true);
      expect(output).toHaveLength(3); // 'Hello ', <mark>World</mark>, ''
      expect(output[0]).toBe('Hello ');

      // Render the JSX to verify the highlight
      const { container } = render(<span>{output}</span>);
      const mark = container.querySelector('mark');
      expect(mark).not.toBeNull();
      expect(mark?.textContent).toBe('World');
    });

    it('highlights multiple occurrences of the same word', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('cat and cat and cat', ['cat']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(3);
    });

    it('highlights multiple different words', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('The quick brown fox', ['quick', 'fox']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(2);
      expect(marks[0].textContent).toBe('quick');
      expect(marks[1].textContent).toBe('fox');
    });

    it('is case insensitive', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('Hello HELLO hello', ['hello']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(3);
    });

    it('escapes special regex characters in search words', () => {
      const { result } = renderHook(() => useHighlight());

      // These characters are special in regex: . * + ? ^ $ { } ( ) | [ ] \
      const output = result.current.highlightText('Price is $100.00', ['$100.00']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(1);
      expect(marks[0].textContent).toBe('$100.00');
    });

    it('handles text with no matches', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('Hello World', ['foo']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(0);
      expect(container.textContent).toBe('Hello World');
    });

    it('handles empty text', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('', ['hello']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      expect(container.textContent).toBe('');
    });

    it('handles text that is entirely a match', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('hello', ['hello']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(1);
      expect(marks[0].textContent).toBe('hello');
    });

    it('handles Japanese text', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('こんにちは世界', ['世界']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(1);
      expect(marks[0].textContent).toBe('世界');
    });

    it('handles words with parentheses', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('function test() is here', ['test()']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(1);
      expect(marks[0].textContent).toBe('test()');
    });

    it('handles words with brackets', () => {
      const { result } = renderHook(() => useHighlight());

      const output = result.current.highlightText('array[0] is the first element', ['array[0]']);

      expect(Array.isArray(output)).toBe(true);

      const { container } = render(<span>{output}</span>);
      const marks = container.querySelectorAll('mark');
      expect(marks).toHaveLength(1);
      expect(marks[0].textContent).toBe('array[0]');
    });
  });
});
