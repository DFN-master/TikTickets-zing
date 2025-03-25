/**
 * Baseado em https://github.com/chaangliu/ForceDirectedLayout/blob/master/javascript/force-directed.js
 * Algoritmos de layout para organização de nós em um grafo.
 */
const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 1000
let k
let mNodeList = []
let mEdgeList = []
let mDxMap = {}
let mDyMap = {}
let mNodeMap = {}

// Tamanho padrão de um nó para cálculos de sobreposição
const NODE_WIDTH = 170
const NODE_HEIGHT = 80
const MIN_NODE_DISTANCE = 50 // Reduzido para aproximar mais os nós
const SAFETY_MARGIN = 80 // Margem de segurança para manter os nós dentro do container

export function ForceDirected (data = {}, layout = 'force') {
  // Limpa as variáveis
  k = 0
  mNodeList = []
  mEdgeList = []
  mDxMap = {}
  mDyMap = {}
  mNodeMap = {}

  // Prepara os dados
  const nodeList = data.nodeList
  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i]
    mNodeList.push(node)
  }

  // Converte linhas para arestas
  const lineList = data.lineList
  for (let i = 0; i < lineList.length; i++) {
    const line = lineList[i]
    const edge = new Edge(line.from, line.to)
    mEdgeList.push(edge)
  }

  // Cria o mapa de nós para pesquisa rápida
  for (let i = 0; i < mNodeList.length; i++) {
    const node = mNodeList[i]
    if (node) {
      mNodeMap[node.id] = node
    }
  }

  // Aplica o layout escolhido
  switch (layout) {
    case 'tree':
      treeLayout()
      break
    case 'level':
      levelLayout()
      break
    case 'circle':
      circleLayout()
      break
    case 'grid':
      gridLayout()
      break
    case 'hubRadial':
      hubRadialLayout()
      break
    case 'force':
    default:
      forceLayout()
      break
  }

  // Verifica e resolve sobreposições
  resolveOverlaps()

  // Garante que nenhum nó fique fora dos limites do container
  ensureNodesWithinBounds()

  // Adiciona 'px' às coordenadas
  for (let i = 0; i < mNodeList.length; i++) {
    const node = mNodeList[i]
    node.left = Math.round(node.x) + 'px'
    node.top = Math.round(node.y) + 'px'
    node.x = undefined
    node.y = undefined
  }

  data.nodeList = mNodeList
  return data
}

/**
 * Verifica e resolve sobreposições entre os nós
 */
function resolveOverlaps () {
  const iterations = 50
  let moved = true
  let iteration = 0

  while (moved && iteration < iterations) {
    moved = false
    iteration++

    for (let i = 0; i < mNodeList.length; i++) {
      const nodeA = mNodeList[i]
      let dx = 0
      let dy = 0

      for (let j = 0; j < mNodeList.length; j++) {
        if (i === j) continue

        const nodeB = mNodeList[j]
        const overlapX = (NODE_WIDTH + MIN_NODE_DISTANCE) - Math.abs(nodeA.x - nodeB.x)
        const overlapY = (NODE_HEIGHT + MIN_NODE_DISTANCE) - Math.abs(nodeA.y - nodeB.y)

        // Se há sobreposição em ambas as direções
        if (overlapX > 0 && overlapY > 0) {
          moved = true

          // Cálculo da direção de repulsão
          const dirX = nodeA.x < nodeB.x ? -1 : 1
          const dirY = nodeA.y < nodeB.y ? -1 : 1

          // Move mais na direção onde a sobreposição é menor
          if (overlapX < overlapY) {
            dx += dirX * (overlapX / 2 + 5)
          } else {
            dy += dirY * (overlapY / 2 + 5)
          }
        }
      }

      // Aplica o movimento calculado
      if (dx !== 0 || dy !== 0) {
        nodeA.x += dx
        nodeA.y += dy
      }
    }
  }
}

/**
 * Layout baseado em força dirigida (o original)
 */
function forceLayout () {
  if (mNodeList && mEdgeList) {
    k = Math.sqrt(CANVAS_WIDTH * CANVAS_HEIGHT / mNodeList.length) * 1.5 // Aumentado para mais espaço
  }

  // Gera coordenadas iniciais aleatórias
  let initialX, initialY
  const initialSize = 80.0 // Aumentado para maior dispersão inicial
  for (const i in mNodeList) {
    initialX = CANVAS_WIDTH * 0.5
    initialY = CANVAS_HEIGHT * 0.5
    mNodeList[i].x = initialX + initialSize * (Math.random() - 0.5) * 5
    mNodeList[i].y = initialY + initialSize * (Math.random() - 0.5) * 5
  }

  // Itera 300 vezes para encontrar posições estáveis (aumentado para melhor convergência)
  for (let i = 0; i < 300; i++) {
    calculateRepulsive()
    calculateTraction()
    updateCoordinates()
  }
}

/**
 * Garante que todos os nós fiquem dentro dos limites do container
 */
function ensureNodesWithinBounds () {
  // Encontra os valores mínimos e máximos atuais de x e y
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (let i = 0; i < mNodeList.length; i++) {
    const node = mNodeList[i]
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x)
    maxY = Math.max(maxY, node.y)
  }

  // Calcula quanto precisa deslocar para todos ficarem visíveis
  const offsetX = minX < SAFETY_MARGIN ? SAFETY_MARGIN - minX : 0
  const offsetY = minY < SAFETY_MARGIN ? SAFETY_MARGIN - minY : 0

  // Verifica se está excedendo limites à direita/abaixo
  const rightLimit = CANVAS_WIDTH - SAFETY_MARGIN
  const bottomLimit = CANVAS_HEIGHT - SAFETY_MARGIN
  const scaleX = maxX + offsetX > rightLimit ? (rightLimit - SAFETY_MARGIN) / (maxX + offsetX - SAFETY_MARGIN) : 1
  const scaleY = maxY + offsetY > bottomLimit ? (bottomLimit - SAFETY_MARGIN) / (maxY + offsetY - SAFETY_MARGIN) : 1

  // Aplica o menor fator de escala para manter a proporção
  const scale = Math.min(scaleX, scaleY, 1)

  // Ajusta todos os nós
  for (let i = 0; i < mNodeList.length; i++) {
    const node = mNodeList[i]

    // Primeiro adiciona offset para evitar corte na esquerda/acima
    node.x += offsetX
    node.y += offsetY

    // Depois aplica escala se necessário para evitar corte na direita/abaixo
    if (scale < 1) {
      const centerX = CANVAS_WIDTH / 2
      const centerY = CANVAS_HEIGHT / 2
      node.x = centerX + (node.x - centerX) * scale
      node.y = centerY + (node.y - centerY) * scale
    }
  }
}

/**
 * Layout em árvore - organiza os nós em estrutura hierárquica
 */
function treeLayout () {
  // Encontra o nó raiz (aquele que não tem arestas de entrada)
  const incomingEdges = {}

  // Inicializa contagem de arestas de entrada
  for (let i = 0; i < mNodeList.length; i++) {
    incomingEdges[mNodeList[i].id] = 0
  }

  // Conta arestas de entrada para cada nó
  for (let i = 0; i < mEdgeList.length; i++) {
    const edge = mEdgeList[i]
    incomingEdges[edge.target] = (incomingEdges[edge.target] || 0) + 1
  }

  // Encontra possíveis raízes (nós sem arestas de entrada)
  let roots = []
  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    if (incomingEdges[nodeId] === 0) {
      roots.push(nodeId)
    }
  }

  // Se não houver raiz clara, usa o primeiro nó
  if (roots.length === 0 && mNodeList.length > 0) {
    roots = [mNodeList[0].id]
  }

  // Largura e altura do layout
  const levelHeight = 200 // Aumentado para mais espaço vertical
  const nodeWidth = 230 // Aumentado para mais espaço horizontal

  // Mapa de níveis dos nós
  const nodeLevels = {}
  const children = {}

  // Inicializa estrutura de filhos
  for (let i = 0; i < mNodeList.length; i++) {
    children[mNodeList[i].id] = []
  }

  // Preenche a estrutura de filhos
  for (let i = 0; i < mEdgeList.length; i++) {
    const edge = mEdgeList[i]
    children[edge.source].push(edge.target)
  }

  // Atribui níveis aos nós usando BFS
  const queue = []
  for (let i = 0; i < roots.length; i++) {
    queue.push(roots[i])
    nodeLevels[roots[i]] = 0
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()
    const level = nodeLevels[nodeId]

    for (let i = 0; i < children[nodeId].length; i++) {
      const childId = children[nodeId][i]
      if (nodeLevels[childId] === undefined) {
        nodeLevels[childId] = level + 1
        queue.push(childId)
      }
    }
  }

  // Conta nós em cada nível
  const nodesPerLevel = {}
  for (const nodeId in nodeLevels) {
    const level = nodeLevels[nodeId]
    nodesPerLevel[level] = (nodesPerLevel[level] || 0) + 1
  }

  // Posiciona os nós
  const nodePositions = {}

  // Para cada nível, posiciona os nós horizontalmente
  for (let level = 0; level < Object.keys(nodesPerLevel).length; level++) {
    const nodesCount = nodesPerLevel[level] || 0
    const levelWidth = nodesCount * nodeWidth
    const startX = (CANVAS_WIDTH - levelWidth) / 2 + nodeWidth / 2

    let nodeIndex = 0
    for (let i = 0; i < mNodeList.length; i++) {
      const nodeId = mNodeList[i].id
      if (nodeLevels[nodeId] === level) {
        nodePositions[nodeId] = {
          x: startX + nodeIndex * nodeWidth,
          y: 80 + level * levelHeight // Ajustado para começar mais abaixo
        }
        nodeIndex++
      }
    }
  }

  // Atribui posições aos nós
  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    const position = nodePositions[nodeId]

    if (position) {
      mNodeList[i].x = position.x
      mNodeList[i].y = position.y
    } else {
      // Posição padrão para nós sem posição definida
      mNodeList[i].x = CANVAS_WIDTH / 2
      mNodeList[i].y = CANVAS_HEIGHT / 2 + i * 70
    }
  }
}

/**
 * Layout em níveis - organiza os nós em níveis horizontais
 */
function levelLayout () {
  // Análise topológica para encontrar níveis
  const incomingEdges = {}

  // Inicializa contagem de arestas de entrada
  for (let i = 0; i < mNodeList.length; i++) {
    incomingEdges[mNodeList[i].id] = 0
  }

  // Conta arestas de entrada para cada nó
  for (let i = 0; i < mEdgeList.length; i++) {
    const edge = mEdgeList[i]
    incomingEdges[edge.target] = (incomingEdges[edge.target] || 0) + 1
  }

  // Ordenação topológica para determinar níveis
  const nodeLevels = {}
  let currentLevel = 0
  let nodesInCurrentLevel = []

  // Encontra nós sem arestas de entrada para o primeiro nível
  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    if (incomingEdges[nodeId] === 0) {
      nodeLevels[nodeId] = currentLevel
      nodesInCurrentLevel.push(nodeId)
    }
  }

  // Se não houver nós no primeiro nível, coloca o primeiro nó
  if (nodesInCurrentLevel.length === 0 && mNodeList.length > 0) {
    nodeLevels[mNodeList[0].id] = currentLevel
    nodesInCurrentLevel.push(mNodeList[0].id)
  }

  // Mapeia conexões de saída
  const outgoingConnections = {}
  for (let i = 0; i < mNodeList.length; i++) {
    outgoingConnections[mNodeList[i].id] = []
  }

  for (let i = 0; i < mEdgeList.length; i++) {
    const edge = mEdgeList[i]
    outgoingConnections[edge.source].push(edge.target)
  }

  // Processa cada nível
  while (nodesInCurrentLevel.length > 0) {
    currentLevel++
    const nextLevelNodes = []

    // Para cada nó no nível atual
    for (let i = 0; i < nodesInCurrentLevel.length; i++) {
      const nodeId = nodesInCurrentLevel[i]

      // Para cada conexão de saída deste nó
      for (let j = 0; j < outgoingConnections[nodeId].length; j++) {
        const targetNodeId = outgoingConnections[nodeId][j]

        // Decrementa a contagem de arestas de entrada
        incomingEdges[targetNodeId]--

        // Se todas as arestas de entrada foram processadas, adiciona ao próximo nível
        if (incomingEdges[targetNodeId] === 0) {
          nodeLevels[targetNodeId] = currentLevel
          nextLevelNodes.push(targetNodeId)
        }
      }
    }

    nodesInCurrentLevel = nextLevelNodes
  }

  // Verifica nós que não foram atribuídos a níveis (devido a ciclos)
  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    if (nodeLevels[nodeId] === undefined) {
      // Atribui ao nível máximo + 1
      let maxLevel = 0
      for (const id in nodeLevels) {
        maxLevel = Math.max(maxLevel, nodeLevels[id])
      }
      nodeLevels[nodeId] = maxLevel + 1
    }
  }

  // Conta o número de nós em cada nível
  const nodesPerLevel = {}
  for (const nodeId in nodeLevels) {
    const level = nodeLevels[nodeId]
    nodesPerLevel[level] = (nodesPerLevel[level] || 0) + 1
  }

  // Dimensões
  const levelHeight = 200 // Aumentado para mais espaço vertical
  const nodeSpacing = 230 // Aumentado para mais espaço horizontal

  // Posiciona os nós
  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    const level = nodeLevels[nodeId]
    const nodesInLevel = nodesPerLevel[level]

    // Encontra o índice deste nó no seu nível
    let indexInLevel = 0
    for (let j = 0; j < mNodeList.length; j++) {
      if (j !== i && nodeLevels[mNodeList[j].id] === level && mNodeList[j].id < nodeId) {
        indexInLevel++
      }
    }

    // Calcula a posição horizontal
    const levelWidth = nodesInLevel * nodeSpacing
    const startX = (CANVAS_WIDTH - levelWidth) / 2 + nodeSpacing / 2

    mNodeList[i].x = startX + indexInLevel * nodeSpacing
    mNodeList[i].y = 80 + level * levelHeight // Ajustado para começar mais abaixo
  }
}

/**
 * Layout circular - organiza os nós em círculo
 */
function circleLayout () {
  const nodeCount = mNodeList.length
  if (nodeCount === 0) return

  // Raio do círculo - maior para mais espaço entre nós
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.4 * Math.max(1, Math.sqrt(nodeCount) / 4)
  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2

  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * 2 * Math.PI
    mNodeList[i].x = centerX + radius * Math.cos(angle)
    mNodeList[i].y = centerY + radius * Math.sin(angle)
  }
}

/**
 * Layout em grade - organiza os nós em uma grade uniforme
 */
function gridLayout () {
  const nodeCount = mNodeList.length
  if (nodeCount === 0) return

  // Calcula o número de colunas e linhas para distribuição uniforme
  const cols = Math.ceil(Math.sqrt(nodeCount))
  const rows = Math.ceil(nodeCount / cols)

  const marginX = 150 // Aumentado para garantir visibilidade nas bordas
  const marginY = 150
  const cellWidth = (CANVAS_WIDTH - 2 * marginX) / Math.max(1, cols - 1) * 1.1 // 10% mais espaço
  const cellHeight = (CANVAS_HEIGHT - 2 * marginY) / Math.max(1, rows - 1) * 1.1

  for (let i = 0; i < nodeCount; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols

    mNodeList[i].x = marginX + col * cellWidth
    mNodeList[i].y = marginY + row * cellHeight
  }
}

/**
 * Layout Hub Radial - combina o conceito de hub central com distribuição radial para fluxos complexos
 */
function hubRadialLayout () {
  // Análise de conectividade e centralidade dos nós
  const connections = {}
  const outgoing = {}
  const incoming = {}

  // Inicializa contadores
  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    connections[nodeId] = 0
    outgoing[nodeId] = 0
    incoming[nodeId] = 0
  }

  // Conta conexões
  for (let i = 0; i < mEdgeList.length; i++) {
    const edge = mEdgeList[i]
    connections[edge.source]++
    connections[edge.target]++
    outgoing[edge.source]++
    incoming[edge.target]++
  }

  // Encontra o nó central (com mais conexões ou primeiro nó sem entrada)
  let centralNodeId = null
  let maxConnections = -1

  // Primeiro tenta encontrar o nó com mais conexões
  for (const nodeId in connections) {
    if (connections[nodeId] > maxConnections) {
      maxConnections = connections[nodeId]
      centralNodeId = nodeId
    }
  }

  // Se não conseguiu, procura por nós sem entrada (possíveis pontos de início)
  if (!centralNodeId && mNodeList.length > 0) {
    for (const nodeId in incoming) {
      if (incoming[nodeId] === 0) {
        centralNodeId = nodeId
        break
      }
    }
  }

  // Se ainda não conseguiu, usa o primeiro nó
  if (!centralNodeId && mNodeList.length > 0) {
    centralNodeId = mNodeList[0].id
  }

  // Mapeamento de níveis a partir do nó central usando BFS
  const levels = {}
  const visited = {}
  const children = {}
  const sectors = {}

  // Inicializa estruturas
  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    children[nodeId] = []
    visited[nodeId] = false
  }

  // Prepara a estrutura de filhos (para ambas as direções)
  for (let i = 0; i < mEdgeList.length; i++) {
    const edge = mEdgeList[i]
    children[edge.source].push(edge.target)
  }

  // BFS para atribuir níveis
  const queue = [centralNodeId]
  levels[centralNodeId] = 0
  visited[centralNodeId] = true

  while (queue.length > 0) {
    const nodeId = queue.shift()
    const level = levels[nodeId]

    for (let i = 0; i < children[nodeId].length; i++) {
      const childId = children[nodeId][i]
      if (!visited[childId]) {
        visited[childId] = true
        levels[childId] = level + 1
        queue.push(childId)
      }
    }
  }

  // Atribui nós não visitados a níveis maiores
  let maxLevel = 0
  for (const nodeId in levels) {
    maxLevel = Math.max(maxLevel, levels[nodeId])
  }

  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    if (!visited[nodeId]) {
      levels[nodeId] = maxLevel + 1
    }
  }

  // Agrupa nós por nível
  const nodesByLevel = {}
  for (let i = 0; i <= maxLevel + 1; i++) {
    nodesByLevel[i] = []
  }

  for (let i = 0; i < mNodeList.length; i++) {
    const nodeId = mNodeList[i].id
    const level = levels[nodeId] || 0
    nodesByLevel[level].push(nodeId)
  }

  // Distribui os nós em anéis concêntricos
  const centerX = CANVAS_WIDTH / 2
  const centerY = CANVAS_HEIGHT / 2
  const baseRadius = 220 // Raio inicial aumentado
  const radiusIncrement = 200 // Incremento de raio por nível ajustado

  // Posiciona o nó central
  for (let i = 0; i < mNodeList.length; i++) {
    if (mNodeList[i].id === centralNodeId) {
      mNodeList[i].x = centerX
      mNodeList[i].y = centerY

      // Destaca o nó central com estilo diferenciado (se supportado)
      if (mNodeList[i].style === undefined) {
        mNodeList[i].style = {}
      }

      // As propriedades style são aplicadas via CSS no componente node.vue
      mNodeList[i].style.backgroundColor = '#90CAF9'
      mNodeList[i].style.zIndex = '10'
      mNodeList[i].style.transform = 'scale(1.05)'
      break
    }
  }

  // Distribui grupos de nós em setores principais
  // Estratégia adaptativa para o layout:
  // 1. Para poucos nós no nível 1, usa distribuição circular completa
  // 2. Para muitos nós no nível 1, agrupa em setores lógicos

  const firstLevelNodes = nodesByLevel[1] || []

  if (firstLevelNodes.length <= 8) {
    // Distribuição em círculo completo para poucos nós
    const sectorAngle = (2 * Math.PI) / Math.max(firstLevelNodes.length, 1)

    for (let i = 0; i < firstLevelNodes.length; i++) {
      const nodeId = firstLevelNodes[i]
      const angle = i * sectorAngle
      const radius = baseRadius

      // Posição do hub secundário
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      // Atualiza a posição do nó
      for (let j = 0; j < mNodeList.length; j++) {
        if (mNodeList[j].id === nodeId) {
          mNodeList[j].x = x
          mNodeList[j].y = y

          // Armazena o ângulo do setor deste hub
          sectors[nodeId] = angle
          break
        }
      }
    }
  } else {
    // Distribuição em setores para muitos nós
    // Usa apenas a parte superior para melhor visualização (180 graus)
    const sectorAngle = Math.PI / Math.max(firstLevelNodes.length - 1, 1)

    for (let i = 0; i < firstLevelNodes.length; i++) {
      const nodeId = firstLevelNodes[i]
      // Distribui os nós em um semicírculo na parte superior (de -90° a 90°)
      const angle = (i * sectorAngle) - (Math.PI / 2)
      // Usa o mesmo raio base definido anteriormente

      // Posição do hub secundário
      const x = centerX + baseRadius * Math.cos(angle)
      const y = centerY + baseRadius * Math.sin(angle)

      // Atualiza a posição do nó
      for (let j = 0; j < mNodeList.length; j++) {
        if (mNodeList[j].id === nodeId) {
          mNodeList[j].x = x
          mNodeList[j].y = y

          // Armazena o ângulo do setor deste hub
          sectors[nodeId] = angle
          break
        }
      }
    }
  }

  // Distribui os nós dos níveis seguintes
  for (let level = 2; level <= maxLevel + 1; level++) {
    const currentLevelNodes = nodesByLevel[level] || []

    // Agrupa nós por seu "hub pai" (nó mais próximo no nível anterior)
    const nodesByParent = {}

    for (let i = 0; i < currentLevelNodes.length; i++) {
      const nodeId = currentLevelNodes[i]
      let parentId = null
      let minDistance = Infinity

      // Encontra o pai mais próximo no nível anterior
      const previousLevelNodes = nodesByLevel[level - 1] || []

      // Verifica conexões diretas primeiro
      let directParent = false
      for (let j = 0; j < mEdgeList.length; j++) {
        const edge = mEdgeList[j]
        if (edge.target === nodeId && levels[edge.source] === level - 1) {
          parentId = edge.source
          directParent = true
          break
        }
      }

      // Se não houver conexão direta, usa o hub mais próximo
      if (!directParent) {
        for (let j = 0; j < previousLevelNodes.length; j++) {
          const possibleParentId = previousLevelNodes[j]

          // Calcula "distância" com base em conectividade
          // Nós que compartilham conexões são considerados mais próximos
          let connectionDistance = 1000

          for (let k = 0; k < mEdgeList.length; k++) {
            const edge = mEdgeList[k]
            if ((edge.source === nodeId && edge.target === possibleParentId) ||
                (edge.target === nodeId && edge.source === possibleParentId)) {
              connectionDistance = 0 // Nós diretamente conectados
              break
            }
          }

          if (connectionDistance < minDistance) {
            minDistance = connectionDistance
            parentId = possibleParentId
          }
        }
      }

      // Se ainda não encontrou um pai, usa o primeiro hub do nível anterior
      if (!parentId && previousLevelNodes.length > 0) {
        parentId = previousLevelNodes[0]
      }

      // Agrupa por pai
      if (parentId) {
        if (!nodesByParent[parentId]) {
          nodesByParent[parentId] = []
        }
        nodesByParent[parentId].push(nodeId)
      }
    }

    // Distribui os nós agrupados por pai
    for (const parentId in nodesByParent) {
      const parentAngle = sectors[parentId] || 0
      const childNodes = nodesByParent[parentId]

      // Encontra a posição do pai
      let parentX = centerX
      let parentY = centerY

      for (let i = 0; i < mNodeList.length; i++) {
        if (mNodeList[i].id === parentId) {
          parentX = mNodeList[i].x
          parentY = mNodeList[i].y
          break
        }
      }

      // Calcula o raio relativo ao nó pai - ajustado para nós com muitos filhos
      const relativeRadius = Math.max(180, 120 + childNodes.length * 15)

      // Ajusta a distribuição angular baseada no número de filhos
      let angleSpread
      if (childNodes.length <= 3) {
        angleSpread = Math.PI / 6 // 30° para poucos filhos
      } else if (childNodes.length <= 6) {
        angleSpread = Math.PI / 4 // 45° para mais filhos
      } else {
        angleSpread = Math.PI / 3 // 60° para muitos filhos
      }

      const startAngle = parentAngle - angleSpread / 2
      const angleStep = childNodes.length > 1 ? angleSpread / (childNodes.length - 1) : 0

      for (let i = 0; i < childNodes.length; i++) {
        const nodeId = childNodes[i]
        let angle = startAngle + i * angleStep

        // Se tiver apenas um filho, coloca na mesma direção do pai
        if (childNodes.length === 1) {
          angle = parentAngle
        }

        const x = parentX + relativeRadius * Math.cos(angle)
        const y = parentY + relativeRadius * Math.sin(angle)

        // Atualiza a posição do nó
        for (let j = 0; j < mNodeList.length; j++) {
          if (mNodeList[j].id === nodeId) {
            mNodeList[j].x = x
            mNodeList[j].y = y
            sectors[nodeId] = angle
            break
          }
        }
      }
    }
  }

  // Aplica ajustes finais para evitar sobreposições
  // Primeiro verifica se há muitos nós e ajusta o layout conforme necessário
  if (mNodeList.length > 15) {
    // Para muitos nós, aumenta o espaçamento entre níveis
    for (let i = 0; i < mNodeList.length; i++) {
      const node = mNodeList[i]
      const level = levels[node.id] || 0

      if (level > 0) {
        // Calcula o ângulo em relação ao centro
        const angle = Math.atan2(node.y - centerY, node.x - centerX)
        // Ajusta o raio com base no nível e no número total de nós
        const newRadius = baseRadius + (level * radiusIncrement * (1 + (mNodeList.length / 50)))

        node.x = centerX + newRadius * Math.cos(angle)
        node.y = centerY + newRadius * Math.sin(angle)
      }
    }
  } else {
    // Para poucos nós, mantém o layout mais compacto
    for (let i = 0; i < mNodeList.length; i++) {
      const node = mNodeList[i]
      const level = levels[node.id] || 0

      if (level > 0) {
        // Calcula o ângulo em relação ao centro
        const angle = Math.atan2(node.y - centerY, node.x - centerX)
        const newRadius = baseRadius + level * radiusIncrement

        node.x = centerX + newRadius * Math.cos(angle)
        node.y = centerY + newRadius * Math.sin(angle)
      }
    }
  }

  // Resolve sobreposições entre nós do mesmo nível
  const iterations = 5
  for (let iter = 0; iter < iterations; iter++) {
    // Para cada nível
    for (let level = 1; level <= maxLevel + 1; level++) {
      const nodesInLevel = nodesByLevel[level] || []

      // Compara cada par de nós no mesmo nível
      for (let i = 0; i < nodesInLevel.length; i++) {
        const nodeAId = nodesInLevel[i]
        let nodeA = null

        // Encontra o objeto do nó A
        for (let k = 0; k < mNodeList.length; k++) {
          if (mNodeList[k].id === nodeAId) {
            nodeA = mNodeList[k]
            break
          }
        }

        if (!nodeA) continue

        for (let j = i + 1; j < nodesInLevel.length; j++) {
          const nodeBId = nodesInLevel[j]
          let nodeB = null

          // Encontra o objeto do nó B
          for (let k = 0; k < mNodeList.length; k++) {
            if (mNodeList[k].id === nodeBId) {
              nodeB = mNodeList[k]
              break
            }
          }

          if (!nodeB) continue

          // Calcula a distância entre os nós
          const dx = nodeB.x - nodeA.x
          const dy = nodeB.y - nodeA.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Se os nós estão muito próximos
          if (distance < NODE_WIDTH) {
            // Calcula ângulos para ambos os nós em relação ao centro
            const angleA = Math.atan2(nodeA.y - centerY, nodeA.x - centerX)
            const angleB = Math.atan2(nodeB.y - centerY, nodeB.x - centerX)

            // Ajusta ligeiramente os ângulos
            const newAngleA = angleA - 0.05
            const newAngleB = angleB + 0.05

            // Mantém o mesmo raio mas ajusta o ângulo
            const radius = Math.sqrt(
              Math.pow(nodeA.x - centerX, 2) +
              Math.pow(nodeA.y - centerY, 2)
            )

            // Aplica novos ângulos
            nodeA.x = centerX + radius * Math.cos(newAngleA)
            nodeA.y = centerY + radius * Math.sin(newAngleA)
            nodeB.x = centerX + radius * Math.cos(newAngleB)
            nodeB.y = centerY + radius * Math.sin(newAngleB)
          }
        }
      }
    }
  }
}

// eslint-disable-next-line no-unused-vars
function Node (id = null) {
  this.id = id
  this.x = 22
  this.y = null
}

function Edge (source = null, target = null) {
  this.source = source
  this.target = target
}

/**
 * Calcula duas repulsivas entre os nós.
 */
function calculateRepulsive () {
  let ejectFactor = 9 // Aumentado para maior força de repulsão
  let distX, distY, dist
  for (let i = 0; i < mNodeList.length; i++) {
    mDxMap[mNodeList[i].id] = 0.0
    mDyMap[mNodeList[i].id] = 0.0
    for (let j = 0; j < mNodeList.length; j++) {
      if (i !== j) {
        distX = mNodeList[i].x - mNodeList[j].x
        distY = mNodeList[i].y - mNodeList[j].y
        dist = Math.sqrt(distX * distX + distY * distY)
      }
      if (dist < 50) { // Aumentado para detectar proximidade maior
        ejectFactor = 8
      }
      if (dist > 0 && dist < 350) { // Aumentado para ter efeito em distâncias maiores
        const id = mNodeList[i].id
        mDxMap[id] = mDxMap[id] + distX / dist * k * k / dist * ejectFactor
        mDyMap[id] = mDyMap[id] + distY / dist * k * k / dist * ejectFactor
      }
    }
  }
}

/**
 * Calcula forças de atração nas arestas.
 */
function calculateTraction () {
  const condenseFactor = 2.5 // Ajustado para equilibrar
  let startNode, endNode
  for (let e = 0; e < mEdgeList.length; e++) {
    const eStartID = mEdgeList[e].source
    const eEndID = mEdgeList[e].target
    startNode = mNodeMap[eStartID]
    endNode = mNodeMap[eEndID]
    if (!startNode) {
      console.log('Cannot find start node id: ' + eStartID + ', please check it out.')
      return
    }
    if (!endNode) {
      console.log('Cannot find end node id: ' + eEndID + ', please check it out.')
      return
    }
    const distX = startNode.x - endNode.x
    const distY = startNode.y - endNode.y
    const dist = Math.sqrt(distX * distX + distY * distY)
    mDxMap[eStartID] = mDxMap[eStartID] - distX * dist / k * condenseFactor
    mDyMap[eStartID] = mDyMap[eStartID] - distY * dist / k * condenseFactor
    mDxMap[eEndID] = mDxMap[eEndID] + distX * dist / k * condenseFactor
    mDyMap[eEndID] = mDyMap[eEndID] + distY * dist / k * condenseFactor
  }
}

/**
 * Atualiza as coordenadas dos nós.
 */
function updateCoordinates () {
  const maxt = 6, maxty = 5 // Aumentados para permitir movimentos maiores
  for (let v = 0; v < mNodeList.length; v++) {
    const node = mNodeList[v]
    let dx = Math.floor(mDxMap[node.id])
    let dy = Math.floor(mDyMap[node.id])

    if (dx < -maxt) dx = -maxt
    if (dx > maxt) dx = maxt
    if (dy < -maxty) dy = -maxty
    if (dy > maxty) dy = maxty
    node.x = node.x + dx >= CANVAS_WIDTH || node.x + dx <= 0 ? node.x - dx : node.x + dx
    node.y = node.y + dy >= CANVAS_HEIGHT || node.y + dy <= 0 ? node.y - dy : node.y + dy
  }
}

// eslint-disable-next-line no-unused-vars
function Result (nodes = null, links = null) {
  this.nodes = nodes
  this.links = links
}
