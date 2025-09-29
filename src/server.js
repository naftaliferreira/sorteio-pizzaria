// src/server.js - Versão Final com Agendamento e Segurança .ENV

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 3000;

// -------------------------------------------------------------------
// VARIÁVEIS DE SEGURANÇA (CARREGADAS DO .ENV)
// -------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const LOTTERY_SCHEDULE_TIME = process.env.LOTTERY_SCHEDULE_TIME; // NOVIDADE: Hora Agendada

// Verificação de segurança:
if (!JWT_SECRET || !ADMIN_PASSWORD_HASH || !ADMIN_USER || !LOTTERY_SCHEDULE_TIME) {
    console.error("ERRO CRÍTICO: Variáveis de ambiente faltando! Verifique .env.");
    process.exit(1);
}


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
console.log(`Sorteio agendado para: ${new Date(LOTTERY_SCHEDULE_TIME).toLocaleString('pt-BR')}`);


// -------------------------------------------------------------------
// Middleware de Autenticação (VERIFICA JWT)
// -------------------------------------------------------------------
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Token inválido ou expirado.' });
    }
};


// -------------------------------------------------------------------
// ROTA 1: LOGIN (POST /admin/login)
// -------------------------------------------------------------------
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

    if (username !== ADMIN_USER) {
        return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
    }

    try {
        const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

        if (match) {
            const token = jwt.sign(
                { id: 1, username: ADMIN_USER },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            return res.json({ success: true, token: token, message: 'Login realizado com sucesso.' });
        } else {
            return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
        }

    } catch (error) {
        console.error('ERRO CRÍTICO no login:', error.message);
        return res.status(500).json({ success: false, message: 'Erro interno na validação da senha.' });
    }
});


// -------------------------------------------------------------------
// ROTA 2: INSCRIÇÃO (POST /inscricao) - SEM ALTERAÇÕES
// -------------------------------------------------------------------
app.post('/inscricao', (req, res) => {
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
// ROTA 3: LISTAGEM DE LEADS (Admin - PROTEGIDA POR JWT)
// -------------------------------------------------------------------
app.get('/admin/leads', authenticateAdmin, (req, res) => {
    const leadsOrdenados = leads.sort((a, b) => b.dataRegistro - a.dataRegistro);

    res.json({
        total: leadsOrdenados.length,
        leads: leadsOrdenados
    });
});

// -------------------------------------------------------------------
// ROTA 4: SORTEIO (Admin - PROTEGIDA POR JWT E AGENDAMENTO)
// -------------------------------------------------------------------
app.post('/admin/sortear', authenticateAdmin, (req, res) => {
    // 1. Checa se o sorteio já ocorreu
    if (winner) {
        return res.status(400).json({
            success: false,
            message: 'O sorteio já foi realizado!',
            winner: winner
        });
    }

    // 2. Checa o Agendamento
    const now = new Date();
    const scheduledTime = new Date(LOTTERY_SCHEDULE_TIME);

    if (now < scheduledTime) {
        return res.status(400).json({
            success: false,
            message: `O sorteio está agendado para ${scheduledTime.toLocaleString('pt-BR')}. Não pode ser realizado antes.`
        });
    }

    // 3. Checa leads
    if (leads.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Não há leads suficientes para realizar o sorteio.'
        });
    }

    // Lógica do sorteio...
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

// -------------------------------------------------------------------
// ROTA 6: STATUS GERAL (Pública - Informa agendamento)
// -------------------------------------------------------------------
app.get('/sorteio/status', (req, res) => {
    res.json({
        scheduledTime: LOTTERY_SCHEDULE_TIME
    });
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Acesso Admin: http://localhost:${PORT}/login.html`);
    console.log(`Resultado do Sorteio: http://localhost:${PORT}/vencedor.html`);
});