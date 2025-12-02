'use client'

import { useMemo, useRef, useState } from 'react'

interface Linkage {
  id: string
  linkageType: string
  linkageStrength: string
  deal: {
    id: string
    provider: string
    buyer: string
    modality: string
    priceUsd: number | null
    date: string | null
  }
  model: {
    id: string
    modelId: string
    provider: string
    family: string | null
    tokensEstMid: number | null
  }
}

interface NetworkGraphProps {
  linkages: Linkage[]
  width?: number
  height?: number
}

interface Node {
  id: string
  label: string
  type: 'provider' | 'buyer' | 'model'
  x: number
  y: number
  size: number
  links: number
}

interface Edge {
  from: string
  to: string
  strength: number
  linkageType: string
}

export default function NetworkGraph({ linkages, width = 1200, height = 800 }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Build network graph data
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Node>()
    const edgeList: Edge[] = []
    const nodeConnections = new Map<string, Set<string>>()

    linkages.forEach(linkage => {
      if (!linkage.deal || !linkage.model) return

      const providerId = `provider:${linkage.deal.provider}`
      const buyerId = `buyer:${linkage.deal.buyer}`
      const modelId = `model:${linkage.model.modelId}`

      // Create or update provider node
      if (!nodeMap.has(providerId)) {
        nodeMap.set(providerId, {
          id: providerId,
          label: linkage.deal.provider,
          type: 'provider',
          x: 0,
          y: 0,
          size: 0,
          links: 0
        })
      }
      const provider = nodeMap.get(providerId)!
      provider.links++

      // Create or update buyer node
      if (!nodeMap.has(buyerId)) {
        nodeMap.set(buyerId, {
          id: buyerId,
          label: linkage.deal.buyer,
          type: 'buyer',
          x: 0,
          y: 0,
          size: 0,
          links: 0
        })
      }
      const buyer = nodeMap.get(buyerId)!
      buyer.links++

      // Create or update model node (group by family if available)
      const modelLabel = linkage.model.family || linkage.model.modelId
      const modelKey = `model:${linkage.model.provider}:${modelLabel}`
      if (!nodeMap.has(modelKey)) {
        nodeMap.set(modelKey, {
          id: modelKey,
          label: modelLabel,
          type: 'model',
          x: 0,
          y: 0,
          size: 0,
          links: 0
        })
      }
      const model = nodeMap.get(modelKey)!
      model.links++

      // Track connections
      if (!nodeConnections.has(providerId)) nodeConnections.set(providerId, new Set())
      if (!nodeConnections.has(buyerId)) nodeConnections.set(buyerId, new Set())
      if (!nodeConnections.has(modelKey)) nodeConnections.set(modelKey, new Set())

      nodeConnections.get(providerId)!.add(buyerId)
      nodeConnections.get(buyerId)!.add(modelKey)

      // Add edges
      edgeList.push({
        from: providerId,
        to: buyerId,
        strength: linkage.linkageStrength === 'high' ? 3 : linkage.linkageStrength === 'medium' ? 2 : 1,
        linkageType: linkage.linkageType
      })
      edgeList.push({
        from: buyerId,
        to: modelKey,
        strength: linkage.linkageStrength === 'high' ? 3 : linkage.linkageStrength === 'medium' ? 2 : 1,
        linkageType: linkage.linkageType
      })
    })

    // Calculate node sizes based on connections
    nodeMap.forEach(node => {
      const connections = nodeConnections.get(node.id)?.size || 0
      node.size = Math.max(20, Math.min(60, 20 + connections * 3))
    })

    // Simple force-directed layout
    const nodesArray = Array.from(nodeMap.values())
    const centerX = width / 2
    const centerY = height / 2

    // Position nodes in layers (hierarchical layout)
    const providers = nodesArray.filter(n => n.type === 'provider')
    const buyers = nodesArray.filter(n => n.type === 'buyer')
    const models = nodesArray.filter(n => n.type === 'model')

    // Left layer: providers (vertical distribution)
    const providerSpacing = Math.min(400, height / Math.max(1, providers.length))
    providers.forEach((node, i) => {
      node.x = centerX - 350
      node.y = 100 + (i * providerSpacing)
      if (providers.length === 1) node.y = centerY
    })

    // Middle layer: buyers (vertical distribution)
    const buyerSpacing = Math.min(400, height / Math.max(1, buyers.length))
    buyers.forEach((node, i) => {
      node.x = centerX
      node.y = 100 + (i * buyerSpacing)
      if (buyers.length === 1) node.y = centerY
    })

    // Right layer: models (vertical distribution, grouped by provider)
    const modelGroups = new Map<string, typeof models>()
    models.forEach(model => {
      const provider = model.label.split(':')[1] || 'Other'
      if (!modelGroups.has(provider)) {
        modelGroups.set(provider, [])
      }
      modelGroups.get(provider)!.push(model)
    })

    let modelY = 100
    modelGroups.forEach((groupModels, provider) => {
      const groupSpacing = Math.min(80, height / Math.max(1, models.length))
      groupModels.forEach((node, i) => {
        node.x = centerX + 350
        node.y = modelY + (i * groupSpacing)
      })
      modelY += groupModels.length * groupSpacing + 40
    })

    return { nodes: nodesArray, edges: edgeList }
  }, [linkages, width, height])

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'provider': return '#8B5CF6' // Purple
      case 'buyer': return '#3B82F6'    // Blue
      case 'model': return '#10B981'     // Green
      default: return '#6B7280'
    }
  }

  const visibleEdges = useMemo(() => {
    if (!selectedNode && !hoveredNode) return edges
    const activeNode = selectedNode || hoveredNode
    return edges.filter(e => e.from === activeNode || e.to === activeNode)
  }, [edges, selectedNode, hoveredNode])

  const visibleNodes = useMemo(() => {
    if (!selectedNode && !hoveredNode) return nodes
    const activeNode = selectedNode || hoveredNode
    const connectedIds = new Set([activeNode])
    visibleEdges.forEach(e => {
      connectedIds.add(e.from)
      connectedIds.add(e.to)
    })
    return nodes.filter(n => connectedIds.has(n.id))
  }, [nodes, visibleEdges, selectedNode, hoveredNode])

  return (
    <div className="card overflow-hidden p-0">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Network Graph</h3>
            <p className="text-sm text-text-muted">
              Interactive visualization of data flows: Providers → Buyers → Models
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-text-muted">Providers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-text-muted">Buyers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-text-muted">Models</span>
            </div>
          </div>
        </div>
      </div>
      <div className="relative bg-surface" style={{ width: '100%', height, overflow: 'auto' }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="cursor-pointer"
          style={{ minWidth: width, minHeight: height }}
        >
          {/* Edges */}
          {visibleEdges.map((edge, i) => {
            const fromNode = nodes.find(n => n.id === edge.from)
            const toNode = nodes.find(n => n.id === edge.to)
            if (!fromNode || !toNode) return null

            const opacity = (selectedNode || hoveredNode) ? 
              (edge.from === selectedNode || edge.to === selectedNode || 
               edge.from === hoveredNode || edge.to === hoveredNode ? 0.6 : 0.1) : 0.3

            return (
              <line
                key={`edge-${i}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="#6B7280"
                strokeWidth={edge.strength}
                opacity={opacity}
                strokeDasharray={edge.linkageType === 'temporal_overlap' ? '5,5' : '0'}
              />
            )
          })}

          {/* Nodes */}
          {visibleNodes.map(node => {
            const isActive = node.id === selectedNode || node.id === hoveredNode
            const opacity = (selectedNode || hoveredNode) ? 
              (isActive || visibleEdges.some(e => e.from === node.id || e.to === node.id) ? 1 : 0.3) : 1

            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size}
                  fill={getNodeColor(node.type)}
                  opacity={opacity}
                  stroke={isActive ? '#F59E0B' : 'transparent'}
                  strokeWidth={isActive ? 3 : 0}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                />
                <text
                  x={node.x}
                  y={node.y + node.size + 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#374151"
                  opacity={opacity}
                  className="pointer-events-none select-none"
                >
                  {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
                </text>
              </g>
            )
          })}
        </svg>
        {selectedNode && (
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-4 right-4 btn-secondary text-xs"
          >
            Clear Selection
          </button>
        )}
      </div>
    </div>
  )
}

