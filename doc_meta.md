Implementação
Updated: 4 de nov de 2025
Este documento explica como implementar o Cadastro Incorporado v4 e capturar os dados gerados para integrar clientes comerciais à Plataforma do WhatsApp Business.
Antes de começar
É preciso ser um Parceiro de Soluções ou Provedor de Tecnologia.
Caso os clientes comerciais usem seu app para enviar e receber mensagens, você já deve saber como usar a API para fazer isso por meio da sua própria conta do WhatsApp Business e números de telefone comercial. Você também deve saber como criar e gerenciar modelos e ter um ponto de extremidade de retorno de ligação de webhooks devidamente configurado para processar webhooks.
É preciso assinar o webhook account_update, já que ele é disparado quando um cliente conclui com sucesso o fluxo de Cadastro Incorporado e contém as informações da empresa necessárias para você.
Caso você seja um Parceiro de Soluções, já deve ter uma linha de crédito.
O servidor que hospeda o Cadastro Incorporado deve ter um certificado SSL válido.
Etapa 1: adicionar domínios permitidos
Carregue o app no Painel de Apps e acesse Login do Facebook para Empresas > Configurações > Configurações de OAuth do cliente:

Defina como Sim as seguintes opções:
Login do cliente com OAuth
Login do OAuth da web
Aplicar HTTPS
Login com OAuth via navegador incorporado
usar o modo restrito para URIs de redirecionamento
Login com o SDK do JavaScript
O Cadastro Incorporado depende do SDK do JavaScript. Quando um cliente empresarial concluir o flow de Cadastro Incorporado, a identificação da conta do WhatsApp Business do cliente, a identificação do número de telefone comercial e um código de token que pode ser trocado serão retornados para a janela que gerou o flow, mas apenas se o domínio da página que gerou o flow estiver listado nos campos Domínios permitidos e URIs de redirecionamento de OAuth válidos.
Nesses campos, adicione todos os domínios em que você planeja hospedar o Cadastro Incorporado, incluindo domínios de desenvolvimento em que testará o flow. Apenas domínios que habilitaram HTTPS são compatíveis.
Etapa 2: criar uma configuração do Login do Facebook para Empresas
Uma configuração do Login do Facebook para Empresas define quais permissões serão pedidas e quais informações adicionais serão coletadas dos clientes empresariais que acessarem o Cadastro Incorporado.
Navegue até Login do Facebook para Empresas > Configurações:

Clique no botão Criar a partir de modelo e crie uma configuração a partir do modelo Configuração do cadastro incorporado do WhatsApp com token de expiração em 60 dias. Isso gerará uma configuração para as permissões e os níveis de acesso mais usados.
Como alternativa, você pode criar uma configuração personalizada. Para isso, no painel Configurações, clique no botão Criar configuração e forneça um nome que ajudará você a diferenciar a configuração personalizada de outras que possa criar no futuro. Ao concluir o flow, selecione a variação de login do Cadastro Incorporado do WhatsApp:

Selecione os produtos que você quer integrar para essa configuração.

Ao escolher ativos e permissões, selecione apenas aqueles que você realmente precisará dos seus clientes empresariais. Os ativos já selecionados são adicionados por padrão.
Por exemplo, se você selecionar o ativo Catálogos sem necessidade de acesso aos catálogos dos clientes, eles provavelmente abandonarão o flow na tela de seleção de catálogo e pedirão esclarecimentos.
Ao concluir o flow de configuração, capture a identificação da configuração, já que você precisará dela na próxima etapa.

Etapa 3: adicionar o Cadastro Incorporado ao seu site
Adicione o seguinte código HTML e JavaScript ao seu site. Esse é o código completo necessário para implementar o Cadastro Incorporado. Cada parte do código será explicada em detalhes abaixo.
<!-- SDK loading -->
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script><script>
  // SDK initialization
  window.fbAsyncInit = function() {
    FB.init({
      appId: '<APP_ID>', // your app ID goes here
      autoLogAppEvents: true,
      xfbml: true,
      version: '<GRAPH_API_VERSION>' // Graph API version goes here
    });
  };

  // Session logging message event listener
  window.addEventListener('message', (event) => {
    if (!event.origin.endsWith('facebook.com')) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        console.log('message event: ', data); // remove after testing
        // your code goes here
      }
    } catch {
      console.log('message event: ', event.data); // remove after testing
      // your code goes here
    }
  });

  // Response callback
  const fbLoginCallback = (response) => {
    if (response.authResponse) {
      const code = response.authResponse.code;
      console.log('response: ', code); // remove after testing
      // your code goes here
    } else {
      console.log('response: ', response); // remove after testing
      // your code goes here
    }
  }

  // Launch method and callback registration
  const launchWhatsAppSignup = () => {
    FB.login(fbLoginCallback, {
      config_id: '<CONFIGURATION_ID>', // your configuration ID goes here
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
      }
    });
  }
</script><!-- Launch button  --><button onclick="launchWhatsAppSignup()" style="background-color: #1877f2; border: 0; border-radius: 4px; color: #fff; cursor: pointer; font-family: Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; height: 40px; padding: 0 24px;">Login with Facebook</button>
Carregamento do SDK
Essa parte do código carrega o SDK do Facebook para JavaScript de forma assíncrona:
<!-- SDK loading -->
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>
Inicialização do SDK
Essa parte do código inicializa o SDK. Adicione a identificação do app e a versão mais recente da Graph API neste local.
// SDK initialization
window.fbAsyncInit = function() {
  FB.init({
    appId: '<APP_ID>', // your app ID goes here
    autoLogAppEvents: true,
    xfbml: true,
    version: '<GRAPH_API_VERSION>' // Graph API version here
  });
};
Substitua os espaços reservados a seguir pelos seus próprios valores.
Espaço reservado	Descrição	Valor de exemplo
<APP_ID>
Obrigatório.
A identificação do app. Essa informação é exibida na parte superior do Painel de Apps.
21202248997039
<GRAPH_API_VERSION>
Obrigatório.
Versão da Graph API. Indica a versão da Graph API que será chamada se você estiver usando os métodos do SDK para realizar chamadas de API.
No contexto do Cadastro Incorporado, você não dependerá dos métodos do SDK para realizar chamadas de API. Por isso, recomendamos que configure a versão mais recente da API:
v25.0
v25.0
Ouvinte de eventos de mensagem de registro da sessão
Essa parte do código cria um ouvinte de eventos de mensagem que captura as seguintes informações essenciais:
As identificações de ativos recém-geradas do cliente comercial, se o flow foi concluído com sucesso
O nome da tela que foi abandonada, se o flow tiver sido abandonado
Uma identificação de erro, caso o usuário tenha encontrado um erro e usado o flow para denunciá-lo
// Session logging message event listener
window.addEventListener('message', (event) => {
  if (!event.origin.endsWith(‘facebook.com’)) return;
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'WA_EMBEDDED_SIGNUP') {
      console.log('message event: ', data); // remove after testing
      // your code goes here
    }
  } catch {
    console.log('message event: ', event.data); // remove after testing
    // your code goes here
  }
});
Essas informações serão enviadas em um objeto de evento de mensagem para a janela que gerou o flow e serão atribuídas à constante de dados. Adicione seu próprio código personalizado à declaração try-catch que pode enviar esse objeto para seu servidor. A estrutura do objeto variará com base na conclusão do flow, abandono ou relatório de erros, conforme descrito abaixo.
Estrutura de conclusão bem-sucedida do fluxo:
{
  data: {
    phone_number_id: '<CUSTOMER_BUSINESS_PHONE_NUMBER_ID>',
    waba_id: '<CUSTOMER_WABA_ID>',
    business_id: '<CUSTOMER_BUSINESS_PORTFOLIO_ID>'
    ad_account_ids?: ['<CUSTOMER_AD_ACCOUNT_ID_1>', '<CUSTOMER_AD_ACCOUNT_ID_2>'],
    page_ids?: ['<CUSTOMER_PAGE_ID_1>', '<CUSTOMER_PAGE_ID_2>'],
    dataset_ids?: ['<CUSTOMER_DATASET_ID_1>', '<CUSTOMER_DATASET_ID_2>'],
  },
  type: 'WA_EMBEDDED_SIGNUP',
  event: '<FLOW_FINISH_TYPE>',
}
Espaço reservado	Descrição	Valor de exemplo
<CUSTOMER_BUSINESS_PHONE_NUMBER_ID>
Identificação do número de telefone comercial do cliente
106540352242922
<CUSTOMER_WABA_ID>
Identificação da conta do WhatsApp Business do cliente comercial.
524126980791429
<CUSTOMER_BUSINESS_PORTFOLIO_ID>
A identificação do portfólio empresarial do cliente corporativo.
2729063490586005
<CUSTOMER_AD_ACCOUNT_ID>
A identificação da conta de anúncios do cliente comercial
4052175343162067
<CUSTOMER_PAGE_ID>
A identificação da Página do Facebook do cliente comercial
1791141545170328
<CUSTOMER_DATASET_ID>
A identificação do conjunto de dados do cliente comercial
524126980791429
<FLOW_FINISH_TYPE>
Indica que o cliente concluiu o flow com sucesso.
Valores possíveis:
FINISH: indica a conclusão bem-sucedida do flow da API de Nuvem.
FINISH_ONLY_WABA: indica que o usuário concluiu o flow sem um número de telefone.
FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING: indica que o usuário concluiu o flow com um número do WhatsApp Business.
FINISH
Estrutura de flow abandonado:
{
  data: {
    current_step: '<CURRENT_STEP>',
  },
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'CANCEL',
}
Espaço reservado	Descrição	Valor de exemplo
<CURRENT_STEP>
Indica qual tela o cliente comercial estava visualizando quando abandonou o flow. Consulte Erros de flow de Cadastro Incorporado para ver uma descrição de cada etapa.
PHONE_NUMBER_SETUP
Erros denunciados pelo usuário
{
  data: {
    error_message: '<ERROR_MESSAGE>',
    error_id: '<ERROR_ID>',
    session_id: '<SESSION_ID>',
    timestamp: '<TIMESTAMP>',
  },
  type: 'WA_EMBEDDED_SIGNUP',
  event: 'CANCEL',
}
Espaço reservado	Descrição	Valor de exemplo
<ERROR_MESSAGE>
O texto de descrição do erro exibido para o cliente empresarial no flow de Cadastro Incorporado. Consulte Erros de flow de cadastro incorporado para ver uma lista de erros comuns.
Seu nome verificado não segue as diretrizes do WhatsApp. Edite esse nome e tente novamente.
<ERROR_ID>
A identificação do erro. Inclua esse número se entrar em contato com o suporte.
524126
<SESSION_ID>
A identificação única da sessão gerada pelo Cadastro Incorporado. Inclua essa identificação se entrar em contato com o suporte.
f34b51dab5e0498
<TIMESTAMP>
Registro de data e hora UNIX que indica quando o cliente empresarial usou o Cadastro Incorporado para relatar o erro. Inclua esse valor se entrar em contato com o suporte.
1746041036
Analise esse objeto no seu servidor para extrair e capturar a identificação de número de telefone do cliente e a identificação da conta do WhatsApp Business ou para determinar qual tela foi abandonada. Confira Telas de fluxo abandonadas para ver uma lista de valores <CURRENT_STEP> possíveis e as telas correspondentes.
A declaração try-catch no código acima tem duas declarações que podem ser usadas para fins de teste:
console.log('message event: ', data); // remove after testing

console.log('message event: ', event.data); // remove after testing
Essas declarações apenas despejam o número de telefone e as identificações da conta do WhatsApp Business retornados ou a string de tela abandonada no console do JavaScript. É possível deixar esse código e manter o console aberto para ver facilmente o que é retornado quando você testa o flow. No entanto, remova-o quando terminar o teste.
Retorno de ligação de resposta
Quando um cliente empresarial concluir o flow de Cadastro Incorporado, enviaremos um código de token trocável em uma resposta JavaScript para a janela que gerou o flow.
// Response callback
const fbLoginCallback = (response) => {
  if (response.authResponse) {
    const code = response.authResponse.code;
    console.log('response: ', code); // remove after testing
    // your code goes here
  } else {
    console.log('response: ', response); // remove after testing
    // your code goes here
  }
}
A função de retorno de ligação atribui o código do token trocável a uma constante code.
Adicione um código personalizado à declaração if-else que envia esse código ao seu servidor para que você possa trocá-lo pelo token comercial do cliente quando integrar o cliente comercial.
O código do token trocável tem um tempo de validade de 30 segundos. Por isso, faça a troca pelo token comercial do cliente antes que o código expire. Se você fizer o teste e apenas fizer um dump da resposta no seu console do JavaScript para, em seguida, trocar o código manualmente usando outro app, como o Postman, ou seu terminal com cURL, recomendamos que configure sua consulta de troca de token antes de começar a testar.
A declaração if-else no código acima tem duas declarações que podem ser usadas para fins de teste:
console.log('response: ', code); // remove after testing

console.log('response: ', response); // remove after testing
Essas declarações apenas despejam o código ou a resposta bruta no console do JavaScript. É possível deixar esse código e manter o console aberto para ver facilmente o que é retornado quando você testa o flow. No entanto, remova-o quando terminar o teste.
Método de inicialização e registro de retorno de ligação
Essa parte do código define um método que pode ser chamado por um evento onclick que registra o retorno de chamada da etapa anterior e inicia o fluxo de Cadastro Incorporado.
Adicione a identificação da configuração neste local.
// Launch method and callback registration
const launchWhatsAppSignup = () => {
  FB.login(fbLoginCallback, {
    config_id: '<CONFIGURATION_ID>', // your configuration ID goes here
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      setup: {},
    }
  });
}
Botão de iniciar
Essa parte do código define um botão que chama o método de inicialização da etapa anterior quando clicado pelo cliente empresarial.
<!-- Launch button --><button onclick="launchWhatsAppSignup()" style="background-color: #1877f2; border: 0; border-radius: 4px; color: #fff; cursor: pointer; font-family: Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; height: 40px; padding: 0 24px;">Login with Facebook</button>
Teste
Depois de concluir todas as etapas de implementação acima, você poderá testar o flow simulando um cliente empresarial com suas próprias credenciais da Meta. Qualquer pessoa adicionada como administrador ou desenvolvedor no seu app (no painel Painel de Apps > Funções do app > Funções) também poderá começar a testar o flow usando as próprias credenciais da Meta.
Como integrar clientes comerciais
O Cadastro Incorporado gera ativos para os clientes da sua empresa e concede acesso a esses ativos para seu app. No entanto, será necessário fazer uma série de chamadas de API para integrar completamente os novos clientes que concluíram o flow.
As chamadas de API necessárias para integrar clientes variam entre Parceiros de Soluções e Provedores/Parceiros de Tecnologia.


Integração de clientes empresariais como Provedor de Tecnologia ou Parceiro de Tecnologia
Updated: 14 de nov de 2025
Este documento descreve as etapas que os Provedores e Parceiros de Tecnologia devem executar para integrar novos clientes empresariais que concluíram o fluxo de Cadastro Incorporado.
Caso seja um Provedor ou Parceiro de Tecnologia, qualquer cliente empresarial que concluir sua implementação do fluxo de Cadastro Incorporado não poderá usar seu app para acessar ativos do WhatsApp ou enviar e receber mensagens (se estiver oferecendo serviços de mensagens) até que você conclua estas etapas.
O que será preciso
ID da WABA do cliente empresarial (retornado via registro de sessão ou solicitação de API)
ID do número de telefone comercial do cliente empresarial (retornado via registro de sessão ou solicitação de API)
ID do app (exibido na parte superior do Painel de Apps)
a chave secreta do app (exibida em Painel de Apps > Configurações do app > Básico)
Além disso, se você deseja testar os recursos de mensagens usando o número de telefone comercial do cliente, precisará de um número de telefone do WhatsApp que já possa enviar e receber mensagens de outros números do WhatsApp.
Execute todas as solicitações descritas abaixo usando solicitações de servidor para servidor. Não use solicitações do cliente.
Etapa 1: trocar o código do token por um token da empresa
Use o ponto de extremidade GET /oauth/access_token para trocar o código de token retornado pelo Cadastro Incorporado por um token de acesso de usuário do sistema de integração comercial ("token comercial").
Solicitação
curl --get 'https://graph.facebook.com/v21.0/oauth/access_token' \
-d 'client_id=<APP_ID>' \
-d 'client_secret=<APP_SECRET>' \
-d 'code=<CODE>'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<APP_ID>
Obrigatório.
O ID do app. Exibido na parte superior do Painel de Apps.
236484624622562
<APP_SECRET>
Obrigatório.
A chave secreta do app. Você pode encontrá-la em Painel de Apps > Chave secreta do app > Básico.
614fc2afde15eee07a26b2fe3eaee9b9
<CODE>
Obrigatório.
O código retornado pelo Cadastro Incorporado quando o cliente concluiu o fluxo com sucesso.
AQBhlXsctMxJYbwbrpybxlo9tLPGy-QAmjBJA03jxLos43wxlBlrYozY5C33BXJULd133cOJf_5y6EkJZYMrAmW-EMj3Wdap9-NUM2nS4s8tC-ES7slBhh6QpCFM7-SzpI-iqsjqTGyxbUUW3AeaEyLkeZFIkBgcQ_SOxo9HShm20SDR5_n7AT9ZJ5dcgpqBQykNT-pQ8V7Ne9-sr6RLAWtJMF7-Zx6ABudRcWIN53tUTtquDVNuq3lrco4BlVQAv-54tR83Ae0ODN9Uet6j-BVLuetXhQCM3sz9RdgedlbxkidMbkztvYX1j7baOrJxyLyYGWYgbnUrKRQKCtWTsO5ekIGFgtbpS8UPJNqV6j8E5XKPJ8QA7ZFqzkB0s2O__J5FrjHzc_rDo1EuRbw98ihHDzQnvuXeHapEyfhLDJct0A
Resposta
Caso a solicitação seja bem-sucedida:
<BUSINESS_TOKEN>
Parâmetros da resposta
Espaço reservado	Descrição	Valor de exemplo
<BUSINESS_TOKEN>
O token comercial do cliente.
EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn
Etapa 2: assinar webhooks na WABA do cliente
Use o ponto de extremidade POST/<WABA_ID>/subscribed_apps para assinar webhooks na WABA do cliente empresarial. Se quiser que os webhooks do cliente sejam enviados para um URL de retorno de ligação diferente do definido no seu app, você terá várias opções de substituição de webhook.
Solicitação
curl -X POST 'https://graph.facebook.com/<API_VERSION>/<WABA_ID>/subscribed_apps' \
-H 'Authorization: Bearer <ACCESS_TOKEN>'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<API_VERSION>
String
Opcional.
Versão da Graph API.
v25.0
<BUSINESS_TOKEN>String
Obrigatório.
O token da empresa do cliente.
EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn
<WABA_ID>String
Obrigatório.
Identificação da conta do WhatsApp Business.
102290129340398
Resposta
Caso a solicitação seja bem-sucedida:
{
  "success": true
}

Etapa 3: registrar o número de telefone do cliente
Use o ponto de extremidade POST /<BUSINESS_PHONE_NUMBER_ID>/register e cadastre o número de telefone comercial do cliente para uso com a API de Nuvem.
Solicitação
curl 'https://graph.facebook.com/v21.0/<BUSINESS_CUSTOMER_PHONE_NUMBER_ID>/register' \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer <BUSINESS_TOKEN>' \
-d '
{
  "messaging_product": "whatsapp",
  "pin": "<DESIRED_PIN>"
}'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<BUSINESS_CUSTOMER_PHONE_NUMBER_ID>String
Obrigatório.
Identificação do número de telefone comercial do cliente.
106540352242922
<BUSINESS_TOKEN>String
Obrigatório.
O token da empresa do cliente.
EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn
<DESIRED_PIN>String
Obrigatório.
Defina esse valor como um número de seis dígitos. Este será o PIN de confirmação em duas etapas do número de telefone comercial.
581063
Resposta
Caso a solicitação seja bem-sucedida:
{
  "success": true
}

Etapa 4: enviar uma mensagem de teste
Esta etapa é opcional.
Se você quiser testar os recursos de mensagens do número de telefone comercial do cliente comercial, envie uma mensagem para o número do cliente a partir do seu próprio número do WhatsApp (isso abrirá uma janela de atendimento ao cliente, permitindo responder com qualquer tipo de mensagem).
Depois, use o ponto de extremidade POST /<BUSINESS_PHONE_NUMBER_ID>/messages para enviar uma mensagem de texto como resposta.
Solicitação
curl 'https://graph.facebook.com/v21.0/<BUSINESS_CUSTOMER_PHONE_NUMBER_ID>/messages' \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer <BUSINESS_TOKEN>' \
-d '
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<WHATSAPP_USER_NUMBER>",
  "type": "text",
  "text": {
    "body": "<BODY_TEXT>"
  }
}'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<BODY_TEXT>String
Obrigatório.
Texto do corpo da mensagem. Compatível com URLs.
Tamanho máximo de 4.096 caracteres.
Message received, loud and clear!
<BUSINESS_CUSTOMER_PHONE_NUMBER_ID>String
Obrigatório.
Identificação do número de telefone comercial do cliente.
106540352242922
<BUSINESS_TOKEN>String
Obrigatório.
O token da empresa do cliente.
EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn
<WHATSAPP_USER_NUMBER>String
Obrigatório.
Seu número de telefone do WhatsApp que pode enviar e receber mensagens de outros números do WhatsApp.
Não pode ser um número de telefone comercial já registrado para uso com a API de Nuvem ou a API Local.
+16505551234
Resposta
Caso a solicitação seja bem-sucedida:
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "<WHATSAPP_USER_NUMBER>",
      "wa_id": "<WHATSAPP_USER_ID>"
    }
  ],
  "messages": [
    {
      "id": "<WHATSAPP_MESSAGE_ID>"
    }
  ]
}
Parâmetros da resposta
Espaço reservado	Descrição	Valor de exemplo
<WHATSAPP_MESSAGE_ID>
Identificação da mensagem do WhatsApp.
wamid.HBgLMTY0NjcwNDM1OTUVAgARGBI1RjQyNUE3NEYxMzAzMzQ5MkEA
<WHATSAPP_USER_ID>
Seu ID de usuário do WhatsApp.
16505551234
<WHATSAPP_USER_NUMBER>
Seu número de telefone do WhatsApp para o qual a mensagem foi enviada.
+16505551234
Se você conseguiu enviar e receber mensagens com sucesso usando o número de telefone comercial do cliente e se os webhooks das mensagens foram disparados descrevendo a mensagem inicial que você enviou, bem como o status de entrega da mensagem enviada em resposta, o número de telefone comercial do cliente está funcionando corretamente.
Etapa 5: instruir o cliente a adicionar uma forma de pagamento
Instrua seu cliente a usar o Gerenciador do WhatsApp para adicionar uma forma de pagamento. Você pode fornecer o seguinte link da Central de Ajuda:
https://www.facebook.com/business/help/488291839463771
Como alternativa, você pode instruir o cliente a:
acessar o painel do Gerenciador do WhatsApp > Visão geral em https://business.facebook.com/wa/manage/home/
clicar no botão Adicionar forma de pagamento
concluir o fluxo
Depois que o cliente adicionar uma forma de pagamento, ele estará totalmente integrado à plataforma do WhatsApp Business e poderá começar a usar seu app para acessar os ativos do WhatsApp, além de enviar e receber mensagens (se você estiver fornecendo esse serviço).


Integrar clientes empresariais como Parceiro de Soluções
Updated: 14 de nov de 2025
Este documento descreve as etapas que os Parceiros de Soluções devem executar para integrar novos clientes corporativos que concluíram o fluxo de Cadastro incorporado.
Caso você seja um Parceiro de Soluções, os clientes corporativos que concluírem sua implementação do fluxo de Cadastro incorporado não poderão usar seu app para acessar ativos do WhatsApp nem enviar e receber mensagens até que você conclua estas etapas.
O que será preciso
ID da WABA do cliente empresarial (retornado via registro de sessão ou solicitação de API)
ID do número de telefone comercial do cliente empresarial (retornado via registro de sessão ou solicitação de API)
ID do app (exibido na parte superior do Painel de Apps)
a chave secreta do app (exibida em Painel de Apps > Configurações do app > Básico)
a identificação da linha de crédito (exibida em Gerenciador de Negócios > Configurações do negócio > Informações da empresa ou retornada por meio de uma solicitação à API)
o token de acesso do usuário do sistema ("token do sistema")
Além disso, se você deseja testar os recursos de mensagens usando o número de telefone comercial do cliente, precisará de um número de telefone do WhatsApp que já possa enviar e receber mensagens de outros números do WhatsApp.
Execute todas as solicitações descritas abaixo usando solicitações de servidor para servidor. Não use solicitações do cliente.
Etapa 1: trocar o código do token por um token da empresa
Use o ponto de extremidade GET /oauth/access_token para trocar o código de token retornado pelo Cadastro incorporado por um token de acesso de usuário do sistema de integração comercial ("token comercial").
Solicitação
curl --get 'https://graph.facebook.com/v21.0/oauth/access_token' \
-d 'client_id=<APP_ID>' \
-d 'client_secret=<APP_SECRET>' \
-d 'code=<CODE>'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<APP_ID>
Obrigatório.
O ID do app. Exibido na parte superior do Painel de Apps.
236484624622562
<APP_SECRET>
Obrigatório.
A chave secreta do app. Você pode encontrá-la em Painel de Apps > Chave secreta do app > Básico.
614fc2afde15eee07a26b2fe3eaee9b9
<CODE>
Obrigatório.
O código retornado pelo Cadastro incorporado quando o cliente concluiu o fluxo com sucesso.
AQBhlXsctMxJYbwbrpybxlo9tLPGy-QAmjBJA03jxLos43wxlBlrYozY5C33BXJULd133cOJf_5y6EkJZYMrAmW-EMj3Wdap9-NUM2nS4s8tC-ES7slBhh6QpCFM7-SzpI-iqsjqTGyxbUUW3AeaEyLkeZFIkBgcQ_SOxo9HShm20SDR5_n7AT9ZJ5dcgpqBQykNT-pQ8V7Ne9-sr6RLAWtJMF7-Zx6ABudRcWIN53tUTtquDVNuq3lrco4BlVQAv-54tR83Ae0ODN9Uet6j-BVLuetXhQCM3sz9RdgedlbxkidMbkztvYX1j7baOrJxyLyYGWYgbnUrKRQKCtWTsO5ekIGFgtbpS8UPJNqV6j8E5XKPJ8QA7ZFqzkB0s2O__J5FrjHzc_rDo1EuRbw98ihHDzQnvuXeHapEyfhLDJct0A
Resposta
Caso a solicitação seja bem-sucedida:
<BUSINESS_TOKEN>
Parâmetros da resposta
Espaço reservado	Descrição	Valor de exemplo
<BUSINESS_TOKEN>
O token comercial do cliente.
EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn
Etapa 2: assinar webhooks na WABA do cliente
Use o ponto de extremidade POST /<WABA_ID>/subscribed_apps para assinar webhooks na WABA do cliente comercial. Se quiser que os webhooks do cliente sejam enviados para um URL de retorno de ligação diferente do definido no seu app, você terá várias opções de substituição de webhook.
Solicitação
curl -X POST 'https://graph.facebook.com/<API_VERSION>/<WABA_ID>/subscribed_apps' \
-H 'Authorization: Bearer <ACCESS_TOKEN>'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<BUSINESS_TOKEN>
Obrigatório.
O token comercial do cliente.
EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn
<WABA_ID>
Obrigatório.
A identificação da conta do WhatsApp Business (WABA, pelas iniciais em inglês) do cliente.
102290129340398
Resposta
Caso a solicitação seja bem-sucedida:
{
  "success": true
}

Etapa 3: compartilhar sua linha de crédito com o cliente
No momento, estamos testando novos métodos para compartilhar sua linha de crédito com clientes empresariais integrados. Essas etapas substituirão este passo no futuro. Se você quiser implementá-las agora, consulte Método alternativo para compartilhar sua linha de crédito.
Observação: se você estiver usando a API abaixo, ou seja, whatsapp_credit_sharing_and_attach, será necessário adicionar o usuário do sistema às contas compartilhadas do WhatsApp Business como pré-requisito. Consulte este documento para ver as etapas do processo.
Depois de adicionar o usuário do sistema à conta do WhatsApp Business, use o ponto de extremidade POST /<EXTENDED_CREDIT_LINE_ID>/whatsapp_credit_sharing_and_attach para compartilhar sua linha de crédito com um cliente empresarial integrado.
Solicitação
curl -X POST 'https://graph.facebook.com/<API_VERSION>/<EXTENDED_CREDIT_LINE_ID>/whatsapp_credit_sharing_and_attach?waba_currency=<CUSTOMER_BUSINESS_CURRENCY>&waba_id=<CUSTOMER_WABA_ID>' \
-H 'Authorization: Bearer <SYSTEM_TOKEN>'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<CUSTOMER_BUSINESS_CURRENCY>
Obrigatório.
A moeda da empresa, representada por um código de três letras. Valores compatíveis:
AUD
EUR
GBP
IDR
INR
USD
Esta moeda é usada para fins de faturamento e corresponde às taxas de precificação.
USD
<CUSTOMER_WABA_ID>
Obrigatório.
A identificação da conta do WhatsApp Business (WABA, pelas iniciais em inglês) do cliente.
102290129340398
<EXTENDED_CREDIT_LINE_ID>
Obrigatório.
A identificação da sua linha de crédito estendida.
1972385232742146
<SYSTEM_TOKEN>
Obrigatório.
Seu token do sistema.
EAAAN6tcBzAUBOZC82CW7iR2LiaZBwUHS4Y7FDtQxRUPy1PHZClDGZBZCgWdrTisgMjpFKiZAi1FBBQNO2IqZBAzdZAA16lmUs0XgRcCf6z1LLxQCgLXDEpg80d41UZBt1FKJZCqJFcTYXJvSMeHLvOdZwFyZBrV9ZPHZASSqxDZBUZASyFdzjiy2A1sippEsF4DVV5W2IlkOSr2LrMLuYoNMYBy8xQczzOKDOMccqHEZD
Resposta
Caso a solicitação seja bem-sucedida:
{
  "allocation_config_id": "<ALLOCATION_CONFIGURATION_ID>",
  "waba_id": "<CUSTOMER_WABA_ID>"
}
Parâmetros da resposta
Espaço reservado	Descrição	Valor de exemplo
<ALLOCATION_CONFIGURATION_ID>
ID de configuração para alocação da linha de crédito estendida.
Salve esse ID para verificar se a linha de crédito foi realmente compartilhada com o cliente.
58501441721238
<CUSTOMER_WABA_ID>
A identificação da conta do WhatsApp Business (WABA, pelas iniciais em inglês) do cliente.
102290129340398
Etapa 4: registrar o número de telefone do cliente
Use o ponto de extremidade POST /<BUSINESS_PHONE_NUMBER_ID>/register para registrar o número de telefone comercial do cliente para uso com a API de Nuvem.
Solicitação
curl 'https://graph.facebook.com/v21.0/<BUSINESS_PHONE_NUMBER_ID>/register' \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer <BUSINESS_TOKEN>' \
-d '
{
  "messaging_product": "whatsapp",
  "pin": "<DESIRED_PIN>"
}'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<BUSINESS_PHONE_NUMBER_ID>
Obrigatório.
A identificação do número de telefone comercial do cliente retornada.
106540352242922
<BUSINESS_TOKEN>
Obrigatório.
O token da empresa do cliente.
EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn
<DESIRED_PIN>
Obrigatório.
Defina esse valor como um número de seis dígitos. Este será o PIN de confirmação em duas etapas do número de telefone comercial.
581063
Resposta
Caso a solicitação seja bem-sucedida:
{
  "success": true
}

Etapa 5: enviar uma mensagem de teste
Esta etapa é opcional.
Se você quiser testar os recursos de mensagens do número de telefone comercial do cliente comercial, envie uma mensagem para o número do cliente a partir do seu próprio número do WhatsApp (isso abrirá uma janela de atendimento ao cliente, permitindo responder com qualquer tipo de mensagem).
Depois, use o ponto de extremidade POST /<BUSINESS_PHONE_NUMBER_ID>/messages para enviar uma mensagem de texto como resposta.
Solicitação
curl 'https://graph.facebook.com/v21.0/<BUSINESS_PHONE_NUMBER_ID>/messages' \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer <BUSINESS_TOKEN>' \
-d '
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "<WHATSAPP_USER_NUMBER>",
  "type": "text",
  "text": {
    "body": "<BODY_TEXT>"
  }
}'
Parâmetros de solicitação
Espaço reservado	Descrição	Valor de exemplo
<BODY_TEXT>
Obrigatório.
Texto do corpo da mensagem. Compatível com URLs.
Tamanho máximo de 4096 caracteres.
Message received, loud and clear!
<BUSINESS_PHONE_NUMBER_ID>
Obrigatório.
A identificação do número de telefone comercial do cliente.
106540352242922
<BUSINESS_TOKEN>
Obrigatório.
O token da empresa do cliente.
EAAAN6tcBzAUBOwtDtTfmZCJ9n3FHpSDcDTH86ekf89XnnMZAtaitMUysPDE7LES3CXkA4MmbKCghdQeU1boHr0QZA05SShiILcoUy7ZAb2GE7hrUEpYHKLDuP2sYZCURkZCHGEvEGjScGLHzC4KDm8tq2slt4BsOQE1HHX8DzHahdT51MRDqBw0YaeZByrVFZkVAoVTxXUtuKgDDdrmJQXMnI4jqJYetsZCP1efj5ygGscZBm4OvvuCYB039ZAFlyNn
<WHATSAPP_USER_NUMBER>
Obrigatório.
Seu número de telefone do WhatsApp que pode enviar e receber mensagens de outros números do WhatsApp.
Não pode ser um número de telefone comercial já registrado para uso com a API de Nuvem ou a API Local.
+16505551234
Resposta
Caso a solicitação seja bem-sucedida:
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "<WHATSAPP_USER_NUMBER>",
      "wa_id": "<WHATSAPP_USER_ID>"
    }
  ],
  "messages": [
    {
      "id": "<WHATSAPP_MESSAGE_ID>"
    }
  ]
}
Parâmetros da resposta
Espaço reservado	Descrição	Valor de exemplo
<WHATSAPP_MESSAGE_ID>
ID da mensagem do WhatsApp.
wamid.HBgLMTY0NjcwNDM1OTUVAgARGBI1RjQyNUE3NEYxMzAzMzQ5MkEA
<WHATSAPP_USER_ID>
Seu número de identificação do usuário do WhatsApp.
16505551234
<WHATSAPP_USER_NUMBER>
Seu número de telefone do WhatsApp para o qual a mensagem foi enviada.
+16505551234
Se você conseguiu enviar e receber mensagens com sucesso usando o número de telefone comercial do cliente e se os webhooks das mensagens foram disparados descrevendo a mensagem inicial que você enviou, bem como o status de entrega da mensagem enviada em resposta, o número de telefone comercial do cliente está funcionando corretamente.