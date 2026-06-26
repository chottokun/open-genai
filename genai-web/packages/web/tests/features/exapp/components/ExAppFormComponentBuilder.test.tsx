import { render, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import { ExAppFormComponentBuilder } from '../../../../src/features/exapp/components/ExAppFormComponentBuilder';

describe('ExAppFormComponentBuilder', () => {
  it('renders text input component', async () => {
    const json = `{
        "question": {
            "type": "text",
            "title": "入力",
            "desc": "質問したい内容を入力してください。",
            "required": true,
            "default_value": "デフォルト値"
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { getByRole } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        errors={result.current.formState.errors}
      />,
    );

    const input = getByRole('textbox', { name: /入力/ });
    expect(input).toBeDefined();
    expect(input.tagName).toEqual('INPUT');
    expect(input.getAttribute('name')).toEqual('question');
  });

  it('renders number input component', async () => {
    const json = `{
        "count": {
            "type": "number",
            "title": "カウンター",
            "desc": "10から1000までの数値を入力してください。",
            "required": true,
            "min": 10,
            "max": 1000,
            "default_value": 100
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { getByRole } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        errors={result.current.formState.errors}
      />,
    );

    const input = getByRole('textbox', { name: /カウンター/ });
    expect(input).toBeDefined();
    expect(input.tagName).toEqual('INPUT');
    expect(input.getAttribute('name')).toEqual('count');
  });

  it('renders file input component', async () => {
    const json = `{
        "image": {
            "type": "file",
            "title": "添付ファイル",
            "desc": "参考資料となる画像ファイルを添付してください。",
            "required": false,
            "accept": "image/png,image/jpeg,application/pdf,text/plain",
            "multiple": true,
            "max_size": "4.5MB",
            "max_file_count": 2
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { container, getByRole, getByText } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        setValue={result.current.setValue}
        trigger={result.current.trigger}
        clearErrors={result.current.clearErrors}
        errors={result.current.formState.errors}
      />,
    );

    const input = container.querySelector('input[type="file"]');
    const button = getByRole('button', { name: /ファイルを選択/ });
    expect(input).toBeDefined();
    expect(button).toBeDefined();
    expect(input?.tagName).toEqual('INPUT');
    expect(button?.tagName).toEqual('BUTTON');
    expect(input?.getAttribute('name')).toEqual('image');
    expect(input?.getAttribute('type')).toEqual('file');

    // 説明文がレンダリングされていることを確認
    expect(getByText(/参考資料となる画像ファイルを添付してください。/)).toBeDefined();
    // 対応ファイル形式が表示されていることを確認
    expect(
      getByText(/対応ファイル：PNG\/JPEG形式の画像、PDF\/テキスト形式のドキュメント/),
    ).toBeDefined();
    // ファイル数制限が表示されていることを確認
    expect(getByText(/2ファイルまで選択可能。/)).toBeDefined();
    // サイズ制限が表示されていることを確認
    expect(getByText(/1ファイルあたり4\.5MB（4,718,592バイト）まで。/)).toBeDefined();
    // Base64に関する注釈が表示されていることを確認
    expect(getByText(/※表示されるファイルサイズはBase64エンコード後の値です/)).toBeDefined();
  });

  it('renders file input component with single file (no multiple)', async () => {
    const json = `{
        "document": {
            "type": "file",
            "title": "ドキュメント",
            "desc": "ドキュメントをアップロードしてください。",
            "required": true,
            "accept": "application/pdf",
            "multiple": false
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { getByText } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        setValue={result.current.setValue}
        trigger={result.current.trigger}
        clearErrors={result.current.clearErrors}
        errors={result.current.formState.errors}
      />,
    );

    // multiple: false の場合は「1ファイルまで選択可能。」と表示される
    expect(getByText(/1ファイルまで選択可能。/)).toBeDefined();
    // 対応ファイル形式が表示されていることを確認
    expect(getByText(/対応ファイル：PDF形式のドキュメント/)).toBeDefined();
  });

  it('renders textarea input component', async () => {
    const json = `{
        "content": {
            "type": "textarea",
            "title": "コンテンツ",
            "desc": "フィールドの説明文",
            "required": true,
            "min_length": 10,
            "max_length": 1000,
            "default_value": "デフォルト値"
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { getByRole } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        errors={result.current.formState.errors}
      />,
    );

    const input = getByRole('textbox', { name: /コンテンツ/ });
    expect(input).toBeDefined();
    expect(input.tagName).toEqual('TEXTAREA');
    expect(input.getAttribute('name')).toEqual('content');
  });

  it('renders select component', async () => {
    const json = `{
        "prefecture": {
            "type": "select",
            "title": "都道府県",
            "desc": "フィールドの説明文",
            "required": false,
            "items": [
                { "title": "東京都", "value": "13" },
                { "title": "神奈川県", "value": "14" }
            ],
            "default_value": "13"
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { getByRole, getAllByRole } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        errors={result.current.formState.errors}
      />,
    );

    const input = getByRole('combobox', { name: /都道府県/ });
    expect(input).toBeDefined();
    expect(input.tagName).toEqual('SELECT');
    expect(input.getAttribute('name')).toEqual('prefecture');
    expect(getAllByRole('option').length).toEqual(2);
  });

  it('renders checkbox component', async () => {
    const json = `{
        "skills": {
            "type": "checkbox",
            "title": "プログラミング言語",
            "desc": "フィールドの説明文",
            "required": false,
            "items": [
                { "title": "JavaScript", "value": "js" },
                { "title": "TypeScript", "value": "ts" }
            ],
            "default_value": "ts"
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { getByRole } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        errors={result.current.formState.errors}
      />,
    );

    const input1 = getByRole('checkbox', { name: /JavaScript/ });
    expect(input1).toBeDefined();
    expect(input1.tagName).toEqual('INPUT');
    expect(input1.getAttribute('name')).toEqual('skills');

    const input2 = getByRole('checkbox', { name: /TypeScript/ });
    expect(input2).toBeDefined();
    expect(input2.tagName).toEqual('INPUT');
    expect(input2.getAttribute('name')).toEqual('skills');
  });

  it('renders radio component', async () => {
    const json = `{
        "gender": {
            "type": "radio",
            "title": "性別",
            "desc": "フィールドの説明文",
            "required": true,
            "items": [
                { "title": "男性", "value": "1" },
                { "title": "女性", "value": "2" }
            ]
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { getByRole } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        errors={result.current.formState.errors}
      />,
    );

    const input1 = getByRole('radio', { name: /男性/ });
    expect(input1).toBeDefined();
    expect(input1.tagName).toEqual('INPUT');
    expect(input1.getAttribute('name')).toEqual('gender');

    const input2 = getByRole('radio', { name: /女性/ });
    expect(input2).toBeDefined();
    expect(input2.tagName).toEqual('INPUT');
    expect(input2.getAttribute('name')).toEqual('gender');
  });

  it('renders unsupported type component', async () => {
    const json = `{
        "error": {
            "type": "error"
        }
    }`;

    const uiJSON = JSON.parse(json);

    const { result } = renderHook(() => useForm({ mode: 'onSubmit' }));

    const { getByText } = render(
      <ExAppFormComponentBuilder
        uiJson={uiJSON}
        register={result.current.register}
        errors={result.current.formState.errors}
      />,
    );

    const input = getByText('サポート外のコンポーネントです。');
    expect(input).toBeDefined();
    expect(input.tagName).toEqual('P');
  });
});
