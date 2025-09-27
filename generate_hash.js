// generate_hash.js

const bcrypt = require('bcrypt');

const password = 'admin123';
const saltRounds = 10; // Custo de processamento padrão

bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
        console.error('Erro ao gerar hash:', err);
        return;
    }
    console.log(`\n======================================================`);
    console.log(`SUCESSO: Hash gerado para a senha '${password}'`);
    console.log(`COPIE ESTE HASH e cole-o no seu src/server.js:`);
    console.log(`\n${hash}\n`);
    console.log(`======================================================`);
});