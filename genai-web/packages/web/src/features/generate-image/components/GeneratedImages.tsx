import { Fragment } from 'react/jsx-runtime';
import { Base64Image } from '@/features/generate-image/components/Base64Image';
import { useGenerateImageStore } from '@/features/generate-image/stores/useGenerateImageStore';
import { generateRandomSeed } from '../utils/generateRandomSeed';

type Props = {
  generating: boolean;
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
};

export const GeneratedImages = (props: Props) => {
  const { generating, selectedImageIndex, setSelectedImageIndex } = props;

  const { image, imageSample, seed, setSeed } = useGenerateImageStore();

  const onSelectImage = (idx: number) => {
    if (seed[idx] < 0) {
      setSeed(generateRandomSeed(), idx);
    }
    setSelectedImageIndex(idx);
  };

  return (
    <>
      <div className='flex items-center justify-center'>
        <Base64Image
          alt={`生成画像 ${selectedImageIndex + 1}`}
          className='min-h-60 max-w-lg min-w-60'
          imageBase64={image[selectedImageIndex].base64}
          loading={generating}
          error={image[selectedImageIndex].error}
          errorMessage={image[selectedImageIndex].errorMessage}
          format={'image/png'}
        />
      </div>

      <div className='flex flex-row justify-center gap-x-2'>
        {image.map((image, idx) => (
          <Fragment key={idx}>
            {idx < imageSample && image.base64 && image.base64 !== '' && (
              <Base64Image
                alt={`生成画像 ${idx + 1} のサムネイル`}
                aria-label={`生成画像 ${idx + 1} を選択${idx === selectedImageIndex ? '（選択中）' : ''}`}
                className={`${
                  idx === selectedImageIndex
                    ? 'border-solid-gray-420! outline-2 outline-blue-1000! outline-solid'
                    : ''
                } mt-3 size-10`}
                imageBase64={image.base64}
                loading={generating}
                clickable
                error={image.error}
                onClick={() => {
                  onSelectImage(idx);
                }}
                format={'image/png'}
              />
            )}
          </Fragment>
        ))}
      </div>
    </>
  );
};
