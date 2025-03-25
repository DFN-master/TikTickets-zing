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
const MIN_NODE_DISTANCE = 30 // Reduzido para aproximar mais os nós
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
    k = Math.sqrt(CANVAS_WIDTH * CANVAS_HEIGHT / mNodeList.length) * 1.2 // Reduzido um pouco
  }

  // Gera coordenadas iniciais aleatórias
  let initialX, initialY
  const initialSize = 65.0 // Reduzido para menor dispersão inicial
  for (const i in mNodeList) {
    initialX = CANVAS_WIDTH * 0.5
    initialY = CANVAS_HEIGHT * 0.5
    mNodeList[i].x = initialX + initialSize * (Math.random() - 0.5) * 4
    mNodeList[i].y = initialY + initialSize * (Math.random() - 0.5) * 4
  }

  // Itera para encontrar posições estáveis
  for (let i = 0; i < 250; i++) {
    calculateRepulsive()
    calculateTraction()
    updateCoordinates()
  }
}

/**
 * Garante que todos os nós fiquem dentro dos limites do container
 */
function ensureNodesWithinBounds() {
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
  const levelHeight = 180 // Ligeiramente reduzido para aproximar os níveis
  const nodeWidth = 200 // Ligeiramente reduzido para aproximar os nós horizontalmente

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
          y: 100 + level * levelHeight // Ajustado para começar mais abaixo
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
  const levelHeight = 180 // Ligeiramente reduzido
  const nodeSpacing = 200 // Ligeiramente reduzido

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
    mNodeList[i].y = 100 + level * levelHeight // Ajustado para começar mais abaixo
  }
}

/**
 * Layout circular - organiza os nós em círculo
 */
function circleLayout () {
  const nodeCount = mNodeList.length
  if (nodeCount === 0) return

  // Raio do círculo - ajustado para garantir que caiba no container
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35 * Math.max(1, Math.sqrt(nodeCount) / 5)
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
  let ejectFactor = 7 // Reduzido para menor repulsão
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
      if (dist < 40) { // Reduzido para detectar proximidade menor
        ejectFactor = 6
      }
      if (dist > 0 && dist < 300) { // Reduzido para menor alcance
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
  const maxt = 5, maxty = 4 // Ligeiramente reduzidos
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
