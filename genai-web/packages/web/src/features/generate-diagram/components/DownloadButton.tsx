import mermaid from 'mermaid';
import { PiDownloadSimple } from 'react-icons/pi';
import { Button } from '@/components/ui/dads/Button';

interface DownloadButtonProps {
  type: 'SVG' | 'PNG';
  code: string;
}

export const DownloadButton = ({ type, code }: DownloadButtonProps) => {
  const downloadAsSVG = async () => {
    try {
      const { svg } = await mermaid.render('download-svg', code);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `diagram_${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('SVG出力エラー: ', error);
    }
  };

  const downloadAsPNG = async () => {
    try {
      const { svg } = await mermaid.render('download-png', code);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      if (!(svgElement instanceof SVGSVGElement)) return;

      const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 0, 0];
      const width = Math.max(svgElement.width.baseVal.value || 0, viewBox[2]);
      const height = Math.max(svgElement.height.baseVal.value || 0, viewBox[3]);

      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      const wrappedSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <rect width="100%" height="100%" fill="white"/>
          ${svg}
        </svg>
      `;

      const svgBase64 = btoa(unescape(encodeURIComponent(wrappedSvg)));
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + svgBase64;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);

      const link = document.createElement('a');
      link.download = `diagram_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('PNG出力エラー: ', error);
    }
  };

  return (
    <Button
      className='flex items-center justify-center gap-1.5'
      variant='outline'
      size='sm'
      onClick={type === 'SVG' ? downloadAsSVG : downloadAsPNG}
    >
      <PiDownloadSimple aria-hidden={true} className='mr-0.5 text-lg' />
      {type}
      <span className='sr-only'>形式でダウンロード</span>
    </Button>
  );
};
