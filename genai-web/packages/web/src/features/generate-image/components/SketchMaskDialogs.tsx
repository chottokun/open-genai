import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { Canvas } from '../types';
import { SketchPad } from './SketchPad';

type Props = {
  width: number;
  height: number;
  initImage: Canvas;
  maskImage: Canvas;
  isOpenSketch: boolean;
  isOpenMask: boolean;
  onCloseSketch: () => void;
  onCloseMask: () => void;
  onChangeInitImage: (canvas: Canvas) => void;
  onChangeMaskImage: (canvas: Canvas) => void;
};

export const SketchMaskDialogs = ({
  width,
  height,
  initImage,
  maskImage,
  isOpenSketch,
  isOpenMask,
  onCloseSketch,
  onCloseMask,
  onChangeInitImage,
  onChangeMaskImage,
}: Props) => {
  return (
    <>
      <CustomDialog isOpen={isOpenSketch} onClose={onCloseSketch}>
        <CustomDialogPanel>
          <CustomDialogHeader>初期画像の設定</CustomDialogHeader>
          <CustomDialogBody>
            <p className='mb-4'>
              画像生成の初期状態として使われます。指定した画像に近い画像が生成されます。
            </p>
            <SketchPad
              width={width}
              height={height}
              image={initImage}
              onChange={onChangeInitImage}
              onCancel={onCloseSketch}
            />
          </CustomDialogBody>
        </CustomDialogPanel>
      </CustomDialog>

      <CustomDialog isOpen={isOpenMask} className='w-[530px]' onClose={onCloseMask}>
        <CustomDialogPanel>
          <CustomDialogHeader>マスク画像の設定</CustomDialogHeader>
          <CustomDialogBody>
            <p className='mb-4'>
              画像生成のマスクとして使われます。マスクした範囲（Inpaint）もしくは外側（Outpaint）が生成されます。
            </p>
            <SketchPad
              width={width}
              height={height}
              image={maskImage}
              background={initImage}
              maskMode={true}
              onChange={onChangeMaskImage}
              onCancel={onCloseMask}
            />
          </CustomDialogBody>
        </CustomDialogPanel>
      </CustomDialog>
    </>
  );
};
