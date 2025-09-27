// src/db.js

const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos de persistência
const LEADS_FILE = path.join(__dirname, 'leads.json');
const WINNER_FILE = path.join(__dirname, 'winner.json');

// --- Funções para Leads ---

/**
 * Carrega a lista de leads do arquivo JSON.
 * Se o arquivo não existir ou estiver vazio, retorna uma lista vazia.
 */
function loadLeads() {
    try {
        if (fs.existsSync(LEADS_FILE)) {
            const data = fs.readFileSync(LEADS_FILE, 'utf8');
            // Tenta fazer o parse. Se falhar (JSON inválido), retorna array vazio.
            return data ? JSON.parse(data) : [];
        }
        return [];
    } catch (error) {
        console.error("Erro ao carregar leads:", error.message);
        return [];
    }
}

/**
 * Salva a lista de leads no arquivo JSON.
 */
function saveLeads(leads) {
    try {
        const data = JSON.stringify(leads, null, 2);
        fs.writeFileSync(LEADS_FILE, data, 'utf8');
    } catch (error) {
        console.error("Erro ao salvar leads:", error.message);
    }
}


// --- Funções para o Vencedor ---

/**
 * Carrega o registro do vencedor do arquivo JSON.
 * Retorna null se não houver vencedor.
 */
function loadWinner() {
    try {
        if (fs.existsSync(WINNER_FILE)) {
            const data = fs.readFileSync(WINNER_FILE, 'utf8');
            return data ? JSON.parse(data) : null;
        }
        return null;
    } catch (error) {
        console.error("Erro ao carregar vencedor:", error.message);
        return null;
    }
}

/**
 * Salva o registro do vencedor no arquivo JSON.
 */
function saveWinner(winner) {
    try {
        const data = JSON.stringify(winner, null, 2);
        fs.writeFileSync(WINNER_FILE, data, 'utf8');
    } catch (error) {
        console.error("Erro ao salvar vencedor:", error.message);
    }
}


// --- Exportação dos Módulos (Garante que o server.js encontre as funções) ---

module.exports = {
    loadLeads,
    saveLeads,
    loadWinner,
    saveWinner
};