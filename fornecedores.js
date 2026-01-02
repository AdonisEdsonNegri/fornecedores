// Configuração Supabase
const SUPABASE_URL = 'https://lutwlisdkciaslvqauyh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dHdsaXNka2NpYXNsdnFhdXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4ODgxODYsImV4cCI6MjA4MjQ2NDE4Nn0.CYAhmx4HxXjE6yBIIascPb0Y4siG-oUsGUfWP83am6Q';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variáveis globais
let modoEdicao = false;
let filtroAtual = null;
let fornecedoresFiltrados = [];
let telefones = [];
let confirmCallback = null;

const ITENS_POR_PAGINA = 15;
let paginaAtual = 1;
let totalPaginas = 1;

// Inicialização
window.addEventListener('DOMContentLoaded', function() {
    carregarFornecedores();
    inicializarEventos();
});

function inicializarEventos() {
    document.getElementById('btnAdicionar').addEventListener('click', abrirModalAdicionar);
    document.getElementById('btnFechar').addEventListener('click', fecharModal);
    document.getElementById('btnFecharFiltro').addEventListener('click', fecharModalFiltro);
    document.getElementById('formFornecedor').addEventListener('submit', salvarFornecedor);
    document.getElementById('formFiltro').addEventListener('submit', aplicarFiltro);
    document.getElementById('btnLimparFiltro').addEventListener('click', limparFiltro);
    document.getElementById('relatorioFiltro').addEventListener('click', (e) => { e.preventDefault(); gerarRelatorioFiltro(); });
    document.getElementById('btnAddTelefone').addEventListener('click', adicionarTelefone);
    document.getElementById('btnConfirmNo').addEventListener('click', fecharConfirm);
    
    document.getElementById('filtroId').addEventListener('click', (e) => { e.preventDefault(); abrirModalFiltro('id'); });
    document.getElementById('filtroRazao').addEventListener('click', (e) => { e.preventDefault(); abrirModalFiltro('razao'); });
    document.getElementById('filtroPessoa').addEventListener('click', (e) => { e.preventDefault(); abrirModalFiltro('pessoa'); });
    document.getElementById('filtroCnpj').addEventListener('click', (e) => { e.preventDefault(); abrirModalFiltro('cnpj'); });
    document.getElementById('filtroSituacao').addEventListener('click', (e) => { e.preventDefault(); abrirModalFiltro('situacao'); });
    
    document.getElementById('cnpj').addEventListener('input', formatarCNPJ);
    document.getElementById('end_cep').addEventListener('input', formatarCEP);
    document.getElementById('end_uf').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
    document.getElementById('email').addEventListener('input', (e) => { e.target.value = e.target.value.toLowerCase(); });
    
    document.getElementById('btnPrimeira').addEventListener('click', irParaPrimeiraPagina);
    document.getElementById('btnAnterior').addEventListener('click', irParaPaginaAnterior);
    document.getElementById('btnProxima').addEventListener('click', irParaProximaPagina);
    document.getElementById('btnUltima').addEventListener('click', irParaUltimaPagina);
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => mudarAba(parseInt(tab.dataset.tab)));
    });
    
    window.addEventListener('click', function(event) {
        if (event.target.id === 'modal') fecharModal();
        if (event.target.id === 'modalFiltro') fecharModalFiltro();
    });
}

// Funções de Abas
function mudarAba(index) {
    document.querySelectorAll('.tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    
    document.querySelectorAll('.tab-content').forEach((content, i) => {
        content.classList.toggle('active', i === index);
    });
}

// Funções de Telefone
function adicionarTelefone() {
    telefones.push({ tipo: 'Comercial', numero: '' });
    renderizarTelefones();
}

function removerTelefone(index) {
    telefones.splice(index, 1);
    renderizarTelefones();
}

function renderizarTelefones() {
    const container = document.getElementById('telefones-list');
    container.innerHTML = '';
    
    telefones.forEach((tel, index) => {
        const div = document.createElement('div');
        div.className = 'telefones-item';
        div.innerHTML = `
            <select onchange="telefones[${index}].tipo = this.value">
                <option value="Comercial" ${tel.tipo === 'Comercial' ? 'selected' : ''}>📞 Comercial</option>
                <option value="Celular" ${tel.tipo === 'Celular' ? 'selected' : ''}>📱 Celular</option>
                <option value="WhatsApp" ${tel.tipo === 'WhatsApp' ? 'selected' : ''}>💬 WhatsApp</option>
            </select>
            <input type="text" value="${tel.numero}" 
                   onchange="telefones[${index}].numero = this.value"
                   oninput="formatarTelefoneInput(this)"
                   placeholder="(00) 00000-0000">
            <button type="button" class="btn-remove" onclick="removerTelefone(${index})">✖</button>
        `;
        container.appendChild(div);
    });
}

function formatarTelefoneInput(input) {
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length <= 10) {
        valor = valor.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
        valor = valor.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    
    input.value = valor;
}

// Funções de Formatação
function formatarCNPJ(e) {
    let valor = e.target.value.replace(/[^0-9A-Za-z]/g, '');
    valor = valor.toUpperCase().substring(0, 14);
    
    if (valor.length <= 14) {
        valor = valor.replace(/(\w{2})(\w{3})(\w{3})(\w{4})(\w{0,2})/, '$1.$2.$3/$4-$5');
    }
    
    e.target.value = valor;
}

function formatarCEP(e) {
    let valor = e.target.value.replace(/\D/g, '');
    valor = valor.substring(0, 8);
    
    if (valor.length > 5) {
        valor = valor.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    }
    
    e.target.value = valor;
}

function formatarCNPJExibicao(cnpj) {
    if (!cnpj) return '-';
    const limpo = cnpj.replace(/[^0-9A-Za-z]/g, '');
    if (limpo.length < 14) return cnpj;
    return limpo.replace(/(\w{2})(\w{3})(\w{3})(\w{4})(\w{2})/, '$1.$2.$3/$4-$5');
}

// Funções de CRUD
async function carregarFornecedores() {
    document.getElementById('loading').style.display = 'block';
    
    try {
        const { data, error } = await sb
            .from('fornecedores')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        fornecedoresFiltrados = data;
        paginaAtual = 1;
        calcularTotalPaginas();
        exibirPaginaAtual();
    } catch (error) {
        mostrarMensagem('Erro ao carregar fornecedores: ' + error.message, 'error');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function calcularTotalPaginas() {
    totalPaginas = Math.ceil(fornecedoresFiltrados.length / ITENS_POR_PAGINA);
    if (totalPaginas === 0) totalPaginas = 1;
    document.getElementById('totalPaginas').textContent = totalPaginas;
}

function exibirPaginaAtual() {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    const fornecedoresPagina = fornecedoresFiltrados.slice(inicio, fim);
    
    exibirFornecedores(fornecedoresPagina);
    atualizarBotoesPaginacao();
    document.getElementById('paginaAtual').textContent = paginaAtual;
}

function atualizarBotoesPaginacao() {
    document.getElementById('btnPrimeira').disabled = paginaAtual === 1;
    document.getElementById('btnAnterior').disabled = paginaAtual === 1;
    document.getElementById('btnProxima').disabled = paginaAtual === totalPaginas;
    document.getElementById('btnUltima').disabled = paginaAtual === totalPaginas;
}

function irParaPrimeiraPagina() {
    paginaAtual = 1;
    exibirPaginaAtual();
}

function irParaPaginaAnterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        exibirPaginaAtual();
    }
}

function irParaProximaPagina() {
    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        exibirPaginaAtual();
    }
}

function irParaUltimaPagina() {
    paginaAtual = totalPaginas;
    exibirPaginaAtual();
}

function exibirFornecedores(fornecedores) {
    const tbody = document.getElementById('corpoTabela');
    tbody.innerHTML = '';

    if (fornecedores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum fornecedor encontrado</td></tr>';
        return;
    }

    fornecedores.forEach(fornecedor => {
        const tr = document.createElement('tr');
        const situacaoTexto = fornecedor.situacao === 'A' ? '🟢 Ativo' : '🔴 Inativo';
        tr.innerHTML = `
            <td>${fornecedor.id}</td>
            <td>${fornecedor.razao_social}</td>
            <td>${formatarCNPJExibicao(fornecedor.cnpj)}</td>
            <td>${fornecedor.pessoa_p_contato || '-'}</td>
            <td>${situacaoTexto}</td>
            <td class="actions">
                <button class="btn btn-small" onclick="gerarRelatorioIndividual(${fornecedor.id})" title="Relatório">📄</button>
                <button class="btn btn-small btn-edit" onclick="editarFornecedor(${fornecedor.id})">✏️</button>
                <button class="btn btn-small btn-delete" onclick="excluirFornecedor(${fornecedor.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalAdicionar() {
    modoEdicao = false;
    telefones = [];
    document.getElementById('modalTitulo').textContent = 'Adicionar Fornecedor';
    document.getElementById('formFornecedor').reset();
    document.getElementById('fornecedorId').value = '';
    document.getElementById('id').disabled = true; // ID sempre desabilitado - auto-increment do PostgreSQL
    document.getElementById('id').value = 'AUTO';
    renderizarTelefones();
    mudarAba(0);
    document.getElementById('modal').style.display = 'block';
}

async function editarFornecedor(id) {
    modoEdicao = true;
    document.getElementById('modalTitulo').textContent = 'Editar Fornecedor';

    try {
        const { data, error } = await sb
            .from('fornecedores')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('fornecedorId').value = id;
        document.getElementById('id').value = data.id;
        document.getElementById('id').disabled = true;
        document.getElementById('razao_social').value = data.razao_social || '';
        document.getElementById('pessoa_p_contato').value = data.pessoa_p_contato || '';
        document.getElementById('cnpj').value = formatarCNPJExibicao(data.cnpj);
        document.getElementById('insc_estadual').value = data.insc_estadual || '';
        document.getElementById('end_logradouro').value = data.end_logradouro || '';
        document.getElementById('end_numero').value = data.end_numero || '';
        document.getElementById('end_andar').value = data.end_andar || '';
        document.getElementById('end_complemento').value = data.end_complemento || '';
        document.getElementById('end_bairro').value = data.end_bairro || '';
        document.getElementById('end_cep').value = data.end_cep || '';
        document.getElementById('end_cidade').value = data.end_cidade || '';
        document.getElementById('end_uf').value = data.end_uf || '';
        document.getElementById('codigo_municipio').value = data.codigo_municipio || '';
        document.getElementById('situacao').value = data.situacao || 'A';
        document.getElementById('email').value = data.email || '';
        document.getElementById('site').value = data.site || '';
        document.getElementById('obs').value = data.obs || '';

        telefones = data.telefones || [];
        renderizarTelefones();

        mudarAba(0);
        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        mostrarMensagem('Erro ao carregar fornecedor: ' + error.message, 'error');
    }
}

async function salvarFornecedor(event) {
    event.preventDefault();

    // Validar CNPJ
    const cnpjLimpo = document.getElementById('cnpj').value.replace(/[^0-9A-Za-z]/g, '');
    if (cnpjLimpo.length !== 14) {
        mostrarMensagem('CNPJ deve conter exatamente 14 caracteres!', 'error');
        return;
    }

    const fornecedor = {
        razao_social: document.getElementById('razao_social').value,
        pessoa_p_contato: document.getElementById('pessoa_p_contato').value,
        cnpj: cnpjLimpo,
        insc_estadual: document.getElementById('insc_estadual').value,
        end_logradouro: document.getElementById('end_logradouro').value,
        end_numero: document.getElementById('end_numero').value,
        end_andar: document.getElementById('end_andar').value,
        end_complemento: document.getElementById('end_complemento').value,
        end_bairro: document.getElementById('end_bairro').value,
        end_cep: document.getElementById('end_cep').value,
        end_cidade: document.getElementById('end_cidade').value,
        end_uf: document.getElementById('end_uf').value.toUpperCase(),
        telefones: telefones,
        email: document.getElementById('email').value.toLowerCase(),
        site: document.getElementById('site').value,
        codigo_municipio: document.getElementById('codigo_municipio').value,
        situacao: document.getElementById('situacao').value.toUpperCase(),
        obs: document.getElementById('obs').value
    };

    try {
        if (modoEdicao) {
            const fornecedorId = parseInt(document.getElementById('fornecedorId').value);
            const { error } = await sb
                .from('fornecedores')
                .update(fornecedor)
                .eq('id', fornecedorId);

            if (error) throw error;
            mostrarMensagem('Fornecedor atualizado com sucesso!', 'success');
        } else {
            const { error } = await sb
                .from('fornecedores')
                .insert([fornecedor]);

            if (error) throw error;
            mostrarMensagem('Fornecedor adicionado com sucesso!', 'success');
        }

        fecharModal();
        carregarFornecedores();
    } catch (error) {
        mostrarMensagem('Erro ao salvar fornecedor: ' + error.message, 'error');
    }
}

function excluirFornecedor(id) {
    mostrarConfirm('Tem certeza que deseja excluir este fornecedor?', async function() {
        try {
            const { error } = await sb
                .from('fornecedores')
                .delete()
                .eq('id', id);

            if (error) throw error;

            mostrarMensagem('Fornecedor excluído com sucesso!', 'success');
            carregarFornecedores();
        } catch (error) {
            mostrarMensagem('Erro ao excluir fornecedor: ' + error.message, 'error');
        }
    });
}

// Funções de Filtro
function abrirModalFiltro(tipo) {
    filtroAtual = { tipo: tipo };
    const campoFiltro = document.getElementById('campoFiltro');
    
    if (tipo === 'id') {
        document.getElementById('tituloFiltro').textContent = 'Filtrar por ID';
        campoFiltro.innerHTML = `
            <label for="valorFiltro">ID do Fornecedor:</label>
            <input type="text" id="valorFiltro" pattern="[0-9]*" inputmode="numeric" required>
        `;
    } else if (tipo === 'razao') {
        document.getElementById('tituloFiltro').textContent = 'Filtrar por Razão Social';
        campoFiltro.innerHTML = `
            <label for="valorFiltro">Texto contido na razão social:</label>
            <input type="text" id="valorFiltro" required>
        `;
    } else if (tipo === 'pessoa') {
        document.getElementById('tituloFiltro').textContent = 'Filtrar por Pessoa Contato';
        campoFiltro.innerHTML = `
            <label for="valorFiltro">Texto contido no nome:</label>
            <input type="text" id="valorFiltro" required>
        `;
    } else if (tipo === 'cnpj') {
        document.getElementById('tituloFiltro').textContent = 'Filtrar por CNPJ';
        campoFiltro.innerHTML = `
            <label for="valorFiltro">CNPJ (somente números/letras):</label>
            <input type="text" id="valorFiltro" required maxlength="14">
        `;
    } else if (tipo === 'situacao') {
        document.getElementById('tituloFiltro').textContent = 'Filtrar por Situação';
        campoFiltro.innerHTML = `
            <label for="valorFiltro">Situação:</label>
            <select id="valorFiltro" required>
                <option value="A">A - Ativo</option>
                <option value="I">I - Inativo</option>
            </select>
        `;
    }
    
    document.getElementById('modalFiltro').style.display = 'block';
    
    // Dar foco automático no campo após um pequeno delay para garantir que o elemento foi renderizado
    setTimeout(() => {
        const campoValor = document.getElementById('valorFiltro');
        if (campoValor) {
            campoValor.focus();
        }
    }, 100);
}

async function aplicarFiltro(event) {
    event.preventDefault();
    let valor = document.getElementById('valorFiltro').value;
    
    try {
        const { data, error } = await sb
            .from('fornecedores')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

        let resultado;
        let textoFiltro;

        if (filtroAtual.tipo === 'id') {
            resultado = data.filter(f => f.id == valor);
            textoFiltro = `ID = ${valor}`;
        } else if (filtroAtual.tipo === 'razao') {
            resultado = data.filter(f => f.razao_social && f.razao_social.toLowerCase().includes(valor.toLowerCase()));
            textoFiltro = `Razão Social contém "${valor}"`;
        } else if (filtroAtual.tipo === 'pessoa') {
            resultado = data.filter(f => f.pessoa_p_contato && f.pessoa_p_contato.toLowerCase().includes(valor.toLowerCase()));
            textoFiltro = `Pessoa Contato contém "${valor}"`;
        } else if (filtroAtual.tipo === 'cnpj') {
            const cnpjLimpo = valor.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
            resultado = data.filter(f => f.cnpj && f.cnpj.includes(cnpjLimpo));
            textoFiltro = `CNPJ contém "${cnpjLimpo}"`;
        } else if (filtroAtual.tipo === 'situacao') {
            valor = valor.toUpperCase();
            resultado = data.filter(f => f.situacao === valor);
            textoFiltro = `Situação = ${valor === 'A' ? 'Ativo' : 'Inativo'}`;
        }

        fornecedoresFiltrados = resultado;
        paginaAtual = 1;
        calcularTotalPaginas();
        exibirPaginaAtual();
        mostrarFiltroAtivo(textoFiltro);
        fecharModalFiltro();
    } catch (error) {
        mostrarMensagem('Erro ao aplicar filtro: ' + error.message, 'error');
    }
}

function mostrarFiltroAtivo(texto) {
    document.getElementById('textoFiltro').textContent = texto;
    document.getElementById('filtroAtivo').style.display = 'block';
}

function limparFiltro() {
    document.getElementById('filtroAtivo').style.display = 'none';
    filtroAtual = null;
    carregarFornecedores();
}

// Funções de Relatório
async function gerarRelatorioIndividual(id) {
    try {
        const { data, error } = await sb
            .from('fornecedores')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const telefonesHTML = (data.telefones || []).map(t => 
            `<tr><td colspan="2"><strong>${t.tipo}:</strong> ${t.numero}</td></tr>`
        ).join('');

        let html = `
            <html>
            <head>
                <title>SIRIUS WEB - Fornecedor ${data.id}</title>
                <style>
                    body { font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; }
                    h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
                    .subtitle { color: #999; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    td { padding: 8px; border-bottom: 1px solid #eee; }
                    td:first-child { font-weight: bold; width: 200px; color: #666; }
                    .section { margin-top: 30px; font-size: 1.2em; color: #667eea; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 5px; }
                </style>
            </head>
            <body>
                <h1>🏢 SIRIUS WEB</h1>
                <div class="subtitle">Relatório Detalhado de Fornecedor</div>
                
                <div class="section">Dados Principais</div>
                <table>
                    <tr><td>ID</td><td>${data.id}</td></tr>
                    <tr><td>Razão Social</td><td>${data.razao_social}</td></tr>
                    <tr><td>CNPJ</td><td>${formatarCNPJExibicao(data.cnpj)}</td></tr>
                    <tr><td>Inscrição Estadual</td><td>${data.insc_estadual || '-'}</td></tr>
                    <tr><td>Pessoa para Contato</td><td>${data.pessoa_p_contato || '-'}</td></tr>
                    <tr><td>Situação</td><td>${data.situacao === 'A' ? 'Ativo' : 'Inativo'}</td></tr>
                </table>
                
                <div class="section">Endereço</div>
                <table>
                    <tr><td>Logradouro</td><td>${data.end_logradouro || '-'}</td></tr>
                    <tr><td>Número</td><td>${data.end_numero || '-'}</td></tr>
                    <tr><td>Andar</td><td>${data.end_andar || '-'}</td></tr>
                    <tr><td>Complemento</td><td>${data.end_complemento || '-'}</td></tr>
                    <tr><td>Bairro</td><td>${data.end_bairro || '-'}</td></tr>
                    <tr><td>Cidade/UF</td><td>${data.end_cidade || '-'} / ${data.end_uf || '-'}</td></tr>
                    <tr><td>CEP</td><td>${data.end_cep || '-'}</td></tr>
                    <tr><td>Código Município</td><td>${data.codigo_municipio || '-'}</td></tr>
                </table>
                
                <div class="section">Contato</div>
                <table>
                    ${telefonesHTML || '<tr><td colspan="2">Nenhum telefone cadastrado</td></tr>'}
                    <tr><td>Email</td><td>${data.email || '-'}</td></tr>
                    <tr><td>Site</td><td>${data.site || '-'}</td></tr>
                </table>
                
                <div class="section">Observações</div>
                <table>
                    <tr><td colspan="2">${data.obs || 'Nenhuma observação'}</td></tr>
                </table>
                
                <div class="section">Informações do Sistema</div>
                <table>
                    <tr><td>Data de Criação</td><td>${new Date(data.data_criacao).toLocaleString('pt-BR')}</td></tr>
                </table>
            </body>
            </html>
        `;

        const janela = window.open('', '_blank');
        janela.document.write(html);
        janela.document.close();
    } catch (error) {
        mostrarMensagem('Erro ao gerar relatório: ' + error.message, 'error');
    }
}

function gerarRelatorioFiltro() {
    if (fornecedoresFiltrados.length === 0) {
        mostrarMensagem('Não há fornecedores para gerar relatório!', 'error');
        return;
    }

    let html = `
        <html>
        <head>
            <title>SIRIUS WEB - Relatório de Fornecedores</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                h1 { color: #667eea; }
                .subtitle { color: #999; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background: #667eea; color: white; }
            </style>
        </head>
        <body>
            <h1>📄 SIRIUS WEB</h1>
            <div class="subtitle">Relatório de Fornecedores</div>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <p><strong>Total de fornecedores:</strong> ${fornecedoresFiltrados.length}</p>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Razão Social</th>
                        <th>CNPJ</th>
                        <th>Telefones</th>
                    </tr>
                </thead>
                <tbody>
    `;

    fornecedoresFiltrados.forEach(f => {
        const telefones = f.telefones && f.telefones.length > 0 ? f.telefones[0].numero : '-';
        html += `
            <tr>
                <td>${f.id}</td>
                <td>${f.razao_social}</td>
                <td>${formatarCNPJExibicao(f.cnpj)}</td>
                <td>${telefones}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        </body>
        </html>
    `;

    const janela = window.open('', '_blank');
    janela.document.write(html);
    janela.document.close();
}

// Funções de Modal
function fecharModal() {
    document.getElementById('modal').style.display = 'none';
}

function fecharModalFiltro() {
    document.getElementById('modalFiltro').style.display = 'none';
}

function mostrarConfirm(mensagem, callback) {
    document.getElementById('confirmMessage').textContent = mensagem;
    document.getElementById('confirmModal').style.display = 'block';
    
    // Remover listeners antigos para evitar duplicação
    const btnYes = document.getElementById('btnConfirmYes');
    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    
    // Adicionar novo listener
    newBtnYes.onclick = function() {
        fecharConfirm();
        if (callback) callback();
    };
}

function fecharConfirm() {
    document.getElementById('confirmModal').style.display = 'none';
    confirmCallback = null;
}

function mostrarMensagem(texto, tipo) {
    const div = document.getElementById('mensagem');
    div.className = tipo;
    div.textContent = texto;
    div.style.display = 'block';
    div.style.zIndex = '99999'; // Z-index muito alto para ficar acima de tudo
    div.style.position = 'fixed'; // Posicionamento fixo
    div.style.top = '20px'; // Posição no topo
    div.style.left = '50%'; // Centralizar horizontalmente
    div.style.transform = 'translateX(-50%)'; // Ajuste para centralização perfeita

    setTimeout(() => {
        div.style.display = 'none';
    }, 3000);
}