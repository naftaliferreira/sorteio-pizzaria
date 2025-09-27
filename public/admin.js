// public/admin.js

// O TOKEN será pego do localStorage, não é mais uma chave fixa no código!
const adminToken = localStorage.getItem('adminToken');
const performLotteryBtn = document.getElementById('performLotteryBtn');
const lotteryStatus = document.getElementById('lotteryStatus');
const winnerDisplay = document.getElementById('winnerDisplay');
const winnerName = document.getElementById('winnerName');
const winnerPhone = document.getElementById('winnerPhone');
const winnerDate = document.getElementById('winnerDate');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verifica se o token existe antes de carregar qualquer coisa
    if (!adminToken) {
        alert('Sessão expirada ou não autenticada. Redirecionando para login.');
        window.location.href = '/login.html';
        return; // Para o restante da execução
    }

    // Se o token existe, tenta carregar os dados
    fetchLeads();
    checkWinnerStatus();
    performLotteryBtn.addEventListener('click', performLottery);
});

// -----------------------------------------------------------
// Função de Requisição com Token (Reusada em todas as chamadas)
// -----------------------------------------------------------
async function secureFetch(url, options = {}) {
    const headers = {
        // Envia o token no formato Bearer exigido pelo servidor
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        ...options.headers // Mantém outros cabeçalhos, se houver
    };

    const response = await fetch(url, { ...options, headers });

    // Se receber 401 ou 403, a sessão expirou ou o token é inválido
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken'); // Limpa token inválido
        alert('Sessão expirada. Por favor, faça login novamente.');
        window.location.href = '/login.html';
        throw new Error('Autenticação falhou ou token expirado.');
    }

    return response;
}


async function fetchLeads() {
    const tbody = document.querySelector('#leadsTable tbody');
    const leadCount = document.getElementById('leadCount');

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';
    leadCount.textContent = '...';

    try {
        // Usa a nova função secureFetch
        const response = await secureFetch('/admin/leads');
        const data = await response.json();

        // ... (restante da lógica de exibição de leads - mantida)
        leadCount.textContent = data.total;
        tbody.innerHTML = '';

        if (data.total === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum participante encontrado.</td></tr>';
            return;
        }

        data.leads.forEach(lead => {
            const row = tbody.insertRow();
            const dataRegistroFormatada = new Date(lead.dataRegistro).toLocaleString('pt-BR');
            const dataNascFormatada = new Date(lead.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

            row.insertCell().textContent = lead.nome;
            row.insertCell().textContent = lead.telefone;
            row.insertCell().textContent = dataNascFormatada;
            row.insertCell().textContent = dataRegistroFormatada;
        });

    } catch (error) {
        console.error('Erro ao buscar leads:', error);
        if (error.message !== 'Autenticação falhou ou token expirado.') {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: red;">Erro ao carregar dados.</td></tr>';
        }
    }
}


async function checkWinnerStatus() {
    // ... (lógica para verificar o vencedor)
    try {
        // Chama a rota pública, não precisa de secureFetch, mas ajustamos para consistência
        const winnerResponse = await fetch('/sorteio/vencedor');
        const result = await winnerResponse.json();

        // ... (restante da lógica de status do sorteio)
        if (result.success) {
            lotteryStatus.textContent = `✅ SORTEIO CONCLUÍDO! Vencedor: ${result.winner.nome}`;
            lotteryStatus.style.color = 'var(--success-color)';
            performLotteryBtn.disabled = true;
            performLotteryBtn.textContent = 'Sorteio Já Realizado';

            winnerName.textContent = result.winner.nome;
            winnerPhone.textContent = "Dados confidenciais no Painel Admin (log)";
            winnerDate.textContent = new Date(result.winner.dataSorteio).toLocaleString('pt-BR');
            winnerDisplay.style.display = 'block';

        } else {
            lotteryStatus.textContent = 'Sorteio pronto para ser realizado.';
            lotteryStatus.style.color = 'blue';
            performLotteryBtn.disabled = false;
        }

    } catch (error) {
        console.error('Erro ao verificar status do sorteio:', error);
        lotteryStatus.textContent = 'Erro ao carregar status do sorteio.';
        lotteryStatus.style.color = 'red';
    }
}


async function performLottery() {
    if (!confirm('ATENÇÃO: Deseja realmente realizar o sorteio? Esta ação não pode ser desfeita.')) {
        return;
    }

    lotteryStatus.textContent = 'Realizando sorteio...';
    performLotteryBtn.disabled = true;

    try {
        // Usa a nova função secureFetch
        const response = await secureFetch('/admin/sortear', {
            method: 'POST'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            lotteryStatus.textContent = result.message;
            lotteryStatus.style.color = 'var(--success-color)';

            const winner = result.winner;
            winnerName.textContent = winner.nome;
            winnerPhone.textContent = winner.telefone;
            winnerDate.textContent = new Date(winner.dataSorteio).toLocaleString('pt-BR');
            winnerDisplay.style.display = 'block';

        } else if (response.status === 400 && result.winner) {
            lotteryStatus.textContent = result.message;
            lotteryStatus.style.color = 'orange';
            checkWinnerStatus();

        } else {
            lotteryStatus.textContent = `Erro ao sortear: ${result.message}`;
            lotteryStatus.style.color = 'red';
            performLotteryBtn.disabled = false;
        }

    } catch (error) {
        console.error('Erro de conexão ao sortear:', error);
        if (error.message !== 'Autenticação falhou ou token expirado.') {
            lotteryStatus.textContent = 'Erro de conexão com o servidor.';
            lotteryStatus.style.color = 'red';
            performLotteryBtn.disabled = false;
        }
    }
}