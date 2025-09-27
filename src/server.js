// src/server.js

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt'); // NOVIDADE: Criptografia de senha
const jwt = require('jsonwebtoken'); // NOVIDADE: Geração de Token
const db = require('./db');

const app = express();
const PORT = 3000;

// -------------------------------------------------------------------
// VARIÁVEIS DE SEGURANÇA (Mudar para Variáveis de Ambiente!)
// -------------------------------------------------------------------

const JWT_SECRET = 'sua_chave_secreta_muito_longa_e_aleatoria';

const ADMIN_USER = 'admin';
// NOVO HASH CORRIGIDO para a senha 'admin123'
const ADMIN_PASSWORD_HASH = '$2b$10$YnHU12jHbLBvbYJfe6RtTuDrSAydO3w9GVlrEgwYlc/6wHzeRytR2';
// OBS: Você deve usar a senha 'admin123' no formulário.

// Middleware para processar dados JSON
app.use(bodyParser.json());

// Servir arquivos estáticos (Frontend) da pasta 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// -------------------------------------------------------------------
// Carregamento Inicial dos Dados
// -------------------------------------------------------------------
let leads = db.loadLeads();
let winner = db.loadWinner();

console.log(`Servidor iniciado. ${leads.length} leads carregados. ${winner ? 'Vencedor carregado.' : 'Sorteio pendente.'}`);

// -------------------------------------------------------------------
// Middleware de Autenticação (AGORA VERIFICA JWT)
// -------------------------------------------------------------------
const authenticateAdmin = (req, res, next) => {
    // 1. Pega o token do cabeçalho de Autorização (Bearer Token)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1]; // Pega apenas o token

    // 2. Verifica e decodifica o token
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Adiciona a informação do usuário à requisição
        next();
    } catch (err) {
        console.error('Falha na verificação do JWT:', err.message);
        return res.status(403).json({ success: false, message: 'Token inválido ou expirado.' });
    }
};


// -------------------------------------------------------------------
// ROTA 1: LOGIN (POST /admin/login)
// -------------------------------------------------------------------
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('\n--- TENTATIVA DE LOGIN ---');
    console.log(`Usuário Submetido: ${username}`);
    console.log(`Senha Submetida: ${password}`); // Apenas para debug! Não faça isso em produção.
    console.log(`Hash Armazenado: ${ADMIN_PASSWORD_HASH}`);
    console.log('--------------------------');

    if (username !== ADMIN_USER) {
        console.log('FALHA: Usuário incorreto.');
        return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
    }

    try {
        // Compara a senha enviada ('admin123') com o hash armazenado
        const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

        if (match) {
            console.log('SUCESSO: Senha correta.');
            // Gera o JWT e retorna sucesso (restante da lógica...)
            const token = jwt.sign(
                { id: 1, username: ADMIN_USER },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            return res.json({ success: true, token: token, message: 'Login realizado com sucesso.' });
        } else {
            console.log('FALHA: Senha incorreta (bcrypt.compare retornou false).');
            return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
        }

    } catch (error) {
        // Captura erros no próprio bcrypt (Ex: hash inválido)
        console.error('ERRO CRÍTICO no bcrypt.compare:', error.message);
        return res.status(500).json({ success: false, message: 'Erro interno na validação da senha.' });
    }
});


// -------------------------------------------------------------------
// ROTA 2: INSCRIÇÃO (POST /inscricao) - SEM ALTERAÇÕES
// -------------------------------------------------------------------
app.post('/inscricao', (req, res) => {
    // ... (Lógica de Inscrição)
    const { nome, telefone, dataNascimento } = req.body;

    if (!nome || !telefone || !dataNascimento) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');

    const participanteExistente = leads.find(lead => lead.telefone === telefoneLimpo);

    if (participanteExistente) {
        return res.status(409).json({ success: false, message: 'Você já está participando deste sorteio! Boa sorte.' });
    }

    const novoLead = {
        id: Date.now(),
        nome,
        telefone: telefoneLimpo,
        dataNascimento,
        dataRegistro: new Date()
    };

    leads.push(novoLead);
    db.saveLeads(leads);

    res.status(201).json({ success: true, message: 'Inscrição realizada com sucesso! Boa sorte.' });
});


// -------------------------------------------------------------------
// ROTA 3: LISTAGEM DE LEADS (Admin - AGORA PROTEGIDA POR JWT)
// -------------------------------------------------------------------
app.get('/admin/leads', authenticateAdmin, (req, res) => {
    const leadsOrdenados = leads.sort((a, b) => b.dataRegistro - a.dataRegistro);

    res.json({
        total: leadsOrdenados.length,
        leads: leadsOrdenados
    });
});

// -------------------------------------------------------------------
// ROTA 4: SORTEIO (Admin - AGORA PROTEGIDA POR JWT)
// -------------------------------------------------------------------
app.post('/admin/sortear', authenticateAdmin, (req, res) => {
    if (winner) {
        return res.status(400).json({
            success: false,
            message: 'O sorteio já foi realizado!',
            winner: winner
        });
    }

    if (leads.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Não há leads suficientes para realizar o sorteio.'
        });
    }

    const randomIndex = Math.floor(Math.random() * leads.length);
    const selectedWinner = leads[randomIndex];

    const winnerData = {
        ...selectedWinner,
        dataSorteio: new Date().toISOString()
    };

    db.saveWinner(winnerData);
    winner = winnerData;

    res.json({
        success: true,
        message: 'Sorteio realizado com sucesso!',
        winner: winner
    });
});

// -------------------------------------------------------------------
// ROTA 5: VENCEDOR (Pública)
// -------------------------------------------------------------------
app.get('/sorteio/vencedor', (req, res) => {
    if (!winner) {
        return res.status(200).json({ success: false, message: 'O sorteio ainda não foi realizado.' });
    }

    const publicWinnerData = { nome: winner.nome, dataSorteio: winner.dataSorteio };
    res.json({ success: true, message: 'Vencedor encontrado.', winner: publicWinnerData });
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Usuário Admin: ${ADMIN_USER} | Senha: admin123 (para testes)`);
});