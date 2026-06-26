import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { type ColorChangeHandler, CompactPicker } from 'react-color';
import {
  PiArrowClockwise,
  PiArrowCounterClockwise,
  PiDotBold,
  PiEraserFill,
  PiPaintBrushFill,
  PiPaintBucketFill,
  PiUploadSimple,
} from 'react-icons/pi';
import SignatureCanvasDefault from 'react-signature-canvas';
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { Button } from '@/components/ui/dads/Button';
import { RangeSlider } from '@/features/generate-image/components/RangeSlider';
import { Canvas } from '../types';
import { SketchButton } from './SketchButton';

// react-signature-canvas は CJS のみ提供しており、Vite 8 の deps optimizer が
// __esModule フラグを正しく処理しないため、default export を手動で取得する
const SignatureCanvas =
  'default' in SignatureCanvasDefault
    ? (SignatureCanvasDefault as unknown as { default: typeof SignatureCanvasDefault }).default
    : SignatureCanvasDefault;

type Props = {
  width: number;
  height: number;
  image?: Canvas;
  background?: Canvas;
  maskMode?: boolean;
  onChange: (image: Canvas) => void;
  onCancel: () => void;
};

export const SketchPad = (props: Props) => {
  const canvasRef = useRef<SignatureCanvasDefault>(null);
  const [penColor, setPenColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [dotSize, setDotSize] = useState(3);
  const [isEraseMode, setIsEraseMode] = useState(false);
  const [isOpenPalette, setIsOpenPalette] = useState(false);
  const [isOpenPaletteBg, setIsOpenPaletteBg] = useState(false);
  const [isOpendotSizeSlider, setIsOpendotSizeSlider] = useState(false);

  const [isOpenUpload, setIsOpenUpload] = useState(false);

  const undoStack: SignaturePad.Point[][] = [];

  useEffect(() => {
    if (props.image?.imageBase64) {
      canvasRef.current?.fromDataURL(props.image.foregroundBase64, {
        height: props.height,
        width: props.width,
      });
      setBgColor(props.image.backgroundColor);
    }
  }, [props.image, props.height, props.width]);

  const onChangePenColor: ColorChangeHandler = (color) => {
    setIsOpenPalette(false);
    setPenColor(color.hex);
  };

  const onChangeBgColor: ColorChangeHandler = (color) => {
    setIsOpenPaletteBg(false);
    setBgColor(color.hex);
  };

  const onClickUndo = () => {
    const data = canvasRef.current?.toData();
    if (data) {
      const undoItem = data.pop();
      if (undoItem) {
        undoStack.push(undoItem);
      }
      canvasRef.current?.fromData(data);
    }
  };

  const onClickRedo = () => {
    const data = canvasRef.current?.toData();
    if (data) {
      const redoItem = undoStack.pop();
      if (redoItem) {
        data.push(redoItem);
        canvasRef.current?.fromData(data);
      }
    }
  };

  const onClickComplete = () => {
    if (canvasRef.current?.isEmpty()) {
      props.onChange({
        imageBase64: '',
        foregroundBase64: '',
        backgroundColor: '#ffffff',
      });
      return;
    }

    // 背景色を設定するために、新しくcanvasで四角を作成し合成する
    const canvas = document.createElement('canvas');
    canvas.width = props.width;
    canvas.height = props.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, props.width, props.height);
      const img = canvasRef.current?.getCanvas();
      if (img) {
        ctx.drawImage(img, 0, 0, props.width, props.height);

        // 二値化処理
        if (props.maskMode) {
          const imageData = ctx.getImageData(0, 0, props.width, props.height);
          const data = imageData.data;
          const threshold = 128; // 閾値（0～255）
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3; // 平均値を計算
            const value = avg > threshold ? 255 : 0; // 閾値を基に二値化
            data[i] = data[i + 1] = data[i + 2] = value; // RGBを同じ値に設定
          }
          ctx.putImageData(imageData, 0, 0);
        }

        props.onChange({
          imageBase64: canvas.toDataURL('image/png'),
          foregroundBase64: canvasRef.current?.toDataURL('image/png') || '',
          backgroundColor: bgColor,
        });
      }
    }
  };

  const [imageBase64, setImageBase64] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];

      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = props.width;
          canvas.height = props.height;

          // Fit Image
          const imgRatio = img.width / img.height;
          const canvasRatio = canvas.width / canvas.height;
          let width: number, height: number;
          if (imgRatio > canvasRatio) {
            width = canvas.width;
            height = canvas.width / imgRatio;
          } else {
            height = canvas.height;
            width = canvas.height * imgRatio;
          }
          const x = (canvas.width - width) / 2;
          const y = (canvas.height - height) / 2;

          ctx?.drawImage(img, x, y, width, height);

          const resizedImageDataUri = canvas.toDataURL(file.type);

          setImageBase64(resizedImageDataUri);
        };
      };
    }
  };
  const onClickUploadComplete = () => {
    props.onChange({
      imageBase64: imageBase64,
      foregroundBase64: imageBase64,
      backgroundColor: bgColor,
    });
  };

  const onClickClear = () => {
    canvasRef.current?.clear();
  };

  const hideAllPalette = () => {
    setIsOpenPalette(false);
    setIsOpendotSizeSlider(false);
    setIsOpenPaletteBg(false);
  };

  return (
    <>
      <CustomDialog
        isOpen={isOpenUpload}
        onClose={() => {
          setIsOpenUpload(false);
        }}
      >
        <CustomDialogPanel>
          <CustomDialogHeader>画像をアップロード</CustomDialogHeader>
          <CustomDialogBody>
            <div>
              <div className='mb-3 flex w-full'>
                <input type='file' onChange={handleImageUpload} accept='image/*' />
              </div>
              <div className='flex w-full justify-center'>
                {imageBase64 && <img src={imageBase64} alt='' width='512' height='512' />}
              </div>

              <div className='mt-4 flex flex-row-reverse justify-start gap-2'>
                <Button variant='solid-fill' size='md' onClick={onClickUploadComplete}>
                  完了
                </Button>
                <Button
                  variant='text'
                  size='md'
                  onClick={() => {
                    setIsOpenUpload(false);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </CustomDialogBody>
        </CustomDialogPanel>
      </CustomDialog>
      <div className='w-full'>
        <div className={`m-auto mb-1 flex w-[512px] items-end justify-between`}>
          <div className='flex'>
            <div className='flex'>
              {!props.maskMode && (
                <SketchButton
                  label='ペンの色'
                  className='relative text-xl'
                  onClick={() => {
                    hideAllPalette();
                    setIsOpenPalette(!isOpenPalette);
                  }}
                >
                  <PiPaintBrushFill style={{ color: penColor }} />
                </SketchButton>
              )}
              {isOpenPalette && (
                <CompactPicker
                  className='absolute top-7 -left-6 border bg-white'
                  color={penColor}
                  onChangeComplete={onChangePenColor}
                  onChange={onChangePenColor}
                />
              )}

              <SketchButton
                label='ペンのサイズ'
                className='relative ml-0.5 text-xl'
                onClick={() => {
                  hideAllPalette();
                  setIsOpendotSizeSlider(!isOpendotSizeSlider);
                }}
              >
                <PiDotBold />
              </SketchButton>
              {isOpendotSizeSlider && (
                <div className='relative'>
                  <div className='absolute top-7 -left-6 flex flex-row gap-2 border bg-white p-2'>
                    <div
                      className='flex items-center justify-center border'
                      style={{ width: '80px', height: '80px' }}
                    >
                      <div
                        className='rounded-full bg-black'
                        style={{
                          width: dotSize * 2,
                          height: dotSize * 2,
                        }}
                      ></div>
                    </div>
                    <RangeSlider
                      className=''
                      label='PenSize'
                      id='pen-size'
                      min={1}
                      max={30}
                      value={dotSize}
                      onChange={(n) => {
                        setDotSize(n);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {!props.maskMode && (
              <SketchButton
                label='背景の色'
                className='relative ml-2 text-xl'
                onClick={() => {
                  hideAllPalette();
                  setIsOpenPaletteBg(!isOpenPaletteBg);
                }}
              >
                <PiPaintBucketFill />
              </SketchButton>
            )}
            {isOpenPaletteBg && (
              <CompactPicker
                className='absolute top-7 -left-6 border bg-white'
                color={penColor}
                onChangeComplete={onChangeBgColor}
                onChange={onChangeBgColor}
              />
            )}

            <SketchButton
              label='消しゴム'
              className='ml-2 text-xl'
              isActive={isEraseMode}
              onClick={() => {
                setIsEraseMode(!isEraseMode);
              }}
            >
              <PiEraserFill />
            </SketchButton>

            <div className='ml-2 flex gap-0.5'>
              <SketchButton label='元に戻す' className='text-xl' onClick={onClickUndo}>
                <PiArrowCounterClockwise />
              </SketchButton>
              <SketchButton label='やり直し' className='text-xl' onClick={onClickRedo}>
                <PiArrowClockwise />
              </SketchButton>
            </div>
          </div>

          <Button variant='outline' size='sm' onClick={onClickClear}>
            リセット
          </Button>
        </div>

        <div className='flex w-full justify-center'>
          <SignatureCanvas
            ref={canvasRef}
            canvasProps={{
              width: props.width,
              height: props.height,
              className: 'border',
              style: {
                backgroundColor: bgColor,
                backgroundImage: `url(${props.background?.imageBase64})`,
              },
            }}
            penColor={isEraseMode ? bgColor : penColor}
            dotSize={dotSize}
            maxWidth={dotSize}
            minWidth={dotSize}
          />
        </div>
        <div className='mt-4 flex flex-row-reverse justify-between'>
          <div className='flex gap-3'>
            <Button
              className='flex items-center justify-center gap-1.5'
              variant='outline'
              size='md'
              onClick={() => {
                setIsOpenUpload(true);
              }}
            >
              <PiUploadSimple aria-hidden={true} className='mr-2 text-xl' />
              画像をアップロード
            </Button>
            <Button variant='solid-fill' size='md' onClick={onClickComplete}>
              完了
            </Button>
          </div>
          <Button variant='text' size='md' onClick={props.onCancel}>
            キャンセル
          </Button>
        </div>
      </div>
    </>
  );
};
