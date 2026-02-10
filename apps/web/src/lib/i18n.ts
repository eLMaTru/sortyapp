export type Locale = 'es' | 'en';

const translations = {
  // ───────── Nav / Global ─────────
  'nav.rooms': { es: 'Salas', en: 'Rooms' },
  'nav.wallet': { es: 'Billetera', en: 'Wallet' },
  'nav.admin': { es: 'Admin', en: 'Admin' },
  'nav.login': { es: 'Iniciar Sesión', en: 'Log in' },
  'nav.signup': { es: 'Registrate', en: 'Sign up' },
  'nav.logout': { es: 'Cerrar Sesión', en: 'Logout' },

  // ───────── Home ─────────
  'home.title': { es: 'Bienvenido a SORTYAPP', en: 'Welcome to SORTYAPP' },
  'home.subtitle': {
    es: 'Participa en salas de sorteo con créditos. Prueba el modo demo gratis, o usa créditos reales.',
    en: 'Participate in draw rooms with credits. Try demo mode for free, or use real credits for real results.',
  },
  'home.browse': { es: 'Ver Salas', en: 'Browse Rooms' },
  'home.myWallet': { es: 'Mi Billetera', en: 'My Wallet' },
  'home.getStarted': { es: 'Empezar', en: 'Get Started' },
  'home.demoTitle': { es: 'Modo Demo', en: 'Demo Mode' },
  'home.demoDesc': {
    es: 'Comienza con 10,000 créditos demo. Prueba las salas sin riesgo antes de usar créditos reales.',
    en: 'Start with 10,000 demo credits. Try rooms risk-free before using real credits.',
  },
  'home.fairTitle': { es: 'Sorteos Justos', en: 'Fair Draws' },
  'home.fairDesc': {
    es: 'Cada sorteo usa verificación commit-reveal. Revisa las semillas y el hash después de completar.',
    en: 'Every draw uses commit-reveal verification. Check the seeds and hash after completion.',
  },
  'home.instantTitle': { es: 'Resultados Instantáneos', en: 'Instant Results' },
  'home.instantDesc': {
    es: 'Las salas se llenan, comienza una cuenta regresiva de 15 segundos, y el resultado se determina automáticamente.',
    en: 'Rooms fill up, a 5-second countdown begins, and the result is determined automatically.',
  },
  'home.demoCta': {
    es: 'Empieza en Demo (10,000 créditos gratis)',
    en: 'Start in Demo (10,000 free credits)',
  },

  // ───────── Login ─────────
  'login.title': { es: 'Iniciar Sesión', en: 'Log in' },
  'login.email': { es: 'Correo Electrónico', en: 'Email' },
  'login.password': { es: 'Contraseña', en: 'Password' },
  'login.submit': { es: 'Iniciar Sesión', en: 'Log in' },
  'login.loading': { es: 'Iniciando sesión...', en: 'Logging in...' },
  'login.noAccount': { es: '¿No tienes cuenta?', en: 'No account?' },
  'login.signupLink': { es: 'Registrate', en: 'Sign up' },

  // ───────── Register ─────────
  'register.title': { es: 'Crear Cuenta', en: 'Create Account' },
  'register.email': { es: 'Correo Electrónico', en: 'Email' },
  'register.username': { es: 'Nombre de Usuario', en: 'Username' },
  'register.usernameHint': {
    es: '3-20 caracteres, letras, números, guion bajo',
    en: '3-20 characters, letters, numbers, underscores',
  },
  'register.password': { es: 'Contraseña', en: 'Password' },
  'register.referral': { es: 'Código de Referido (opcional)', en: 'Referral Code (optional)' },
  'register.submit': { es: 'Registrate', en: 'Sign up' },
  'register.loading': { es: 'Creando cuenta...', en: 'Creating account...' },
  'register.hasAccount': { es: '¿Ya tienes cuenta?', en: 'Already have an account?' },
  'register.loginLink': { es: 'Iniciar Sesión', en: 'Log in' },

  // ───────── Dashboard ─────────
  'dash.title': { es: 'Panel', en: 'Dashboard' },
  'dash.balance': { es: 'Balance', en: 'Balance' },
  'dash.demoBalance': { es: 'Balance Demo', en: 'Demo Balance' },
  'dash.realBalance': { es: 'Balance Real', en: 'Real Balance' },
  'dash.referralCode': { es: 'Código de Referido', en: 'Referral Code' },
  'dash.referralHint': {
    es: 'Comparte para ganar $5 cuando depositen',
    en: 'Share to earn $5 when they deposit',
  },
  'dash.browseRooms': { es: 'Ver Salas', en: 'Browse Rooms' },
  'dash.recentTx': { es: 'Transacciones Recientes', en: 'Recent Transactions' },
  'dash.noTx': { es: 'Sin transacciones aún.', en: 'No transactions yet.' },
  'dash.pleaseLogin': { es: 'Por favor inicia sesión.', en: 'Please log in.' },

  // ───────── Rooms ─────────
  'rooms.title': { es: 'Salas', en: 'Rooms' },
  'rooms.demo': { es: 'Salas Demo', en: 'Demo Rooms' },
  'rooms.real': { es: 'Salas Reales', en: 'Real Rooms' },
  'rooms.all': { es: 'Todas', en: 'All' },
  'rooms.loading': { es: 'Cargando salas...', en: 'Loading rooms...' },
  'rooms.none': { es: 'No se encontraron salas.', en: 'No rooms found.' },
  'rooms.entry': { es: 'entrada', en: 'entry' },
  'rooms.slots': { es: 'lugares', en: 'slots' },
  'rooms.spotsLeft': { es: 'lugar(es) disponible(s)', en: 'spot(s) left' },
  'rooms.demoBanner': {
    es: 'Estos son créditos de práctica. Cambia a Real para jugar con dinero real.',
    en: 'These are practice credits. Switch to Real to play for real money.',
  },
  'rooms.winner': { es: 'Seleccionado', en: 'Selected' },

  // ───────── Room Detail ─────────
  'room.title': { es: 'Sala', en: 'Room' },
  'room.mode': { es: 'modo', en: 'mode' },
  'room.participate': { es: 'Participar', en: 'Participate' },
  'room.joining': { es: 'Uniéndose...', en: 'Joining...' },
  'room.joined': { es: 'Estás participando en este sorteo.', en: 'You are participating in this draw.' },
  'room.participants': { es: 'Jugadores', en: 'Participants' },
  'room.slotOpen': { es: 'Lugar - Disponible', en: 'Slot - Open' },
  'room.drawDetails': { es: 'Detalles del Sorteo', en: 'Draw Details' },
  'room.pool': { es: 'Pozo', en: 'Pool' },
  'room.fee': { es: 'Comisión', en: 'Fee' },
  'room.prize': { es: 'Premio', en: 'Prize' },
  'room.created': { es: 'Creado', en: 'Created' },
  'room.selectedUser': { es: 'Usuario Seleccionado', en: 'Selected User' },
  'room.drawingIn': { es: 'El sorteo inicia en', en: 'Drawing in' },
  'room.fairness': { es: 'Verificación de Justicia', en: 'Fairness Verification' },
  'room.commitHash': { es: 'Hash de Compromiso', en: 'Commit Hash' },
  'room.publicSeed': { es: 'Semilla Pública', en: 'Public Seed' },
  'room.serverSeed': { es: 'Semilla del Servidor (revelada)', en: 'Server Seed (revealed)' },
  'room.verifyHint': {
    es: 'Verificar: SHA256(serverSeed + publicSeed) debe ser igual al hash de compromiso.',
    en: 'Verify: SHA256(serverSeed + publicSeed) should equal the commit hash.',
  },
  'room.loading': { es: 'Cargando sorteo...', en: 'Loading draw...' },
  'room.notFound': { es: 'Sorteo no encontrado.', en: 'Draw not found.' },
  'room.full': { es: 'Esta sala ya está llena.', en: 'This room is already full.' },
  'room.browseOther': { es: 'Ver otras salas disponibles', en: 'Browse other available rooms' },
  'room.insufficientBalance': {
    es: 'No tienes suficientes créditos. Necesitas ${needed} SC pero tienes ${balance} SC.',
    en: 'Not enough credits. You need ${needed} SC but have ${balance} SC.',
  },
  'room.rechargeLink': { es: 'Recargar créditos', en: 'Recharge credits' },
  'room.playAgain': { es: 'Jugar de Nuevo', en: 'Play Again' },
  'room.searching': { es: 'Buscando sala...', en: 'Searching room...' },
  'rooms.noMatchToast': {
    es: 'No hay salas abiertas de ese tipo. Aquí puedes ver todas las disponibles.',
    en: 'No open rooms of that type found. Here you can see all available rooms.',
  },

  // ───────── Confirm Modal ─────────
  'confirm.title': { es: 'Confirmar Participación', en: 'Confirm Participation' },
  'confirm.message': {
    es: 'Estás a punto de unirte a este sorteo por ${amount} (${credits} créditos). Una vez que te unas, no puedes salir o cancelar. ¿Deseas continuar?',
    en: 'You are about to join this draw for ${amount} (${credits} credits). Once you join, you cannot exit or cancel. Do you want to proceed?',
  },
  'confirm.yes': { es: 'Sí, Participar', en: 'Yes, Participate' },
  'confirm.cancel': { es: 'Cancelar', en: 'Cancel' },

  // ───────── Wallet ─────────
  'wallet.title': { es: 'Billetera', en: 'Wallet' },
  'wallet.balance': { es: 'Balance', en: 'Balance' },
  'wallet.credits': { es: 'créditos', en: 'credits' },
  'wallet.withdraw': { es: 'Solicitar Retiro', en: 'Request Withdrawal' },
  'wallet.amount': { es: 'Monto en USDC', en: 'Amount in USDC' },
  'wallet.minAmount': { es: 'Mínimo 10 USDC', en: 'Min 10 USDC' },
  'wallet.fee': { es: 'Comisión', en: 'Fee' },
  'wallet.net': { es: 'Neto', en: 'Net' },
  'wallet.walletAddress': { es: 'Dirección de Wallet (Polygon)', en: 'Wallet Address (Polygon)' },
  'wallet.walletHint': {
    es: 'Dirección donde recibirás USDC en la red Polygon (ej. MetaMask, Trust Wallet)',
    en: 'Address where you will receive USDC on the Polygon network (e.g. MetaMask, Trust Wallet)',
  },
  'wallet.invalidAddress': {
    es: 'Dirección inválida. Debe ser una dirección Polygon válida (0x + 40 caracteres hex)',
    en: 'Invalid address. Must be a valid Polygon address (0x + 40 hex characters)',
  },
  'wallet.validAddress': { es: 'Dirección válida', en: 'Valid address' },
  'wallet.savedAddress': { es: 'Guardada', en: 'Saved' },
  'wallet.submitWithdraw': { es: 'Solicitar Retiro', en: 'Request Withdrawal' },
  'wallet.processing': { es: 'Procesando...', en: 'Processing...' },
  'wallet.demoWarning': {
    es: 'Los créditos demo no se pueden retirar. Cambia al modo Real para gestionar créditos reales.',
    en: 'Demo credits cannot be withdrawn. Switch to Real mode to manage real credits.',
  },
  'wallet.transactions': { es: 'Transacciones', en: 'Transactions' },
  'wallet.withdrawals': { es: 'Retiros', en: 'Withdrawals' },
  'wallet.noTx': { es: 'Sin transacciones aún.', en: 'No transactions yet.' },
  'wallet.noWithdrawals': { es: 'Sin retiros aún.', en: 'No withdrawals yet.' },
  'wallet.cancel': { es: 'Cancelar', en: 'Cancel' },
  'wallet.cancelling': { es: 'Cancelando...', en: 'Cancelling...' },
  'wallet.cancelled': { es: 'Retiro cancelado y saldo reembolsado.', en: 'Withdrawal cancelled and balance refunded.' },
  'wallet.referralTitle': { es: 'Tu Código de Referido', en: 'Your Referral Code' },
  'wallet.referralHint': {
    es: 'Comparte este link. Cuando alguien se registre y haga su primer depósito real, ambos ganan $5 en créditos reales.',
    en: 'Share this link. When someone signs up and makes their first real deposit, you both earn $5 in real credits.',
  },
  'wallet.copyLink': { es: 'Copiar', en: 'Copy' },
  'wallet.copied': { es: 'Copiado!', en: 'Copied!' },

  // ───────── Deposit (Recharge) ─────────
  'deposit.title': { es: 'Recargar Créditos', en: 'Recharge Credits' },
  'deposit.subtitle': {
    es: 'Selecciona un método de pago, envía el monto y reporta tu pago. Un admin lo verificará.',
    en: 'Select a payment method, send the amount, and report your payment. An admin will verify it.',
  },
  'deposit.selectMethod': { es: 'Seleccionar Método', en: 'Select Method' },
  'deposit.amount': { es: 'Monto (USD)', en: 'Amount (USD)' },
  'deposit.min': { es: 'Mínimo $5', en: 'Min $5' },
  'deposit.max': { es: 'Máximo $100', en: 'Max $100' },
  'deposit.dailyLimit': { es: 'Límite diario: $300', en: 'Daily limit: $300' },
  'deposit.instructions': { es: 'Instrucciones', en: 'Instructions' },
  'deposit.code': { es: 'Tu Código de Depósito', en: 'Your Deposit Code' },
  'deposit.codeHint': {
    es: 'Incluye este código en el memo/nota de tu pago para que podamos identificarlo.',
    en: 'Include this code in the memo/note of your payment so we can identify it.',
  },
  'deposit.reference': { es: 'Referencia de Pago (opcional)', en: 'Payment Reference (optional)' },
  'deposit.referenceHint': {
    es: 'Número de transacción, confirmación o captura de pantalla',
    en: 'Transaction number, confirmation or screenshot',
  },
  'deposit.submit': { es: 'Reportar Pago', en: 'Report Payment' },
  'deposit.submitting': { es: 'Enviando...', en: 'Submitting...' },
  'deposit.success': {
    es: 'Solicitud de depósito enviada. Te notificaremos cuando sea aprobada.',
    en: 'Deposit request submitted. We will notify you when it is approved.',
  },
  'deposit.creditsPreview': { es: 'Recibirás', en: 'You will receive' },
  'deposit.myRequests': { es: 'Mis Solicitudes', en: 'My Requests' },
  'deposit.noRequests': { es: 'Sin solicitudes aún.', en: 'No requests yet.' },
  'deposit.status.PENDING': { es: 'Pendiente', en: 'Pending' },
  'deposit.status.APPROVED': { es: 'Aprobado', en: 'Approved' },
  'deposit.status.REJECTED': { es: 'Rechazado', en: 'Rejected' },
  'deposit.status.EXPIRED': { es: 'Expirado', en: 'Expired' },
  'deposit.back': { es: 'Volver', en: 'Back' },
  'deposit.newRequest': { es: 'Nueva Recarga', en: 'New Recharge' },
  'deposit.loginRequired': { es: 'Inicia sesión para recargar créditos.', en: 'Log in to recharge credits.' },

  // ───────── Admin ─────────
  'admin.title': { es: 'Panel de Admin', en: 'Admin Panel' },
  'admin.users': { es: 'Usuarios', en: 'Users' },
  'admin.withdrawals': { es: 'Retiros', en: 'Withdrawals' },
  'admin.templates': { es: 'Plantillas', en: 'Templates' },
  'admin.draws': { es: 'Sorteos', en: 'Draws' },
  'admin.simulateDeposit': { es: 'Simular Depósito', en: 'Simulate Deposit' },
  'admin.userId': { es: 'ID de Usuario', en: 'User ID' },
  'admin.selectUser': { es: 'Seleccionar usuario', en: 'Select user' },
  'admin.deposit': { es: 'Depositar', en: 'Deposit' },
  'admin.noPending': { es: 'Sin retiros pendientes.', en: 'No pending withdrawals.' },
  'admin.enterTxHash': { es: 'Ingresa hash de transacción', en: 'Enter tx hash' },
  'admin.approve': { es: 'Aprobar', en: 'Approve' },
  'admin.ensureDraws': { es: 'Asegurar Salas Abiertas', en: 'Ensure Open Draws' },
  'admin.accessDenied': { es: 'Acceso denegado. Solo admin.', en: 'Access denied. Admin only.' },
  'admin.slotsEntry': { es: 'lugares · $${entry} entrada', en: 'slots · $${entry} entry' },
  'admin.requiresDeposit': { es: 'Requiere depósito', en: 'Requires deposit' },
  'admin.enabled': { es: 'Activa', en: 'Enabled' },
  'admin.disabled': { es: 'Desactivada', en: 'Disabled' },
  'admin.filled': { es: 'llenos', en: 'filled' },
  'admin.createTemplate': { es: 'Crear Plantilla', en: 'Create Template' },
  'admin.slots': { es: 'Lugares', en: 'Slots' },
  'admin.entryAmount': { es: 'Entrada (USDC)', en: 'Entry (USDC)' },
  'admin.create': { es: 'Crear', en: 'Create' },
  'admin.forceFinalize': { es: 'Forzar', en: 'Force' },
  'admin.drawMode': { es: 'Modo', en: 'Mode' },
  'admin.noDraws': { es: 'Sin sorteos.', en: 'No draws.' },
  'admin.templateCreated': { es: 'Plantilla creada', en: 'Template created' },
  'admin.templateUpdated': { es: 'Plantilla actualizada', en: 'Template updated' },
  'admin.drawFinalized': { es: 'Sorteo finalizado', en: 'Draw finalized' },
  'admin.deposits': { es: 'Depósitos', en: 'Deposits' },
  'admin.noDeposits': { es: 'Sin depósitos pendientes.', en: 'No pending deposits.' },
  'admin.depositApproved': { es: 'Depósito aprobado', en: 'Deposit approved' },
  'admin.depositRejected': { es: 'Depósito rechazado', en: 'Deposit rejected' },
  'admin.reject': { es: 'Rechazar', en: 'Reject' },
  'admin.adminNote': { es: 'Nota (opcional)', en: 'Note (optional)' },

  // ───────── Chat ─────────
  'chat.title': { es: 'Chat', en: 'Chat' },
  'chat.placeholder': { es: 'Escribe un mensaje...', en: 'Type a message...' },
  'chat.send': { es: 'Enviar', en: 'Send' },
  'chat.noMessages': { es: 'Sin mensajes aún. Sé el primero!', en: 'No messages yet. Be the first!' },
  'chat.loginToChat': { es: 'Inicia sesión para chatear', en: 'Log in to chat' },
  'chat.onlyParticipants': { es: 'Solo los participantes pueden chatear', en: 'Only participants can chat' },
  'chat.closed': { es: 'El chat ha terminado', en: 'Chat has ended' },
  'chat.remaining': { es: 'msgs restantes', en: 'msgs remaining' },

  // ───────── Rankings ─────────
  'rankings.title': { es: 'Clasificaciones', en: 'Rankings' },
  'rankings.rank': { es: '#', en: '#' },
  'rankings.player': { es: 'Jugador', en: 'Player' },
  'rankings.wins': { es: 'Victorias', en: 'Wins' },
  'rankings.plays': { es: 'Partidas', en: 'Plays' },
  'rankings.winRate': { es: '% Victorias', en: 'Win Rate' },
  'rankings.totalWon': { es: 'Total Ganado', en: 'Total Won' },
  'rankings.noData': { es: 'Sin datos de clasificación aún.', en: 'No ranking data yet.' },
  'rankings.demoFallback': { es: 'Mostrando datos de práctica. Los rankings reales se actualizarán cuando haya partidas reales.', en: 'Showing practice data. Real rankings will update when real games are played.' },

  // ───────── Admin Metrics ─────────
  'admin.metrics': { es: 'Métricas', en: 'Metrics' },
  'admin.totalUsers': { es: 'Usuarios Totales', en: 'Total Users' },
  'admin.drawsCompleted': { es: 'Sorteos Completados', en: 'Draws Completed' },
  'admin.drawsOpen': { es: 'Sorteos Abiertos', en: 'Draws Open' },
  'admin.totalSCSpent': { es: 'SC Apostados', en: 'SC Wagered' },
  'admin.totalFeeSC': { es: 'SC Comisiones', en: 'SC Fees Earned' },
  'admin.pendingWithdrawals': { es: 'Retiros Pendientes', en: 'Pending Withdrawals' },
  'admin.sentWithdrawals': { es: 'Retiros Enviados', en: 'Sent Withdrawals' },
  'admin.recentDraws': { es: 'Sorteos (24h)', en: 'Draws (24h)' },
  'admin.recentUsers': { es: 'Nuevos Usuarios (24h)', en: 'New Users (24h)' },

  // ───────── Ticker ─────────
  'ticker.won': { es: 'ganó', en: 'won' },
  'ticker.wins': { es: 'victorias', en: 'wins' },
  'ticker.topPlayer': { es: 'Top jugador', en: 'Top player' },

  // ───────── Real Mode Modal ─────────
  'realMode.title': { es: 'Cambiar a Modo Real', en: 'Switch to Real Mode' },
  'realMode.message': {
    es: 'En el modo Real usarás tus créditos reales (SC). Las entradas a sorteos y cualquier pérdida NO son reversibles. Asegúrate de estar listo antes de continuar.',
    en: 'In Real mode you will use your real credits (SC). Draw entries and any losses are NOT reversible. Make sure you are ready before continuing.',
  },
  'realMode.confirm': { es: 'Sí, cambiar a Real', en: 'Yes, switch to Real' },
  'realMode.cancel': { es: 'Quedarme en Demo', en: 'Stay in Demo' },

  // ───────── PWA Install ─────────
  'pwa.title': { es: 'Instalar SORTYAPP', en: 'Install SORTYAPP' },
  'pwa.description': {
    es: 'Instala la app en tu dispositivo para acceso rápido.',
    en: 'Install the app on your device for quick access.',
  },
  'pwa.install': { es: 'Instalar App', en: 'Install App' },
  'pwa.iosHint': {
    es: 'Toca el botón Compartir y luego "Agregar a pantalla de inicio" para instalar.',
    en: 'Tap the Share button and then "Add to Home Screen" to install.',
  },

  // ───────── Common ─────────
  'common.demo': { es: 'Demo', en: 'Demo' },
  'common.real': { es: 'Real', en: 'Real' },
  'common.loading': { es: 'Cargando...', en: 'Loading...' },
  'common.yes': { es: 'Sí', en: 'Yes' },
  'common.no': { es: 'No', en: 'No' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  const entry = translations[key];
  return entry?.[locale] ?? key;
}
