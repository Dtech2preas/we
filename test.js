const lines = `====== [ CRUNCHYROLL ] ======
justinvorpe@gmail.com:Konor1015 | Validated by URL | Data:  (powered by DTECH https://t.me/DTECHX24)
alexf2900@gmail.com:sasa14723 | Validated by URL | Data: Alexf perfil (powered by DTECH https://t.me/DTECHX24)
maxou.danel@gmail.com:endy2000 | Validated by URL | Data: ( on the verification link witt ninutes to complete verifica ontaet sunnort Rck to logi (powered by DTECH https://t.me/DTECHX24)
lucasholland84@gmail.com:B67FhKDMPPkg3fH | Validated by URL | Data: ( on the verification link witt ninutes to complete verifica ontaet sunnort Rck to logi (powered by DTECH https://t.me/DTECHX24)
henriqueamaraltoscano@gmail.com:naomude | Validated by URL | Data: ( on the verification link witt ninutes to complete verifica ontaet sunnort Rck to logi (powered by DTECH https://t.me/DTECHX24)
danio07@icloud.com:LUksemb123 | Validated by URL | Data: ( on the verification link witt ninutes to complete verifica ontaet sunnort Rck to logi (powered by DTECH https://t.me/DTECHX24)
Ragnar013@gmail.com:12341234 | Validated by URL | Data:  (powered by DTECH https://t.me/DTECHX24)
JonathanMcdonald395@outlook.com:JBDUjrgh71 | Validated by URL | Data:  (powered by DTECH https://t.me/DTECHX24)
trannessa@hotmail.com:!GamerG1 | Validated by URL | Data: ( on the verification link witt ninutes to complete verifica ontaet sunnort Rck to logi (powered by DTECH https://t.me/DTECHX24)
zapatalberto974@gmail.com:12zapata12 | Validated by URL | Data:  (powered by DTECH https://t.me/DTECHX24)
alemarenda@gmail.com:davi@2510 | Validated by URL | Data: ( on the verification link witt ninutes to complete verifica ontaet sunnort Rck to logi (powered by DTECH https://t.me/DTECHX24)
kku67649@gmail.com:kubix867 | Validated by URL | Data:  (powered by DTECH https://t.me/DTECHX24)
vicentereis6@gmail.com:v71660589 | Validated by URL | Data:  (powered by DTECH https://t.me/DTECHX24)
adsrocks@gmail.com:Chago2011! | Validated by URL | Data:  (powered by DTECH https://t.me/DTECHX24)

[ Powered by D-TECH https://t.me/DTECHX24 ]

)`.split('\n');

const parsedAccounts = [];

for (const line of lines) {
  const tLine = line.trim();
  if (tLine.length === 0) continue;
  if (tLine.startsWith('======') || tLine.startsWith('[ Powered by') || tLine === ')' || tLine === '(') {
    continue;
  }

  if (tLine.includes('| Data:')) {
    const parts = tLine.split('|');
    const emailPass = parts[0].trim();

    let dataContent = tLine.substring(tLine.indexOf('Data:') + 5).trim();
    dataContent = dataContent.split(/\(?powered by DTECH/i)[0].trim();

    if (dataContent !== '' && !dataContent.toLowerCase().includes('on the verification link')) {
      if (emailPass.includes(':')) {
        parsedAccounts.push(emailPass);
      }
    }
  } else {
    if (tLine.includes(':') && !tLine.toLowerCase().includes('powered by')) {
       parsedAccounts.push(tLine);
    }
  }
}

console.log(parsedAccounts);
