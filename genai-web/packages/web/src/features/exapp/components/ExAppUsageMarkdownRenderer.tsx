import { ComponentProps, JSX, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ReactMarkdown, { Components, ExtraProps } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkDirective from 'remark-directive';
import remarkDirectiveRehype from 'remark-directive-rehype';
import remarkGfm from 'remark-gfm';
import { Disclosure, DisclosureSummary } from '@/components/ui/dads/Disclosure';
import { ErrorText } from '@/components/ui/dads/ErrorText';
import { Link } from '@/components/ui/dads/Link';
import { remarkDirectiveFilter } from '../utils/remarkDirectiveFilter';
import { MermaidRenderer } from './MermaidRenderer';

type Props = {
  content: string;
  size?: 'sm' | 'base';
};

type DisclosureComponentProps = {
  children?: ReactNode;
  title?: string;
  level?: string;
};

type CustomComponents = Components & {
  disclosure?: (props: DisclosureComponentProps) => JSX.Element;
};

const components: CustomComponents = {
  a: (props: ComponentProps<'a'>) => {
    if (props.href?.startsWith('http')) {
      return (
        <Link href={props.href} target='_blank' rel='noopener noreferrer'>
          {props.children}
        </Link>
      );
    } else {
      return <Link href={props.href}>{props.children}</Link>;
    }
  },
  code: (props: ComponentProps<'code'> & ExtraProps) => {
    const { node, className, children, ...rest } = props;

    if (className === 'language-mermaid' && node?.children[0]?.type === 'text') {
      const textNode = node.children[0];
      return <MermaidRenderer code={'value' in textNode ? String(textNode.value) : ''} />;
    }

    return (
      <code {...rest} className={className}>
        {children}
      </code>
    );
  },
  disclosure: (props: DisclosureComponentProps) => {
    const Heading = props.level as keyof JSX.IntrinsicElements;
    const isHeading = Heading && /^h[1-6]$/.test(Heading);
    return (
      <Disclosure className='my-4'>
        <DisclosureSummary>
          {isHeading ? (
            <Heading className='my-0! inline text-std-17B-170!'>{props.title}</Heading>
          ) : (
            props.title
          )}
        </DisclosureSummary>
        <div className='pl-7'>{props.children}</div>
      </Disclosure>
    );
  },
};

export const ExAppUsageMarkdownRenderer = (props: Props) => {
  const { content, size = 'base' } = props;

  return (
    <div className={`prose max-w-full ${size === 'sm' ? 'prose-sm' : ''}`}>
      <ErrorBoundary
        fallback={
          <ErrorText>マークダウンのパースに失敗しました。内容を見直してください。</ErrorText>
        }
      >
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
            remarkBreaks,
            remarkDirective,
            [remarkDirectiveFilter, { allowedNames: ['disclosure'] }],
            remarkDirectiveRehype,
          ]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </ErrorBoundary>
    </div>
  );
};
