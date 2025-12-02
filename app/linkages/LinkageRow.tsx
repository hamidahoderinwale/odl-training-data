'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/utils/utils'

interface Linkage {
  id: string
  linkageType: string
  linkageStrength: string
  impactInference: string | null
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

interface LinkageRowProps {
  linkage: Linkage
  indent?: boolean
}

function formatTokens(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1e15) return `${(value / 1e15).toFixed(1)}P`
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  return `${(value / 1e6).toFixed(0)}M`
}

export default function LinkageRow({ linkage, indent = false }: LinkageRowProps) {
  return (
    <tr className={`transition-colors border-b border-border-subtle last:border-0 hover:bg-[rgba(232,225,217,0.3)] ${indent ? 'pl-6' : ''}`}>
      <td className={indent ? 'pl-6' : ''}>
        <Link
          href={`/deals/${linkage.deal.id}`}
          className="font-medium text-accent hover:text-accent-hover"
        >
          {linkage.deal.provider} → {linkage.deal.buyer}
        </Link>
        <div className="text-xs text-text-muted mt-0.5">
          {linkage.deal.modality} • {linkage.deal.date ? formatDate(linkage.deal.date) : '—'}
        </div>
      </td>
      <td>
        <Link
          href={`/models/${linkage.model.id}`}
          className="font-medium text-accent hover:text-accent-hover"
        >
          {linkage.model.modelId}
        </Link>
        {linkage.model.family && (
          <div className="text-xs text-text-muted mt-0.5">
            {linkage.model.family} • {linkage.model.provider}
          </div>
        )}
        {linkage.model.tokensEstMid && (
          <div className="text-xs text-text-muted mt-0.5">
            {formatTokens(linkage.model.tokensEstMid)} tokens
          </div>
        )}
      </td>
      <td>
        <div className="flex flex-col gap-1">
          <span className="badge badge-secondary text-xs">
            {linkage.linkageType === 'temporal_overlap' ? 'Same Time Period' : 
             linkage.linkageType === 'inferred' ? 'Same Company' : 
             linkage.linkageType || '—'}
          </span>
          <div className="text-xs text-text-muted/70">
            {linkage.linkageType === 'temporal_overlap' 
              ? 'Deal & model within 1 year'
              : linkage.linkageType === 'inferred'
              ? 'Buyer matches model provider'
              : ''}
          </div>
        </div>
      </td>
      <td>
        <span className={`badge ${
          linkage.linkageStrength === 'high' 
            ? 'badge-primary' 
            : 'badge-secondary'
        } text-xs`}>
          {linkage.linkageStrength === 'high' ? 'High' : 
           linkage.linkageStrength === 'medium' ? 'Medium' : 
           linkage.linkageStrength === 'low' ? 'Low' : 
           '—'}
        </span>
      </td>
      <td>
        <div className="text-sm text-text leading-relaxed">
          {linkage.impactInference || '—'}
        </div>
      </td>
    </tr>
  )
}

