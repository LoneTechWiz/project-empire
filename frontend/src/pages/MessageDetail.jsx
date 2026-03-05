import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function MessageDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['message', id],
    queryFn: () => api.get(`/messages/${id}`).then(r => r.data.data),
  })

  const del = useMutation({
    mutationFn: () => api.post(`/messages/${id}/delete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); navigate('/messages') }
  })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">Message not found.</div>

  const m = data

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 8 }}><Link to="/messages" style={{ color: 'var(--text2)', fontSize: 13 }}>← Messages</Link></div>
      <div className="card">
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{m.subject || '(no subject)'}</h2>
          <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text2)' }}>
            <span>From: <Link to={`/nations/${m.sender?.id}`}>{m.sender?.name}</Link></span>
            <span>To: <Link to={`/nations/${m.receiver?.id}`}>{m.receiver?.name}</Link></span>
            <span>{new Date(m.sentAt).toLocaleString()}</span>
          </div>
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14 }}>{m.content}</div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <Link to={`/messages?compose=${m.sender?.id}&name=${encodeURIComponent(m.sender?.name || '')}`} className="btn btn-sm">Reply</Link>
          <button className="btn btn-danger btn-sm" onClick={() => del.mutate()} disabled={del.isPending}>Delete</button>
        </div>
      </div>
    </div>
  )
}
