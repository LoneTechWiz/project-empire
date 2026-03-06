import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function MessageDetail() {
  const { id } = useParams()
  const { nation } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['message', id],
    queryFn: () => api.get(`/messages/${id}`).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  })

  const sendReply = useMutation({
    mutationFn: () => api.post('/messages', {
      receiverId: data.otherParty.id,
      subject: data.subject,
      content: reply,
      conversationId: data.conversationId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message', id] })
      qc.invalidateQueries({ queryKey: ['messages'] })
      setReply('')
    },
    onError: err => setError(err.response?.data?.message || 'Failed.'),
  })

  const del = useMutation({
    mutationFn: () => api.post(`/messages/${id}/delete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); navigate('/messages') }
  })

  if (isLoading) return <div className="loading">Loading…</div>
  if (!data) return <div className="page">Conversation not found.</div>

  const myNationId = nation?.id

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 8 }}><Link to="/messages" style={{ color: 'var(--text2)', fontSize: 13 }}>← Messages</Link></div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{data.subject || '(no subject)'}</h2>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            Conversation with <Link to={`/nations/${data.otherParty?.id}`}>{data.otherParty?.leaderName || data.otherParty?.name}</Link>
            {' '}· {data.messages?.length} message{data.messages?.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={() => del.mutate()} disabled={del.isPending}>Delete Conversation</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {data.messages?.map(m => {
          const isMine = m.sender?.id === myNationId
          return (
            <div key={m.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isMine ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                background: isMine ? 'var(--accent)' : 'var(--surface2)',
                color: isMine ? '#fff' : 'var(--text)',
                borderRadius: 10,
                borderBottomRightRadius: isMine ? 2 : 10,
                borderBottomLeftRadius: isMine ? 10 : 2,
                padding: '10px 14px',
                maxWidth: '80%',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
                {isMine ? 'You' : (m.sender?.leaderName || m.sender?.name)} · {new Date(m.sentAt).toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}
        <textarea
          rows={4}
          value={reply}
          onChange={e => setReply(e.target.value)}
          placeholder="Write a reply…"
          style={{ marginBottom: 10 }}
        />
        <button className="btn" onClick={() => { setError(''); sendReply.mutate() }} disabled={sendReply.isPending || !reply.trim()}>
          {sendReply.isPending ? 'Sending…' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}
