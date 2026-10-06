import fs from 'node:fs';
import crypto from 'node:crypto';
fs.mkdirSync('.signing',{recursive:true});
if(fs.existsSync('.signing/android.properties'))throw new Error('Signing configuration already exists; refusing to replace release identity.');
const password=crypto.randomBytes(32).toString('base64url');
fs.writeFileSync('.signing/password.txt',password+'\n');
fs.writeFileSync('.signing/android.properties',`storePassword=${password}\nkeyPassword=${password}\nkeyAlias=chain-release\n`);
console.log('Created private release configuration in ignored .signing/; no credentials printed.');
