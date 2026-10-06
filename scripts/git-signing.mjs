import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const file='.signing/git-signing';
if(!fs.existsSync(file)){
 const result=spawnSync('ssh-keygen',['-t','ed25519','-N','','-f',file,'-C','3dFx40 chain-reaction signing'],{stdio:'pipe'});
 if(result.status!==0)throw new Error(result.stderr.toString());
}
fs.mkdirSync('docs/signing',{recursive:true});
const key=fs.readFileSync(file+'.pub','utf8').trim();
fs.writeFileSync('docs/signing/git-signing.pub',key+'\n');
fs.writeFileSync('docs/signing/allowed_signers','177562715+3dFx40@users.noreply.github.com '+key+'\n');
fs.writeFileSync('.signing/github-signing-key.json',JSON.stringify({title:'Chain Reaction release signing',key}));
for(const args of [
 ['config','user.name','3dFx40'],
 ['config','user.email','177562715+3dFx40@users.noreply.github.com'],
 ['config','gpg.format','ssh'],
 ['config','user.signingkey',fs.realpathSync(file).replaceAll('\\','/')],
 ['config','gpg.ssh.allowedSignersFile','docs/signing/allowed_signers'],
 ['config','commit.gpgsign','true'],
 ['config','tag.gpgsign','true'],
]){const r=spawnSync('git',args,{stdio:'pipe'});if(r.status!==0)throw new Error(r.stderr.toString());}
console.log('Configured local SSH signing; public verification key is in docs/signing/.');
