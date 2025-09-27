// public/script.js

// Importação do iMask deve estar no HTML (verifique se está lá!)
// <script src="https://unpkg.com/imask@7.6.0/dist/imask.js"></script> 

// -------------------------------------------------------------------
// 1. Implementação da Máscara de Telefone (DDD + 8/9 dígitos)
// -------------------------------------------------------------------

const telefoneInput = document.getElementById('telefone');

const telefoneMask = {
    mask: [
        {
            mask: '(00) 0000-0000',
            lazy: false
        },
        {
            mask: '(00) 00000-0000',
            lazy: false
        }
    ],
    dispatch: function (appended, dynamicMasked) {
        const value = (dynamicMasked.value + appended).replace(/\D/g, '');
        if (value.length > 10) {
            return dynamicMasked.compiledMasks[1];
        }
        return dynamicMasked.compiledMasks[0];
    }
};

const mask = IMask(telefoneInput, telefoneMask);


// -------------------------------------------------------------------
// 2. Lógica de Submissão do Formulário
// -------------------------------------------------------------------

document.getElementById('cadastroForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const form = event.target;
    const feedback = document.getElementById('feedbackMessage');

    // 2.1. Validação de Data de Nascimento (Não pode ser data futura)
    const dataNascimento = form.dataNascimento.value;
    const hoje = new Date().toISOString().split('T')[0];

    if (dataNascimento >= hoje) {
        feedback.textContent = 'Erro: A data de nascimento deve ser uma data passada.';
        feedback.style.backgroundColor = 'salmon';
        feedback.classList.remove('hidden');
        return;
    }

    // Coleta dos dados do formulário
    const formData = {
        nome: form.nome.value,
        // Envia APENAS os dígitos (consistente com a limpeza do backend)
        telefone: mask.unmaskedValue,
        dataNascimento: dataNascimento
    };

    feedback.classList.add('hidden');
    feedback.textContent = '';

    try {
        const response = await fetch('/inscricao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        // NOVO: Verifica se o status está OK (2xx)
        if (response.ok) {
            feedback.textContent = result.message;
            feedback.style.backgroundColor = 'lightgreen';
            form.reset();
        } else {
            // Lida com erros (400, 409, 500)
            feedback.textContent = `Erro: ${result.message}`;
            // Corrigido para garantir que a tarja vermelha apareça em caso de erro
            feedback.style.backgroundColor = 'salmon';
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        feedback.textContent = 'Erro de conexão com o servidor. Tente novamente.';
        feedback.style.backgroundColor = 'salmon';
    } finally {
        feedback.classList.remove('hidden');
    }
});