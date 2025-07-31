import { JWT } from 'google-auth-library';

export function getAccessTokenAsync(
  key: string // Contents of your FCM private key file
): Promise<string> {
  return new Promise(function (resolve, reject) {
    const keyJson = JSON.parse(key);
    const jwtClient = new JWT({
      email: keyJson.client_email,
      key: keyJson.private_key,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        reject(err);
        return;
      }
      if (!tokens) {
        reject(new Error('No tokens returned'));
        return;
      }
      resolve(tokens.access_token as string);
    });
  });
}
