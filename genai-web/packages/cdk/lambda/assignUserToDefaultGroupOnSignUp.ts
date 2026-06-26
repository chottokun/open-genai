import { Callback, Context, PostConfirmationConfirmSignUpTriggerEvent } from 'aws-lambda';
import { GroupName } from 'genai-web';
import { addUserToGroup } from './utils/cognitoApi';
import { GROUP_NAME } from './utils/constants';

exports.handler = async (
  event: PostConfirmationConfirmSignUpTriggerEvent,
  _context: Context,
  callback: Callback,
) => {
  try {
    await addUserToGroup(event.userName, GROUP_NAME.UserGroup as GroupName, event.userPoolId);
    callback(null, event);
  } catch (error) {
    if (error instanceof Error) {
      callback(new Error('UserGroupへの追加に失敗しました。'));
    } else {
      callback(new Error('サーバ側でエラーが発生しました。管理者へご連絡ください。'));
    }
  }
};
