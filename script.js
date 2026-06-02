// Inicializar lista buscando do LocalStorage ou criar array vazio
let debts = JSON.parse(localStorage.getItem('myDebts')) || [];

// Definir a data de hoje por padrão no campo de vencimento ao carregar a página
document.getElementById('debtDate').valueAsDate = new Date();

function handleFormSubmit(event) {
    event.preventDefault();

    const editIdInput = document.getElementById('editDebtId').value;
    const dateInput = document.getElementById('debtDate').value;
    const descInput = document.getElementById('debtDescription').value;
    const valueInput = parseFloat(document.getElementById('debtValue').value);
    const isRecurrent = document.getElementById('debtRecurrent').checked; // Captura se é fixa

    if (editIdInput) {
        const idToEdit = parseInt(editIdInput);
        debts = debts.map(debt => {
            if (debt.id === idToEdit) {
                return {
                    ...debt,
                    date: formatDateToDisplay(dateInput),
                    rawDate: dateInput,
                    description: descInput,
                    value: valueInput,
                    recurrent: isRecurrent // Atualiza na edição
                };
            }
            return debt;
        });
        cancelEdit();
    } else {
        const newDebt = {
            id: Date.now(),
            date: formatDateToDisplay(dateInput),
            rawDate: dateInput,
            description: descInput,
            value: valueInput,
            paid: false,
            recurrent: isRecurrent // Salva no cadastro original
        };
        debts.push(newDebt);
    }

    saveToLocalStorage();
    renderDebts();

    document.getElementById('debtDescription').value = '';
    document.getElementById('debtValue').value = '';
    document.getElementById('debtRecurrent').checked = false; // Reseta o checkbox
    document.getElementById('debtDescription').focus();
}

function editDebt(id) {
    const debtToEdit = debts.find(debt => debt.id === id);
    if (!debtToEdit) return;

    document.getElementById('formTitle').innerText = "Editar Dívida";
    document.getElementById('btnSubmit').innerText = "Salvar Alteração";
    document.getElementById('btnSubmit').style.backgroundColor = "#3498db";
    document.getElementById('btnCancel').style.display = "inline-block";

    document.getElementById('editDebtId').value = debtToEdit.id;
    document.getElementById('debtDate').value = debtToEdit.rawDate;
    document.getElementById('debtDescription').value = debtToEdit.description;
    document.getElementById('debtValue').value = debtToEdit.value;
    document.getElementById('debtRecurrent').checked = debtToEdit.recurrent || false; // Alimenta o checkbox

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('formTitle').innerText = "Nova Dívida";
    document.getElementById('btnSubmit').innerText = "Adicionar";
    document.getElementById('btnSubmit').style.backgroundColor = "#2ecc71";
    document.getElementById('btnCancel').style.display = "none";

    document.getElementById('editDebtId').value = '';
    document.getElementById('debtDate').valueAsDate = new Date();
    document.getElementById('debtDescription').value = '';
    document.getElementById('debtValue').value = '';
    document.getElementById('debtRecurrent').checked = false; // Limpa o checkbox
}

// Exclui uma dívida da lista permanentemente após confirmação
function deleteDebt(id) {
    if (confirm("Tem certeza que deseja excluir esta dívida definitivamente?")) {
        // Se a dívida excluída estava em edição, limpa o formulário primeiro
        const currentEditId = document.getElementById('editDebtId').value;
        if (currentEditId && parseInt(currentEditId) === id) {
            cancelEdit();
        }

        debts = debts.filter(debt => debt.id !== id);
        saveToLocalStorage();
        renderDebts();
    }
}

// Alternar status de pago (Check/Uncheck)
function togglePaid(id) {
    debts = debts.map(debt => {
        if(debt.id === id) {
            return { ...debt, paid: !debt.paid };
        }
        return debt;
    });
    saveToLocalStorage();
    
    const showPaid = document.getElementById('showPaidToggle').checked;
    if (!showPaid) {
        // Pequeno delay para o usuário ver o "check" antes de ocultar da lista ativa
        setTimeout(renderDebts, 250);
    } else {
        renderDebts();
    }
}

// Salvar no LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('myDebts', JSON.stringify(debts));
}

// Auxiliar para formatar data (AAAA-MM-DD) para (DD/MM/AAAA)
function formatDateToDisplay(dateString) {
    if(!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Renderizar a tabela filtrada e ordenada
function renderDebts() {
    const debtList = document.getElementById('debtList');
    const emptyMessage = document.getElementById('emptyMessage');
    const showPaid = document.getElementById('showPaidToggle').checked;
    
    debtList.innerHTML = '';
    
    // Filtrar baseado na opção de exibir ou ocultar as pagas
    const filteredDebts = debts.filter(debt => showPaid ? true : !debt.paid);
    
    // Calcular totais das visíveis/pendentes no widget
    let totalPending = debts.reduce((acc, current) => !current.paid ? acc + current.value : acc, 0);
    document.getElementById('totalsWidget').innerText = `Total Pendente: ${totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

    if (filteredDebts.length === 0) {
        emptyMessage.style.display = 'block';
        document.getElementById('debtsTable').style.display = 'none';
        return;
    }

    emptyMessage.style.display = 'none';
    document.getElementById('debtsTable').style.display = 'table';

    // Ordenar por data de vencimento mais próxima
    filteredDebts.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    // Construir as linhas da tabela dinamicamente
    filteredDebts.forEach(debt => {
        const tr = document.createElement('tr');
        if(debt.paid) tr.classList.add('row-paid');

        tr.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" ${debt.paid ? 'checked' : ''} onchange="togglePaid(${debt.id})">
            </td>
            <td>${debt.date}</td>
            <td>${debt.description}</td>
            <td class="text-right">${debt.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td class="actions-cell">
                <button class="btn-action btn-edit" onclick="editDebt(${debt.id})">Editar</button>
                <button class="btn-action btn-delete" onclick="deleteDebt(${debt.id})">Excluir</button>
            </td>
        `;
        debtList.appendChild(tr);
    });
}

// Executa a primeira renderização ao abrir a aplicação
renderDebts();

//

// Função corrigida: Clona apenas as dívidas recorrentes do mês atual para o próximo
function generateNextMonthDebts() {
    // 1. Identificar o mês e ano atuais para servir de filtro
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // Janeiro é 0, Junho é 5, etc.

    // 2. Filtrar apenas as dívidas que são recorrentes E que vencem no mês/ano atual
    const recurrentDebtsFromThisMonth = debts.filter(debt => {
        if (!debt.recurrent) return false;
        
        // Converte a data salva para um objeto Date para checar o mês e o ano
        const debtDate = new Date(debt.rawDate + "T00:00:00");
        return debtDate.getMonth() === mesAtual && debtDate.getFullYear() === anoAtual;
    });

    // Validação caso não encontre nada no mês corrente
    if (recurrentDebtsFromThisMonth.length === 0) {
        const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        alert(`Não foram encontradas dívidas recorrentes cadastradas para o mês atual (${nomeMeses[mesAtual]} de ${anoAtual}).`);
        return;
    }

    if (confirm(`Deseja copiar as ${recurrentDebtsFromThisMonth.length} dívidas recorrentes deste mês para o mês seguinte?`)) {
        let count = 0;
        
        recurrentDebtsFromThisMonth.forEach(debt => {
            let currentDate = new Date(debt.rawDate + "T00:00:00");
            // Avança exatamente 1 mês
            currentDate.setMonth(currentDate.getMonth() + 1);
            
            const nextYear = currentDate.getFullYear();
            const nextMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
            const nextDay = String(currentDate.getDate()).padStart(2, '0');
            const nextRawDate = `${nextYear}-${nextMonth}-${nextDay}`;

            const clonedDebt = {
                id: Date.now() + count, 
                date: `${nextDay}/${nextMonth}/${nextYear}`,
                rawDate: nextRawDate,
                description: debt.description,
                value: debt.value,
                paid: false, // Nova dívida nasce em aberto
                recurrent: true // Mantém a propriedade de repetição para o futuro
            };

            debts.push(clonedDebt);
            count++;
        });

        saveToLocalStorage();
        renderDebts();
        alert(`Sucesso! ${count} dívidas de este mês foram replicadas para o próximo mês.`);
    }
}

// Função Corrigida: Só clona dívidas recorrentes do mês atual se elas NÃO estiverem pagas/ocultas
function generateNextMonthDebts() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); 

    // CORREÇÃO: Adicionado "&& !debt.paid" para ignorar completamente as dívidas já ticadas/ocultas
    const recurrentDebtsFromThisMonth = debts.filter(debt => {
        if (!debt.recurrent) return false;
        
        const debtDate = new Date(debt.rawDate + "T00:00:00");
        return debtDate.getMonth() === mesAtual && debtDate.getFullYear() === anoAtual && !debt.paid;
    });

    if (recurrentDebtsFromThisMonth.length === 0) {
        const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        alert(`Nenhuma dívida recorrente em aberto (não paga) foi encontrada para o mês atual (${nomeMeses[mesAtual]} de ${anoAtual}).`);
        return;
    }

    // Identifica o que já foi enviado para o mês seguinte para evitar duplicar à toa
    const proximoMesData = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    const anoProximo = proximoMesData.getFullYear();
    const mesProximo = proximoMesData.getMonth();

    const debtsAlreadyInNextMonth = debts.filter(debt => {
        const dDate = new Date(debt.rawDate + "T00:00:00");
        return dDate.getMonth() === mesProximo && dDate.getFullYear() === anoProximo;
    });

    if (confirm(`Deseja copiar as ${recurrentDebtsFromThisMonth.length} dívidas recorrentes EM ABERTO deste mês para o mês seguinte?`)) {
        let count = 0;
        
        recurrentDebtsFromThisMonth.forEach(debt => {
            // Verifica se já foi clonada pela descrição para evitar duplicidade
            const jaExiste = debtsAlreadyInNextMonth.some(nextDebt => nextDebt.description.toLowerCase() === debt.description.toLowerCase());
            
            if (!jaExiste) {
                let currentDate = new Date(debt.rawDate + "T00:00:00");
                currentDate.setMonth(currentDate.getMonth() + 1);
                
                const nextYear = currentDate.getFullYear();
                const nextMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
                const nextDay = String(currentDate.getDate()).padStart(2, '0');
                const nextRawDate = `${nextYear}-${nextMonth}-${nextDay}`;

                const clonedDebt = {
                    id: Date.now() + count, 
                    date: `${nextDay}/${nextMonth}/${nextYear}`,
                    rawDate: nextRawDate,
                    description: debt.description,
                    value: debt.value,
                    paid: false,       // A nova nasce limpa (aberta)
                    recurrent: false   // Vira uma dívida comum no mês seguinte
                };

                debts.push(clonedDebt);
                count++;
            }
        });

        saveToLocalStorage();
        renderDebts();

        if (count === 0) {
            alert("As dívidas recorrentes em aberto já tinham sido copiadas.");
        } else {
            alert(`Sucesso! ${count} dívidas ativas foram copiadas para o próximo mês.`);
        }
    }
}