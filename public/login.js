// public/login.js

document.getElementById('loginForm').addEventListener('submit', async function (event) {

    // LINHA CRUCIAL: IMPEDE O COMPORTAMENTO PADRÃO DO FORMULÁRIO (ENVIAR DADOS PELA URL)
    event.preventDefault();

    const form = event.target;
    const username = form.username.value;
    const password = form.password.value;
    const feedback = document.getElementById('feedbackMessage');
    const submitButton = form.querySelector('button[type="submit"]');

    feedback.classList.add('hidden');
    feedback.textContent = '';

    // Desativa o botão e exibe a mensagem
    submitButton.disabled = true;
    feedback.textContent = 'Verificando credenciais...';
    feedback.style.backgroundColor = 'gray';
    feedback.classList.remove('hidden');

    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.token) {
            // SUCESSO: Armazena o token e redireciona
            localStorage.setItem('adminToken', result.token);
            feedback.textContent = 'Login bem-sucedido! Redirecionando...';
            feedback.style.backgroundColor = '#4CAF50'; // Usando código direto, pois CSS var pode não carregar a tempo

            // Pequeno delay para a mensagem de sucesso aparecer antes de redirecionar
            setTimeout(() => {
                window.location.href = '/admin.html';
            }, 500);

        } else {
            // FALHA: Exibe a mensagem de erro do servidor (ex: Usuário ou senha inválidos)
            feedback.textContent = result.message || 'Erro de login desconhecido.';
            feedback.style.backgroundColor = 'salmon';
            submitButton.disabled = false; // Reativa o botão em caso de erro
        }
    } catch (error) {
        console.error('Erro na requisição de login:', error);
        feedback.textContent = 'Erro de conexão com o servidor. Tente novamente.';
        feedback.style.backgroundColor = 'salmon';
        submitButton.disabled = false; // Reativa o botão em caso de falha de conexão
    }
    // O finally foi removido para que o botão só seja reativado em caso de erro (success redireciona)
});