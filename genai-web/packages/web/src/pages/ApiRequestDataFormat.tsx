import { PageTitle } from '@/components/PageTitle';
import { BreadcrumbsNav } from '@/components/ui/BreadcrumbsNav';
import { Link } from '@/components/ui/dads/Link';
import { APP_TITLE } from '@/constants';
import { LayoutBody } from '@/layout/LayoutBody';

export const ApiRequestDataFormatPage = () => {
  const PAGE_TITLE = 'APIリクエストのデータ形式';

  return (
    <LayoutBody>
      <PageTitle title={`${PAGE_TITLE}${APP_TITLE ? ` | ${APP_TITLE}` : ''}`} />
      <div className='mx-auto p-6 max-w-(--page-width) lg:p-8'>
        <BreadcrumbsNav
          items={[{ label: 'ホーム', to: '/' }, { label: PAGE_TITLE }]}
          className='mb-4'
        />
        <h1 className='mb-6 flex justify-start text-std-24B-150 lg:text-std-28B-150'>
          {PAGE_TITLE}
        </h1>
        <div className='prose'>
          <h2>構造</h2>
          <p>構造は以下のように記述します。</p>
          <pre>
            <code>{`{
  "Request-Key": <Request-Definition>,
  "Request-Key": <Request-Definition>,
  ...
}`}</code>
          </pre>
          <ul>
            <li>
              <code>Request-Key</code>：AIアプリに送信するリクエストのペイロードキーを指定します。
            </li>
            <li>
              <code>Request-Definition</code>：
              コンポーネント毎に定義される内容が異なるため、各コンポーネントの説明を参照してください。
            </li>
          </ul>

          <h2>コンポーネント</h2>
          <ul>
            <li>
              <Link href='#text-field'>テキストフィールド</Link>
            </li>
            <li>
              <Link href='#number-field'>数値フィールド</Link>
            </li>
            <li>
              <Link href='#file'>ファイル</Link>
            </li>
            <li>
              <Link href='#textarea'>テキストエリア</Link>
            </li>
            <li>
              <Link href='#select-box'>セレクトボックス</Link>
            </li>
            <li>
              <Link href='#checkbox'>チェックボックス</Link>
            </li>
            <li>
              <Link href='#radio-button'>ラジオボタン</Link>
            </li>
            <li>
              <Link href='#hidden'>hidden</Link>
            </li>
          </ul>

          <h3 id='text-field'>テキストフィールド</h3>
          <p>テキストフィールドは、文字列を入力するためのコンポーネントです。</p>
          <dl>
            <dt className='text-std-18B-160 mt-6'>記述例</dt>
            <dd>
              <pre>
                <code>{`"Request-Key": {
  "type": "text",
  "title": "ラベルに表示されるタイトル",
  "desc": "フィールドの説明文",
  "required": true,
  "min_length": 10,
  "max_length": 1000,
  "default_value": "デフォルト値"
}`}</code>
              </pre>
            </dd>
          </dl>
          <figure className='my-8'>
            <figcaption className='text-std-18B-160 mt-4'>パラメータ一覧</figcaption>
            <table>
              <thead>
                <tr>
                  <th scope='col'>パラメータ</th>
                  <th scope='col'>要否</th>
                  <th scope='col'>型</th>
                  <th scope='col'>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>必須</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>desc</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>required</code>
                  </td>
                  <td>任意</td>
                  <td>真偽値</td>
                  <td>指定しなかった場合、任意のフィールドとして扱われます</td>
                </tr>
                <tr>
                  <td>
                    <code>min_length</code>
                  </td>
                  <td>任意</td>
                  <td>数値</td>
                  <td>負の値は設定できません</td>
                </tr>
                <tr>
                  <td>
                    <code>max_length</code>
                  </td>
                  <td>任意</td>
                  <td>数値</td>
                  <td>負の値は設定できません</td>
                </tr>
                <tr>
                  <td>
                    <code>default_value</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </figure>

          <h3 id='number-field'>数値フィールド</h3>
          <p>数値フィールドは、数値を入力するためのコンポーネントです。</p>
          <dl>
            <dt className='text-std-18B-160 mt-6'>記述例</dt>
            <dd>
              <pre>
                <code>{`"Request-Key": {
  "type": "number",
  "title": "ラベルに表示されるタイトル",
  "desc": "フィールドの説明文",
  "required": true,
  "min": 10,
  "max": 1000,
  "default_value": 100
}`}</code>
              </pre>
            </dd>
          </dl>
          <figure className='my-8'>
            <figcaption className='text-std-18B-160 mt-4'>パラメータ一覧</figcaption>
            <table>
              <thead>
                <tr>
                  <th scope='col'>パラメータ</th>
                  <th scope='col'>要否</th>
                  <th scope='col'>型</th>
                  <th scope='col'>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>必須</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>desc</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>required</code>
                  </td>
                  <td>任意</td>
                  <td>真偽値</td>
                  <td>指定しなかった場合、任意のフィールドとして扱われます</td>
                </tr>
                <tr>
                  <td>
                    <code>min</code>
                  </td>
                  <td>任意</td>
                  <td>数値</td>
                  <td>負の値は設定できません</td>
                </tr>
                <tr>
                  <td>
                    <code>max</code>
                  </td>
                  <td>任意</td>
                  <td>数値</td>
                  <td>負の値は設定できません</td>
                </tr>
                <tr>
                  <td>
                    <code>default_value</code>
                  </td>
                  <td>任意</td>
                  <td>数値</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </figure>

          <h3 id='file'>ファイル</h3>
          <p>ファイルは、ファイルをアップロードするためのコンポーネントです。</p>
          <dl>
            <dt className='text-std-18B-160 mt-6'>記述例</dt>
            <dd>
              <pre>
                <code>{`"Request-Key": {
  "type": "file",
  "title": "ラベルに表示されるタイトル",
  "desc": "フィールドの説明文",
  "required": false,
  "accept": "image/png,image/jpeg",
  "multiple": true,
  "max_size": "4.5MB",
  "max_file_count": 5
}`}</code>
              </pre>
            </dd>
          </dl>
          <figure className='my-8'>
            <figcaption className='text-std-18B-160 mt-4'>パラメータ一覧</figcaption>
            <table>
              <thead>
                <tr>
                  <th scope='col'>パラメータ</th>
                  <th scope='col'>要否</th>
                  <th scope='col'>型</th>
                  <th scope='col'>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>必須</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>desc</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>required</code>
                  </td>
                  <td>任意</td>
                  <td>真偽値</td>
                  <td>指定しなかった場合、任意のフィールドとして扱われます</td>
                </tr>
                <tr>
                  <td>
                    <code>accept</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td>
                    仕様は
                    <Link
                      href='https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Attributes/accept'
                      target='_blank'
                      rel='noreferrer'
                    >
                      MDN
                    </Link>
                    を参照してください
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>multiple</code>
                  </td>
                  <td>任意</td>
                  <td>真偽値</td>
                  <td>
                    1つのフィールドで複数のファイルを送信したい場合は <code>true</code>{' '}
                    を設定してください
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>max_size</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td>添付ファイルのサイズ制限。KB, MB, GBのいずれかを指定してください</td>
                </tr>
                <tr>
                  <td>
                    <code>max_file_count</code>
                  </td>
                  <td>任意</td>
                  <td>数値</td>
                  <td>
                    アップロード可能なファイル数の上限。指定しなかった場合、上限は以下の通りになります。
                    <ul>
                      <li>
                        <code>multiple:true</code>の場合：100
                      </li>
                      <li>
                        <code>multiple:false</code>の場合：1
                      </li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </figure>
          <h4>注意点</h4>
          <ul>
            <li>ファイルはBase64エンコードされて送信されます</li>
            <li>
              Base64エンコード後の値でバリデーションされるため、実際にアップロードできるファイルサイズは
              <code>max_size</code>よりも小さくなります
            </li>
          </ul>

          <h3 id='textarea'>テキストエリア</h3>
          <p>テキストエリアは、複数行の文字列を入力するためのコンポーネントです。</p>
          <dl>
            <dt className='text-std-18B-160 mt-6'>記述例</dt>
            <dd>
              <pre>
                <code>{`"Request-Key": {
  "type": "textarea",
  "title": "ラベルに表示されるタイトル",
  "desc": "フィールドの説明文",
  "required": true,
  "min_length": 10,
  "max_length": 1000,
  "default_value": "デフォルト値"
}`}</code>
              </pre>
            </dd>
          </dl>
          <figure className='my-8'>
            <figcaption className='text-std-18B-160 mt-4'>パラメータ一覧</figcaption>
            <table>
              <thead>
                <tr>
                  <th scope='col'>パラメータ</th>
                  <th scope='col'>要否</th>
                  <th scope='col'>型</th>
                  <th scope='col'>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>必須</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>desc</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>required</code>
                  </td>
                  <td>任意</td>
                  <td>真偽値</td>
                  <td>指定しなかった場合、任意のフィールドとして扱われます</td>
                </tr>
                <tr>
                  <td>
                    <code>min_length</code>
                  </td>
                  <td>任意</td>
                  <td>数値</td>
                  <td>負の値は設定できません</td>
                </tr>
                <tr>
                  <td>
                    <code>max_length</code>
                  </td>
                  <td>任意</td>
                  <td>数値</td>
                  <td>負の値は設定できません</td>
                </tr>
                <tr>
                  <td>
                    <code>default_value</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </figure>

          <h3 id='select-box'>セレクトボックス</h3>
          <p>セレクトボックスは、複数の選択肢から1つを選択するためのコンポーネントです。</p>
          <dl>
            <dt className='text-std-18B-160 mt-6'>記述例</dt>
            <dd>
              <pre>
                <code>{`"Request-Key": {
  "type": "select",
  "title": "ラベルに表示されるタイトル",
  "desc": "フィールドの説明文",
  "required": false,
  "items": [
    { "title": "タイトル1", "value": "value1" },
    { "title": "タイトル2", "value": "value2" },
  ],
  "default_value": "value2"
}`}</code>
              </pre>
            </dd>
          </dl>
          <figure className='my-8'>
            <figcaption className='text-std-18B-160 mt-4'>パラメータ一覧</figcaption>
            <table>
              <thead>
                <tr>
                  <th scope='col'>パラメータ</th>
                  <th scope='col'>要否</th>
                  <th scope='col'>型</th>
                  <th scope='col'>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>必須</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>desc</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>required</code>
                  </td>
                  <td>任意</td>
                  <td>真偽値</td>
                  <td>指定しなかった場合、任意のフィールドとして扱われます</td>
                </tr>
                <tr>
                  <td>
                    <code>items</code>
                  </td>
                  <td>必須</td>
                  <td>配列</td>
                  <td>
                    <code>{`{ "title": "", "value": "" }`}</code> 形式
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>default_value</code>
                  </td>
                  <td>任意</td>
                  <td>文字列 / 数値</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </figure>

          <h3 id='checkbox'>チェックボックス</h3>
          <p>チェックボックスは、複数の選択肢から複数を選択するためのコンポーネントです。</p>
          <dl>
            <dt className='text-std-18B-160 mt-6'>記述例</dt>
            <dd>
              <pre>
                <code>{`"Request-key": {
  "type": "checkbox",
  "title": "ラベルに表示されるタイトル",
  "desc": "フィールドの説明文",
  "required": false,
  "items": [
    { "title": "タイトル1", "value": "value1" },
    { "title": "タイトル2", "value": "value2" },
  ],
  "default_value": "value2"
}`}</code>
              </pre>
            </dd>
          </dl>
          <figure className='my-8'>
            <figcaption className='text-std-18B-160 mt-4'>パラメータ一覧</figcaption>
            <table>
              <thead>
                <tr>
                  <th scope='col'>パラメータ</th>
                  <th scope='col' className='text-nowrap'>
                    要否
                  </th>
                  <th scope='col'>型</th>
                  <th scope='col'>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>必須</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>desc</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>required</code>
                  </td>
                  <td>任意</td>
                  <td>真偽値</td>
                  <td>指定しなかった場合、任意のフィールドとして扱われます</td>
                </tr>
                <tr>
                  <td>
                    <code>items</code>
                  </td>
                  <td>必須</td>
                  <td>配列</td>
                  <td>
                    <code>{`{ "title": "", "value": "" }`}</code> 形式
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>default_value</code>
                  </td>
                  <td>任意</td>
                  <td>文字列 / 数値</td>
                  <td>
                    デフォルトでチェックされるのは現状1つまでですが、今後複数の値をデフォルトでチェック可能にする予定です
                  </td>
                </tr>
              </tbody>
            </table>
          </figure>
          <h4>注意点</h4>
          <ul>
            <li>複数選択の場合、&quot;a,b,c&quot; のようにカンマ区切りの文字列として送られます</li>
            <li>単数選択の場合、 &quot;a&quot; のようにカンマなしの文字列として送られます</li>
          </ul>

          <h3 id='radio-button'>ラジオボタン</h3>
          <p>ラジオボタンは、複数の選択肢から1つを選択するためのコンポーネントです。</p>
          <dl>
            <dt className='text-std-18B-160 mt-6'>記述例</dt>
            <dd>
              <pre>
                <code>{`"Request-Key": {
  "type": "radio",
  "title": "ラベルに表示されるタイトル",
  "desc": "フィールドの説明文",
  "required": false,
  "items": [
    { "title": "タイトル1", "value": "value1" },
    { "title": "タイトル2", "value": "value2" },
  ],
  "default_value": "value2"
}`}</code>
              </pre>
            </dd>
          </dl>
          <figure className='my-8'>
            <figcaption className='text-std-18B-160 mt-4'>パラメータ一覧</figcaption>
            <table>
              <thead>
                <tr>
                  <th scope='col'>パラメータ</th>
                  <th scope='col'>要否</th>
                  <th scope='col'>型</th>
                  <th scope='col'>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>title</code>
                  </td>
                  <td>必須</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>desc</code>
                  </td>
                  <td>任意</td>
                  <td>文字列</td>
                  <td></td>
                </tr>
                <tr>
                  <td>
                    <code>required</code>
                  </td>
                  <td>任意</td>
                  <td>真偽値</td>
                  <td>指定しなかった場合、任意のフィールドとして扱われます</td>
                </tr>
                <tr>
                  <td>
                    <code>items</code>
                  </td>
                  <td>必須</td>
                  <td>配列</td>
                  <td>
                    <code>{`{ "title": "", "value": "" }`}</code> 形式
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>default_value</code>
                  </td>
                  <td>任意</td>
                  <td>文字列 / 数値</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </figure>

          <h3 id='hidden'>hidden</h3>
          <p>
            見た目上には表示されないコンポーネントです。
            <br />
            内部的に送っておく必要のあるパラメータがある際に利用してください。
          </p>
          <dl>
            <dt className='text-std-18B-160 mt-6'>記述例</dt>
            <dd>
              <pre>
                <code>{`"Request-Key": {
  "type": "hidden",
  "default_value": "value"
}`}</code>
              </pre>
            </dd>
          </dl>
          <figure className='my-8'>
            <figcaption className='text-std-18B-160 mt-4'>パラメータ一覧</figcaption>
            <table>
              <thead>
                <tr>
                  <th scope='col'>パラメータ</th>
                  <th scope='col'>要否</th>
                  <th scope='col'>型</th>
                  <th scope='col'>備考</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>default_value</code>
                  </td>
                  <td>必須</td>
                  <td>文字列 / 数値</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </figure>

          <h2>サンプル</h2>
          <pre>
            <code>{`{
  "question": {
    "type": "text",
    "title": "入力",
    "desc": "質問したい内容を入力してください。",
    "required": true,
    "default_value": "デフォルト値"
  },
  "content": {
    "type": "textarea",
    "title": "コンテンツ",
    "desc": "※ マークダウンでコンテンツを入力してください。"
  },
  "count": {
    "type": "number",
    "title": "数値入力",
    "required": true,
    "min": 10,
    "max": 1000,
    "default_value": 20
  },
  "image": {
    "type": "file",
    "title": "添付ファイル",
    "accept": "image/*"
  },
  "prefecture": {
    "type": "select",
    "title": "都道府県",
    "items": [
      {"title": "東京都", "value": "13"},
      {"title": "神奈川県", "value": "14"},
      {"title": "京都府", "value": "26"}
    ]
  },
  "fruits": {
    "type": "checkbox",
    "title": "フルーツ",
    "items": [
      {"title": "りんご", "value": "apple"},
      {"title": "ばなな", "value": "banana"},
      {"title": "ぶどう", "value": "grape"}
    ]
  },
  "gender": {
    "type": "radio",
    "title": "性別",
    "items": [
      {"title": "男性", "value": "1"},
      {"title": "女性", "value": "2"}
    ]
  }
}`}</code>
          </pre>

          <h2>リクエストフォーマット</h2>
          <p>
            上記サンプルを用いた場合、AIアプリに送信されるリクエストフォーマットは以下のようになります。
          </p>
          <pre>
            <code>{`{
  "inputs": {
    "question": "生成AIとは？",
    "content": "コンテンツコンテンツ\\nコンテンツ",
    "count": 35,
    "files": [
      {
        "key": "image",
        "files": [
          {
            "filename": "ファイル名",
            "content": "base64データ",
          },
          {
            "filename": "ファイル名",
            "content": "base64データ",
          }
        ]
      }
    ],
    "prefecture": 13,
    "fruits": "apple,banana",
    "gender": 1
  }
}`}</code>
          </pre>
        </div>
      </div>
    </LayoutBody>
  );
};
