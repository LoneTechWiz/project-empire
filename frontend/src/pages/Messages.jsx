import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function Messages() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const composeId = params.get('compose')
  const composeName = params.get('name')
  const [tab, setTab] = useState(composeId ? 'compose' : 'conversations')
  const [form, setForm] = useState({ receiverId: composeId || '', subject: '', content: '' })
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.get('/messages').then(r => r.data.data),
  })

  const send = useMutation({
    mutationFn: body => api.post('/messages', body),
    onSuccess: res => {
      qc.invalidateQueries({ queryKey: ['messages'] })
      setForm({ receiverId: '', subject: '', content: '' })
      navigate(`/messages/${res.data.data.conversationId}`)
    },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  const receiverId = parseInt(form.receiverId)
  const { data: recipientData } = useQuery({
    queryKey: ['nation', receiverId],
    queryFn: () => api.get(`/nations/${receiverId}`).then(r => r.data.data),
    enabled: !!receiverId && receiverId > 0,
    retry: false,
  })
  const recipientNation = recipientData?.nation || recipientData
  const recipientName = receiverId > 0 ? recipientNation?.leaderName : null

  if (isLoading) return <div className="loading">Loading…</div>

  const conversations = data?.conversations || []

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 16 }}>Messages</h1>
      <div className="tab-bar">
        <div className={`tab ${tab === 'conversations' ? 'active' : ''}`} onClick={() => setTab('conversations')}>
          Conversations {data?.unread > 0 && <span className="badge badge-yellow" style={{ marginLeft: 4 }}>{data.unread}</span>}
        </div>
        <div className={`tab ${tab === 'compose' ? 'active' : ''}`} onClick={() => setTab('compose')}>Compose</div>
      </div>

      {tab === 'conversations' && (
        <div className="card">
          {conversations.length === 0
            ? <div style={{ color: 'var(--text2)', fontSize: 13 }}>No messages.</div>
            : (
              <table>
                <thead>
                  <tr><th>With</th><th>Subject</th><th>Messages</th><th>Latest</th></tr>
                </thead>
                <tbody>
                  {conversations.map(conv => (
                    <tr key={conv.conversationId} style={{ opacity: conv.unread === 0 ? 0.7 : 1 }}>
                      <td><Link to={`/nations/${conv.otherParty?.id}`}>{conv.otherParty?.leaderName || conv.otherParty?.name}</Link></td>
                      <td style={{ fontWeight: conv.unread > 0 ? 700 : 400 }}>
                        <Link to={`/messages/${conv.conversationId}`} style={{ color: 'inherit' }}>
                          {conv.subject || '(no subject)'}
                        </Link>
                        {conv.unread > 0 && <span className="badge badge-blue" style={{ marginLeft: 8 }}>{conv.unread} new</span>}
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: 12 }}>{conv.messageCount}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 12 }}>{new Date(conv.latestMessage?.sentAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}

      {tab === 'compose' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>
            {recipientNation
              ? `Message to ${recipientNation.leaderName} of ${recipientNation.name}`
              : composeName ? `Message to ${composeName}` : 'New Message'}
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Recipient Nation ID</label>
            <input type="number" value={form.receiverId} onChange={e => setForm(f => ({ ...f, receiverId: e.target.value }))} required />
            {form.receiverId && (
              <div style={{ marginTop: 4, fontSize: 12 }}>
                {recipientName
                  ? <span style={{ color: 'var(--green)' }}>{recipientName}</span>
                  : receiverId > 0 ? <span style={{ color: 'var(--text2)' }}>Looking up…</span> : null}
              </div>
            )}
          </div>
          <div className="form-group"><label>Subject</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div className="form-group"><label>Message</label>
            <textarea rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
          </div>
          <button className="btn" onClick={() => { setError(''); send.mutate(form) }} disabled={send.isPending || !form.receiverId || !form.content}>
            {send.isPending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      )}
    </div>
  )
}
