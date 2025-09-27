// public/vencedor.js

document.addEventListener('DOMContentLoaded', fetchWinner);

async function fetchWinner() {
    const resultadoDiv = document.getElementById('resultado');
    const statusP = document.getElementById('status');

    statusP.textContent = 'Verificando se o sorteio já ocorreu...';

    try {
        // Rota pública: não precisa de token JWT
        const response = await fetch('/sorteio/vencedor');
        const data = await response.json();

        if (data.success) {
            // Sorteio realizado e vencedor encontrado
            const winner = data.winner;

            // Formatando a data do sorteio
            const dataSorteioFormatada = new Date(winner.dataSorteio).toLocaleDateString('pt-BR', {
                year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
            });

            resultadoDiv.innerHTML = `
                <div class="fireworks">🎉🏆🍕</div>
                <p class="status-message">Temos um(a) grande ganhador(a)!</p>
                <div class="winner-name">${winner.nome}</div>
                <p>Parabéns! Você ganhou o prêmio principal.</p>
                <p style="font-size: 0.9em; color: #666;">Sorteio realizado em ${dataSorteioFormatada}</p>
            `;
        } else {
            // Sorteio ainda não realizado
            statusP.textContent = 'O sorteio ainda não foi realizado. Volte em breve para conferir o resultado!';
            statusP.style.color = 'var(--primary-color)';
        }

    } catch (error) {
        console.error('Erro ao buscar vencedor:', error);
        statusP.textContent = 'Não foi possível conectar ao servidor para buscar o resultado.';
        statusP.style.color = 'var(--error-color)';
    }
}