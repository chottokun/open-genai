import {
  DeleteFileResponse,
  GetFileDownloadSignedUrlRequest,
  GetFileDownloadSignedUrlResponse,
  GetFileUploadSignedUrlRequest,
  GetFileUploadSignedUrlResponse,
  UploadFileRequest,
} from 'genai-web';
import { genUApi, uploadToSignedUrl } from '@/lib/fetcher';

const parseS3Url = (s3Url: string) => {
  let result = /^s3:\/\/(?<bucketName>.+?)\/(?<prefix>.+)/.exec(s3Url);

  if (!result) {
    result = /^https:\/\/s3.(?<region>.+?).amazonaws.com\/(?<bucketName>.+?)\/(?<prefix>.+)$/.exec(
      s3Url,
    );

    if (!result) {
      result =
        /^https:\/\/(?<bucketName>.+?).s3(|(\.|-)(?<region>.+?)).amazonaws.com\/(?<prefix>.+)$/.exec(
          s3Url,
        );
    }
  }

  return result?.groups as {
    bucketName: string;
    prefix: string;
    region?: string;
  };
};

export const getSignedUrl = (req: GetFileUploadSignedUrlRequest) => {
  return genUApi.post<GetFileUploadSignedUrlResponse>('file/url', req);
};

export const uploadFile = (url: string, req: UploadFileRequest) => {
  return uploadToSignedUrl(url, req.file, 'file/*');
};

export const getFileDownloadSignedUrl = async (s3Url: string) => {
  // バックエンドのローカルファイル配信URL（/files/{key}）が含まれるか判定
  const isLocalFile = s3Url.includes('/files/');

  // ローカル版で、かつローカルファイル保存パスではない他の外部URLの場合はそのまま返す
  if (/^https?:\/\//.test(s3Url) && !isLocalFile) {
    return s3Url;
  }

  // ローカルファイルの場合、バックエンドからワンタイム署名付きURLを取得する
  if (isLocalFile) {
    const match = /\/files\/(.+)$/.exec(s3Url);
    const filePrefix = match ? match[1] : '';

    const params: GetFileDownloadSignedUrlRequest = {
      bucketName: 'local-bucket',
      filePrefix: decodeURIComponent(filePrefix),
      region: 'local',
    };
    const { data: url } = await genUApi.get<GetFileDownloadSignedUrlResponse>('/file/url', {
      params,
    });
    return url;
  }

  const { bucketName, prefix, region } = parseS3Url(s3Url);

  const [filePrefix, anchorLink] = prefix.split('#');

  const params: GetFileDownloadSignedUrlRequest = {
    bucketName: bucketName,
    filePrefix: decodeURIComponent(filePrefix),
    region: region,
  };
  const { data: url } = await genUApi.get<GetFileDownloadSignedUrlResponse>('/file/url', {
    params,
  });
  return `${url}${anchorLink ? `#${anchorLink}` : ''}`;
};

export const deleteUploadedFile = async (fileName: string) => {
  return genUApi.delete<DeleteFileResponse>(`file/${encodeURIComponent(fileName)}`);
};

export const getS3Uri = (s3Url: string) => {
  const { bucketName, prefix } = parseS3Url(s3Url);
  return `s3://${bucketName}/${prefix}`;
};
