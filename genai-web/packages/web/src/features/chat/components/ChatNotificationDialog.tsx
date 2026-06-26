import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogPanel,
} from '@/components/ui/CustomDialog';
import { Button } from '@/components/ui/dads/Button';
import { List } from '@/components/ui/dads/List';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const ChatNotificationDialog = (props: Props) => {
  const { isOpen, onClose } = props;

  return (
    <CustomDialog isOpen={isOpen} onClose={onClose} position='top'>
      <CustomDialogPanel className='max-w-3xl!'>
        <CustomDialogHeader onClose={onClose} hasClose>
          生成AI利用時の注意事項
        </CustomDialogHeader>
        <CustomDialogBody>
          <div className='flex flex-col gap-4'>
            <p>このアプリは生成AIを使っています。適切に使うために、以下を確認してください。</p>
            <h3 className='mt-4 text-std-20B-150'>生成AIで起こりうること</h3>
            <p>生成AIは便利ですが、以下のような問題が起こることがあります。</p>
            <List spacing='4'>
              <li>
                <b>誤った情報を生成する</b>（事実と異なる内容）
              </li>
              <li>
                <b>古い情報に基づく</b>回答をする
              </li>
              <li>
                <b>偏った見解</b>を示すことがある
              </li>
              <li>
                <b>著作権のある内容</b>を含むことがある
              </li>
              <li>
                <b>倫理的に不適切な提案</b>をすることがある
              </li>
              <li>
                <b>同じ質問でも回答が変わる</b>ことがある
              </li>
            </List>
            <h3 className='mt-4 text-std-20B-150'>使うときの３つのルール</h3>
            <dl className='flex flex-col gap-4'>
              <div>
                <dt className='text-std-18B-160 mb-2'>ルール1. 必ず内容を確認する</dt>
                <dd>AIの回答を鵜呑みにせず、自分で正しいか判断してください。</dd>
              </div>
              <div>
                <dt className='text-std-18B-160 mb-2'>ルール2. 入力する情報に注意する</dt>
                <dd>
                  <p className='mb-2'>以下の情報は入力しないでください。</p>
                  <List spacing='4'>
                    <li>機密性３情報</li>
                    <li>業務と関係ない私的な情報</li>
                  </List>
                </dd>
              </div>
              <div>
                <dt className='text-std-18B-160 mb-2'>ルール3. 他の情報源も確認する</dt>
                <dd>信頼できる公式情報などと照らし合わせてください。</dd>
              </div>
            </dl>
            <h3 className='mt-4 text-std-20B-150'>会話が長くなったときの対処方法</h3>
            <p>会話が長くなると、次のような問題が起こります。</p>
            <List spacing='4'>
              <li>過去の内容を参照しにくくなり、回答の精度が下がる</li>
              <li>回答に時間がかかり、待ち時間が長くなる</li>
              <li>利用料金が上がる（1回最大3ドル程度）</li>
              <li>数十万文字を超えるとエラーが発生し、会話が続けられなくなる</li>
            </List>
            <p>注意：ファイルを添付すると、文字数が大幅に増えます。</p>
            <dl className='flex flex-col gap-4'>
              <div>
                <dt className='text-std-18B-160 mb-2'>解決方法</dt>
                <dd>
                  <p className='mb-2'>会話が長くなったら、次の手順で新しい会話を始めてください。</p>
                  <List marker='number' spacing='4' className='pl-4'>
                    <li>
                      <span>1. </span>
                      <span>「ここまでの会話を要約して」とAIに依頼する</span>
                    </li>
                    <li>
                      <span>2. </span>
                      <span>要約をもとに新しい会話を開始する</span>
                    </li>
                  </List>
                </dd>
              </div>
            </dl>
          </div>
        </CustomDialogBody>
        <div className='mt-6 flex justify-center'>
          <Button type='button' size='lg' variant='text' onClick={onClose}>
            閉じる
          </Button>
        </div>
      </CustomDialogPanel>
    </CustomDialog>
  );
};
