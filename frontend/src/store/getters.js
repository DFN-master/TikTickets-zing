const getters = {
  notifications: state => state.notifications.notifications,
  notifications_p: state => state.notifications.notifications_p,
  tickets: state => state.atendimentoTicket.tickets, // Usar tickets já ordenados
  mensagensTicket: state => state.atendimentoTicket.mensagens,
  ticketFocado: state => state.atendimentoTicket.ticketFocado,
  hasMore: state => state.atendimentoTicket.hasMore,
  whatsapps: state => state.whatsapp.whatsApps,
  isSuporte: state => state.user.isSuporte,
  isAdmin: state => state.user.isAdmin
}

export default getters
