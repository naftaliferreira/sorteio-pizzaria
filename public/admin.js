// public/admin.js - Versão Final com Checagem de Agendamento

const adminToken = localStorage.getItem('adminToken');
const performLotteryBtn = document.getElementById('performLotteryBtn');
const lotteryStatus = document.getElementById('lotteryStatus');
const winnerDisplay = document.getElementById('winnerDisplay');
const winnerName = document.getElementById('winnerName');
const winnerPhone = document.getElementById('winnerPhone');
const winnerDate = document.getElementById('winnerDate');


document.addEventListener('DOMContentLoaded', () => {
    if (!adminToken) {
        alert('Sessão expirada ou não autenticada. Redirecionando para login.');
        window.location.href = '/login.html';
        return;
    }

    fetchLeads();
    checkWinnerStatus();
    performLotteryBtn.addEventListener('click', performLottery);
});


// -----------------------------------------------------------
// Função de Requisição Segura com Token
// -----------------------------------------------------------
async function secureFetch(url, options = {}) {
    const headers = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
        alert('Sessão expirada. Por favor, faça login novamente.');
        window.location.href = '/login.html';
        throw new Error('Autenticação falhou ou token expirado.');
    }

    return response;
}


// -----------------------------------------------------------
// Checa Status do Vencedor e Agendamento
// -----------------------------------------------------------
async function checkWinnerStatus() {
    try {
        // Busca a data agendada e o status do vencedor em paralelo
        const [winnerResponse, statusResponse] = await Promise.all([
            fetch('/sorteio/vencedor'),
            fetch('/sorteio/status') // Rota para obter a hora agendada
        ]);

        const result = await winnerResponse.json();
        const statusData = await statusResponse.json();

        const scheduledTime = new Date(statusData.scheduledTime);
        const now = new Date();
        const dataAgendadaFormatada = scheduledTime.toLocaleString('pt-BR');


        if (result.success) {
            // Sorteio CONCLUÍDO
            lotteryStatus.textContent = `✅ SORTEIO CONCLUÍDO! Vencedor: ${result.winner.nome}`;
            lotteryStatus.style.color = 'var(--success-color)';
            performLotteryBtn.disabled = true;
            performLotteryBtn.textContent = 'Sorteio Já Realizado';

            winnerName.textContent = result.winner.nome;
            winnerPhone.textContent = "Dados confidenciais no Painel Admin (log)";
            winnerDate.textContent = new Date(result.winner.dataSorteio).toLocaleString('pt-BR');
            winnerDisplay.style.display = 'block';

        } else if (now < scheduledTime) {
            // Sorteio AGENDADO, não pode ser feito
            lotteryStatus.textContent = `⏳ Sorteio Agendado: ${dataAgendadaFormatada}. Não é possível sortear agora.`;
            lotteryStatus.style.color = 'orange';
            performLotteryBtn.disabled = true;

        } else {
            // Sorteio PRONTO (data agendada passou)
            lotteryStatus.textContent = `✔️ Sorteio pronto para ser realizado. Data Agendada: ${dataAgendadaFormatada}`;
            lotteryStatus.style.color = 'blue';
            performLotteryBtn.disabled = false;
        }

    } catch (error) {
        console.error('Erro ao verificar status do sorteio:', error);
        lotteryStatus.textContent = 'Erro ao carregar status do sorteio.';
        lotteryStatus.style.color = 'red';
    }
}


// -----------------------------------------------------------
// Busca Leads (Inalterada, apenas usa secureFetch)
// -----------------------------------------------------------
async function fetchLeads() {
    const tbody = document.querySelector('#leadsTable tbody');
    const leadCount = document.getElementById('leadCount');

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';
    leadCount.textContent = '...';

    try {
        const response = await secureFetch('/admin/leads');
        const data = await response.json();

        leadCount.textContent = data.total;
        tbody.innerHTML = '';

        if (data.total === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum participante encontrado.</td></tr>';
            return;
        }

        data.leads.forEach(lead => {
            const row = tbody.insertRow();
            const dataRegistroFormatada = new Date(lead.dataRegistro).toLocaleString('pt-BR');
            // 'UTC' é usado aqui para evitar erro de fuso horário em datas como 1990-01-01
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


// -----------------------------------------------------------
// Realizar Sorteio (Inalterada, apenas usa secureFetch)
// -----------------------------------------------------------
async function performLottery() {
    if (!confirm('ATENÇÃO: Deseja realmente realizar o sorteio? Esta ação não pode ser desfeita.')) {
        return;
    }

    lotteryStatus.textContent = 'Realizando sorteio...';
    performLotteryBtn.disabled = true;

    try {
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

        } else if (response.status === 400) {
            // Lida com erros do backend: JÁ SORTEADO, SEM LEADS, ou DATA NÃO CHEGOU
            lotteryStatus.textContent = result.message;
            lotteryStatus.style.color = 'red';
            // Chama a checagem de novo para atualizar o status e habilitar/desabilitar o botão corretamente
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