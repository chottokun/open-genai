// description 部分のみを抽出
export const extractDiagramSentence = (content: string): string => {
  if (content.toLowerCase().includes('<description>')) {
    return content
      .split(/<description>/i)[1]
      .split(/<\/description>/i)[0]
      .trim();
  }

  if (content.includes('ただいまアクセスが集中しているため時間をおいて試してみてください。')) {
    return 'ただいまアクセスが集中しているため時間をおいて試してみてください。';
  }

  return content;
};

// mermaid コードブロック部分のみを抽出
export const extractDiagramCode = (content: string): string => {
  if (!content.toLowerCase().includes('```mermaid')) {
    return '';
  }

  return content.split('```mermaid')[1].split('```')[0].trim();
};
