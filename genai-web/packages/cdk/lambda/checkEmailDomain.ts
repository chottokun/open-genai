import { Callback, Context, PreSignUpTriggerEvent } from 'aws-lambda';

const ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR = process.env.ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR;
const ALLOWED_SIGN_UP_EMAIL_DOMAINS: string[] = JSON.parse(ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR!);

const checkEmailDomain = (email: string): boolean => {
  if (email.split('@').length !== 2) {
    return false;
  }

  const domain = email.split('@')[1];
  return ALLOWED_SIGN_UP_EMAIL_DOMAINS.includes(domain);
};

exports.handler = async (event: PreSignUpTriggerEvent, context: Context, callback: Callback) => {
  try {
    const isAllowed = checkEmailDomain(event.request.userAttributes.email);
    if (isAllowed) {
      callback(null, event);
    } else {
      callback(new Error('Invalid email domain'));
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      callback(error);
    } else {
      callback(new Error('An unknown error occurred.'));
    }
  }
};
