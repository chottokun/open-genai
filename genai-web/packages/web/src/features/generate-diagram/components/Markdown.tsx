import React, { ComponentProps, useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { default as ReactMarkdown } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { BundledLanguage, codeToHtml } from 'shiki';
import { ButtonCopy } from '@/components/ui/ButtonCopy';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import { Link } from '@/components/ui/dads/Link';

type Props = {
  className?: string;
  children: string;
  prefix?: string;
};

const LinkRenderer = (props: ComponentProps<'a'>) => {
  return (
    <Link
      id={props.id}
      href={props.href}
      target={props.href?.startsWith('#') ? '_self' : '_blank'}
      rel='noopener noreferrer'
    >
      {props.children}
    </Link>
  );
};
const ImageRenderer = (props: ComponentProps<'img'>) => {
  return <img id={props.id} src={props.src} alt={props.alt} {...props} />;
};

type CodeBlockProps = {
  children: string;
  lang: BundledLanguage;
};

function CodeBlock(props: CodeBlockProps) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    codeToHtml(props.children, {
      lang: props.lang,
      theme: 'github-dark-high-contrast',
    }).then((result) => {
      if (isMounted) {
        setHtml(result);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [props.children, props.lang]);

  if (!html) {
    return <code>{props.children}</code>;
  }

  // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by shiki
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

const SupRenderer = ({ children }: ComponentProps<'sup'>) => (
  <sup className='m-0.5 rounded-full bg-gray-200 px-1'>{children}</sup>
);

const CodeRenderer = ({ className, children }: ComponentProps<'code'>) => {
  const language = /language-(\w+)/.exec(className || '')?.[1];
  const isCodeBlock = !!language;
  const codeText = String(children).replace(/\n$/, '');

  if (isCodeBlock) {
    return (
      <>
        <div className='flex'>
          <span className='flex-auto'>{language} </span>
          <ButtonCopy className='mr-2 justify-end text-gray-400' text={codeText} />
        </div>
        <CodeBlock lang={language as BundledLanguage}>{codeText}</CodeBlock>
      </>
    );
  }

  return (
    <span className='inline rounded-md border border-solid-gray-800/30 bg-solid-gray-800/10 px-1 py-0.5'>
      {codeText}
    </span>
  );
};

const components: ComponentProps<typeof ReactMarkdown>['components'] = {
  a: LinkRenderer,
  img: ImageRenderer,
  sup: SupRenderer,
  code: CodeRenderer,
};

export const Markdown = React.memo(({ className, prefix, children }: Props) => {
  return (
    <ErrorBoundary fallback={<ErrorText>コンテンツの表示中にエラーが発生しました。</ErrorText>}>
      <div className={`prose max-w-full ${className ?? ''}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          remarkRehypeOptions={{ clobberPrefix: prefix }}
          components={components}
        >
          {children}
        </ReactMarkdown>
      </div>
    </ErrorBoundary>
  );
});
