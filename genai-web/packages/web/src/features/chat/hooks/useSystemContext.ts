import { useMemo } from 'react';
import { useSystemContextApi } from './useSystemContextApi';

export const useSystemContext = () => {
  const { listSystemContexts, createSystemContext, deleteSystemContext, updateSystemContextTitle } =
    useSystemContextApi();
  const { data: systemContextResponse, mutate: mutateSystemContext } = listSystemContexts();

  const systemContextList = useMemo(() => systemContextResponse ?? [], [systemContextResponse]);

  const onSaveSystemContext = async (title: string, systemContext: string) => {
    await createSystemContext(title, systemContext);
    mutateSystemContext();
  };

  const onDeleteSystemContext = async (systemContextId: string) => {
    try {
      await mutateSystemContext(
        async (current) => {
          await deleteSystemContext(systemContextId);
          return (current ?? []).filter((item) => item.systemContextId !== systemContextId);
        },
        {
          optimisticData: (current) =>
            (current ?? []).filter((item) => item.systemContextId !== systemContextId),
          rollbackOnError: true,
          revalidate: true,
        },
      );
    } catch (e) {
      console.error(e);
    }
  };

  const onUpdateSystemContext = async (systemContextId: string, title: string) => {
    try {
      await mutateSystemContext(
        async (current) => {
          await updateSystemContextTitle(systemContextId, title);
          return (current ?? []).map((item) =>
            item.systemContextId === systemContextId
              ? { ...item, systemContextTitle: title }
              : item,
          );
        },
        {
          optimisticData: (current) =>
            (current ?? []).map((item) =>
              item.systemContextId === systemContextId
                ? { ...item, systemContextTitle: title }
                : item,
            ),
          rollbackOnError: true,
          revalidate: true,
        },
      );
    } catch (e) {
      console.error(e);
    }
  };

  return {
    systemContextList,
    onSaveSystemContext,
    onDeleteSystemContext,
    onUpdateSystemContext,
  };
};
