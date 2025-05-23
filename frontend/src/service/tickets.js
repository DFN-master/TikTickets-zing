import request from 'src/service/request'

// Consultar tickets com paginação
export const ConsultarTickets = async (params) => {
  const queryParams = new URLSearchParams()
  // Adicionar apenas parâmetros não nulos
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key + '[]', v))
      } else {
        queryParams.append(key, value)
      }
    }
  })

  // Adicionar timestamp para evitar cache
  queryParams.append('_t', new Date().getTime())

  return request({
    url: `/tickets?${queryParams.toString()}`,
    method: 'get',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0'
    }
  })
}

// Atualizar status do ticket
export const AtualizarStatusTicket = async (ticketId, status) => {
  return request({
    url: `/tickets/${ticketId}`,
    method: 'put',
    data: { status }
  })
}

// Criar novo ticket
export const CriarTicket = async (data) => {
  return request({
    url: '/tickets',
    method: 'post',
    data
  })
}

// Deletar ticket
export const DeletarTicket = async (ticketId) => {
  return request({
    url: `/tickets/${ticketId}`,
    method: 'delete'
  })
}

// Buscar ticket por ID
export const BuscarTicketPorId = async (ticketId) => {
  return request({
    url: `/tickets/${ticketId}`,
    method: 'get'
  })
}

export function ConsultarDadosTicket (params) {
  // Parâmetros permitidos e necessários
  const allowedParams = {
    count: params.count,
    profilePicUrl: params.profilePicUrl,
    name: params.name,
    username: params.username,
    queue: params.queue,
    'whatsapp[id]': params.whatsapp?.id,
    'whatsapp[name]': params.whatsapp?.name,
    id: params.id,
    status: params.status,
    contactId: params.contactId,
    userId: params.userId,
    createdAt: params.createdAt,
    updatedAt: params.updatedAt,
    whatsappId: params.whatsappId
  }

  // Criar URLSearchParams e adicionar apenas os parâmetros permitidos
  const queryParams = new URLSearchParams()
  Object.entries(allowedParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value)
    }
  })

  return request({
    url: `/tickets/${params.id}?${queryParams.toString()}`,
    method: 'get'
  })
}

export function ConsultarLogsTicket (params) {
  return request({
    url: `/tickets/${params.ticketId}/logs`,
    method: 'get',
    params
  })
}

export function AtualizarTicket (ticketId, data) {
  return request({
    url: `/tickets/${ticketId}`,
    method: 'put',
    data
  })
}

export function LocalizarMensagens (params) {
  const queryParams = new URLSearchParams()
  if (params.ticketId) queryParams.append('ticketId', params.ticketId)
  if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber)
  if (params.pageSize) queryParams.append('pageSize', params.pageSize || 20)
  return request({
    url: `/messages/${params.ticketId}?${queryParams.toString()}`,
    method: 'get',
    headers: {
      'Cache-Control': 'max-age=300',
      Pragma: 'no-cache',
      'If-None-Match': params.etag || '',
      'X-Priority': params.pageNumber === 1 ? 'high' : 'normal'
    }
  })
}

export function EnviarMensagemTexto (ticketId, data) {
  return request({
    url: `/messages/${ticketId}`,
    method: 'post',
    data,
    // Não cachear requisições POST
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}

export function EncaminharMensagem (messages, contato) {
  const data = {
    messages,
    contact: contato
  }
  return request({
    url: '/forward-messages/',
    method: 'post',
    data
  })
}

export function DeletarMensagem (mensagem) {
  return request({
    url: `/messages/${mensagem.messageId}`,
    method: 'delete',
    data: mensagem
  })
}

export function EditarMensagem (mensagem) {
  return request({
    url: `/messages/edit/${mensagem.messageId}`,
    method: 'post',
    data: mensagem
  })
}

// Sincronizar mensagens do ticket
export const SincronizarMensagensTicket = async (ticketId) => {
  return request({
    url: `/tickets/${ticketId}/sync`,
    method: 'post'
  })
}
