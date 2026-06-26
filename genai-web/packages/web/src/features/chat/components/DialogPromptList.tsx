import type { SystemContext } from 'genai-web';
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '../stores/useChatStore';
import { ChatPageQueryParams } from '../types';
import { ExamplePromptList } from './ExamplePromptList';
import { SavedSystemContextItem } from './SavedSystemContextItem';

type Props = {
  isOpen: boolean;
  onClick: (params: ChatPageQueryParams) => void;
  systemContextList: SystemContext[];
  onClickDeleteSystemContext: (systemContextId: string) => Promise<void>;
  onClickUpdateSystemContext: (systemContextId: string, title: string) => Promise<void>;
  onClose: () => void;
};

export const DialogPromptList = (props: Props) => {
  const { isOpen, onClick, onClickDeleteSystemContext, onClickUpdateSystemContext, onClose } =
    props;
  const { setSystemContextTitle } = useChatStore();
  // PromptList はチャットのページでの利用に固定
  const { getModelId } = useChat('/chat');
  const modelId = getModelId();

  return (
    <CustomDialog isOpen={isOpen} onClose={onClose}>
      <CustomDialogPanel className='max-w-3xl!'>
        <CustomDialogHeader hasClose={true} onClose={onClose}>
          プロンプト一覧
        </CustomDialogHeader>
        <CustomDialogBody>
          <div className='flex flex-col gap-6'>
            <div>
              <h3 className='mb-2 flex items-center text-std-17B-170'>
                保存したプロンプトから選択
              </h3>
              {props.systemContextList.length === 0 && (
                <p className='text-solid-gray-536'>保存したプロンプトはありません</p>
              )}
              {props.systemContextList.length > 0 && (
                <ul className='space-y-1'>
                  {props.systemContextList.map((item) => {
                    return (
                      <SavedSystemContextItem
                        systemContextTitle={item.systemContextTitle}
                        systemContext={item.systemContext}
                        systemContextId={item.systemContextId}
                        onClick={(params) => {
                          setSystemContextTitle(item.systemContextTitle);
                          onClick(params);
                          onClose();
                        }}
                        onClickDeleteSystemContext={onClickDeleteSystemContext}
                        onClickUpdateSystemContext={onClickUpdateSystemContext}
                        key={`${item.systemContextId}`}
                      />
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <h3 className='mb-2 flex items-center text-std-17B-170'>プロンプト例から選択</h3>
              <ExamplePromptList
                modelId={modelId}
                onClick={(params, title) => {
                  setSystemContextTitle(title);
                  onClick(params);
                  onClose();
                }}
              />
            </div>
          </div>
        </CustomDialogBody>
      </CustomDialogPanel>
    </CustomDialog>
  );
};
