import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import type { SystemContext } from 'genai-web';
import { useEffect, useRef, useState } from 'react';
import { PiPencilLine, PiTrash } from 'react-icons/pi';
import { Button } from '@/components/ui/dads/Button';
import { Input } from '@/components/ui/dads/Input';
import { MoreVertIcon } from '@/components/ui/icons/MoreVertIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { focus } from '@/utils/focus';
import { ChatPageQueryParams } from '../types';
import { DialogConfirmDeleteSystemContext } from './DialogConfirmDeleteSystemContext';

type Props = Omit<SystemContext, 'id' | 'createdDate'> & {
  onClick: (params: ChatPageQueryParams) => void;
  onClickDeleteSystemContext: (systemContextId: string) => Promise<void>;
  onClickUpdateSystemContext: (systemContextId: string, title: string) => Promise<void>;
};

export const SavedSystemContextItem = (props: Props) => {
  const {
    onClick,
    onClickDeleteSystemContext,
    onClickUpdateSystemContext,
    systemContext,
    systemContextTitle,
    systemContextId,
  } = props;
  const [editing, setEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const handleFocusAfterEditing = async () => {
    setEditing(false);
    focus(`${systemContextId}-menu-button`);
  };

  const handleUpdateTitle = async () => {
    try {
      onClickUpdateSystemContext(systemContextId, tempTitle);
      handleFocusAfterEditing();
    } catch {
      handleFocusAfterEditing();
    }
  };

  const handleEditingCancel = () => {
    handleFocusAfterEditing();
  };

  const handleEditingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleUpdateTitle();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleEditingCancel();
    }
  };

  const handleClickPrompt = () => {
    onClick({
      systemContext: systemContext,
    });
  };

  const handleDelete = async (systemContextId: string) => {
    await onClickDeleteSystemContext(systemContextId);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <li className='flex items-center gap-1'>
        {editing ? (
          <>
            <Input
              ref={inputRef}
              type='text'
              blockSize='sm'
              className='mr-1 -ml-2 h-9! w-full p-2!'
              value={tempTitle}
              aria-label='プロンプト名を変更'
              onChange={(e) => {
                setTempTitle(e.target.value);
              }}
              onKeyDown={handleEditingKeyDown}
            />
            <div className='flex flex-row-reverse gap-1'>
              <Button
                variant='solid-fill'
                size='xs'
                onClick={() => {
                  handleUpdateTitle();
                }}
              >
                確定
              </Button>
              <Button
                variant='text'
                size='xs'
                className='text-nowrap'
                onClick={handleEditingCancel}
              >
                キャンセル
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className='min-w-0 flex-1'>
              <button
                type='button'
                className='-ml-1 h-9! w-full cursor-pointer truncate px-1 py-1 text-left underline underline-offset-[calc(3/16*1rem)] hover:bg-solid-gray-50 hover:decoration-[calc(3/16*1rem)] hover:outline-2 focus-visible:rounded-4 focus-visible:bg-yellow-300 focus-visible:ring-[calc(2/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:outline-offset-[calc(2/16*1rem)] focus-visible:outline-black focus-visible:outline-solid'
                onClick={handleClickPrompt}
              >
                {systemContextTitle}
              </button>
            </div>

            <div className='relative flex-0'>
              <Menu>
                <Tooltip placement='left'>
                  <TooltipTrigger asChild>
                    <MenuButton
                      id={`${systemContextId}-menu-button`}
                      className={`flex size-9 items-center justify-center rounded-4 after:absolute after:-inset-full after:m-auto after:h-11 after:w-11 hover:bg-solid-gray-50 hover:-outline-offset-[calc(2/16*1rem)] hover:outline-black hover:outline-solid focus-visible:bg-yellow-300 focus-visible:ring-[calc(6/16*1rem)] focus-visible:ring-yellow-300 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-black focus-visible:outline-solid focus-visible:ring-inset`}
                    >
                      <MoreVertIcon aria-label='プロンプトの操作' role='img' className='mt-0.5' />
                    </MenuButton>
                  </TooltipTrigger>
                  <TooltipContent aria-hidden={true}>プロンプトの操作</TooltipContent>
                </Tooltip>

                <MenuItems
                  modal={false}
                  className={`absolute top-full right-0 z-10 w-auto min-w-fit rounded-8 border border-solid-gray-420 bg-white py-2 shadow-1 focus:outline-hidden`}
                >
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        type='button'
                        onClick={() => {
                          setEditing(true);
                          setTempTitle(systemContextTitle);
                        }}
                        className={`relative flex w-full items-center gap-x-2 bg-white py-3 pr-6 pl-3 text-oln-16N-100 text-nowrap hover:bg-solid-gray-50 hover:underline hover:underline-offset-[calc(3/16*1rem)] ${focus ? '[:root[data-headlessui-focus-visible]_&]:bg-yellow-300 [:root[data-headlessui-focus-visible]_&]:text-solid-gray-800 [:root[data-headlessui-focus-visible]_&]:ring-[calc(6/16*1rem)] [:root[data-headlessui-focus-visible]_&]:ring-yellow-300 [:root[data-headlessui-focus-visible]_&]:outline-4 [:root[data-headlessui-focus-visible]_&]:-outline-offset-4 [:root[data-headlessui-focus-visible]_&]:outline-black [:root[data-headlessui-focus-visible]_&]:outline-solid [:root[data-headlessui-focus-visible]_&]:ring-inset' : ''}`}
                      >
                        <PiPencilLine aria-hidden={true} className='text-lg' />
                        名前を変更
                      </button>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ focus }) => (
                      <button
                        type='button'
                        aria-haspopup='dialog'
                        onClick={() => {
                          setShowDeleteDialog(true);
                        }}
                        className={`relative flex w-full items-center gap-x-2 bg-white py-3 pr-6 pl-3 text-oln-16N-100 text-nowrap text-error-1 hover:bg-solid-gray-50 hover:underline hover:underline-offset-[calc(3/16*1rem)] ${focus ? '[:root[data-headlessui-focus-visible]_&]:bg-yellow-300 [:root[data-headlessui-focus-visible]_&]:text-solid-gray-800 [:root[data-headlessui-focus-visible]_&]:ring-[calc(6/16*1rem)] [:root[data-headlessui-focus-visible]_&]:ring-yellow-300 [:root[data-headlessui-focus-visible]_&]:outline-4 [:root[data-headlessui-focus-visible]_&]:-outline-offset-4 [:root[data-headlessui-focus-visible]_&]:outline-black [:root[data-headlessui-focus-visible]_&]:outline-solid [:root[data-headlessui-focus-visible]_&]:ring-inset' : ''}`}
                      >
                        <PiTrash aria-hidden={true} className='text-lg' />
                        削除
                      </button>
                    )}
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </>
        )}
      </li>

      <DialogConfirmDeleteSystemContext
        isOpen={showDeleteDialog}
        systemContextTitle={systemContextTitle}
        systemContextId={systemContextId}
        onDelete={handleDelete}
        onClose={() => setShowDeleteDialog(false)}
      />
    </>
  );
};
